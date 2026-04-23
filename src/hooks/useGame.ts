import { useState, useEffect, useCallback, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import { auth, db } from '../lib/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, increment } from 'firebase/firestore';
import { initTelegram, hapticFeedback } from '../lib/telegram';
import { UserData } from '../types/game';
import { INITIAL_ENERGY, ENERGY_REFILL_RATE, COINS_PER_TAP, LEVELS, REFERRAL_REWARD_REFERRER, REFERRAL_REWARD_REFEREE } from '../lib/constants';
import { useWeb3ModalAccount } from '@web3modal/ethers5/react';

export const useGame = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { address, isConnected } = useWeb3ModalAccount();

  // Initialize Telegram
  useEffect(() => {
    initTelegram();
    // Set a clean document title so it looks professional in the Telegram header
    document.title = 'SatoCryp';
  }, []);

  const tgData = {
    user: WebApp?.initDataUnsafe?.user,
    platform: WebApp?.platform || 'web',
    theme: WebApp?.colorScheme || 'light',
    startParam: WebApp?.initDataUnsafe?.start_param,
  };

  // Auth & Initial Data Fetch
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        const tgUser = WebApp?.initDataUnsafe?.user;
        const currentTgId = tgUser?.id;

        if (fbUser) {
          const targetUid = fbUser.uid;
          const userRef = doc(db, 'users', targetUid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data() as UserData;
            
            // SECURITY CHECK: If this account belongs to a different Telegram ID,
            // we should not allow access. This prevents session crosstalk when sharing links.
            if (currentTgId && data.telegramId && data.telegramId !== currentTgId) {
              console.warn('Session conflict detected! Signing out...');
              await auth.signOut();
              return; 
            }
            
            setUser(data);
          } else {
            // New User flow (Registration)
            const startParam = WebApp?.initDataUnsafe?.start_param;
            let referrerUid = null;
            if (startParam && startParam.startsWith('ref_')) {
              const potentialReferrerId = startParam.replace('ref_', '');
              // Prevent self-referral
              if (potentialReferrerId !== fbUser.uid) {
                referrerUid = potentialReferrerId;
              }
            }

            const newUser: UserData = {
              uid: targetUid,
              telegramId: currentTgId || 0,
              username: tgUser?.username || tgUser?.first_name || 'Player',
              firstName: tgUser?.first_name || 'Player',
              coins: referrerUid ? REFERRAL_REWARD_REFEREE : 0,
              totalCoins: referrerUid ? REFERRAL_REWARD_REFEREE : 0,
              energy: INITIAL_ENERGY,
              maxEnergy: LEVELS[0].maxEnergy,
              lastEnergyUpdate: Date.now(),
              passiveIncomeRate: LEVELS[0].passiveRate, 
              lastPassiveIncomeUpdate: Date.now(),
              walletAddress: null,
              referralCode: targetUid, 
              referredBy: referrerUid,
              referralCount: 0,
              completedTasks: [],
              lastDailyReward: null,
              dailyStreak: 0,
              level: 1
            };
            
            await setDoc(userRef, newUser);

            // Reward the referrer
            if (referrerUid) {
              try {
                const referrerRef = doc(db, 'users', referrerUid);
                await updateDoc(referrerRef, {
                  referralCount: increment(1),
                  coins: increment(REFERRAL_REWARD_REFERRER),
                  totalCoins: increment(REFERRAL_REWARD_REFERRER)
                });
              } catch (err) {
                console.error('Failed to reward referrer:', err);
              }
            }

            setUser(newUser);
          }
        } else {
          // If no Firebase user, attempt to sign in
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [WebApp?.initDataUnsafe?.user?.id]);

  // Energy Refill & Passive Income Ticker
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      setUser((prev) => {
        if (!prev) return null;
        
        const now = Date.now();
        const secondsPassed = Math.floor((now - prev.lastEnergyUpdate) / 1000);
        
        // Energy refill
        let newEnergy = prev.energy;
        if (secondsPassed >= 1 && prev.energy < prev.maxEnergy) {
          newEnergy = Math.min(prev.maxEnergy, prev.energy + (ENERGY_REFILL_RATE * secondsPassed));
        }

        // Passive income
        const passiveSeconds = Math.floor((now - prev.lastPassiveIncomeUpdate) / 1000);
        let newCoins = prev.coins;
        let newTotal = prev.totalCoins;
        if (passiveSeconds >= 1) {
          const currentLevel = LEVELS.find(l => l.level === prev.level) || LEVELS[0];
          const income = currentLevel.passiveRate * passiveSeconds;
          newCoins += income;
          newTotal += income;
        }

        return {
          ...prev,
          energy: newEnergy,
          coins: newCoins,
          totalCoins: newTotal,
          lastEnergyUpdate: now,
          lastPassiveIncomeUpdate: now
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.uid]);

  // Sync Wallet to User Doc
  useEffect(() => {
    if (user && isConnected && address && user.walletAddress !== address) {
      setUser(prev => prev ? ({ ...prev, walletAddress: address }) : null);
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, { walletAddress: address });
    }
  }, [isConnected, address, user?.uid]);

  // Sync to Firestore (Debounced)
  useEffect(() => {
    if (!user || loading) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(async () => {
      setSyncing(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          coins: Math.floor(user.coins),
          totalCoins: Math.floor(user.totalCoins),
          energy: Math.floor(user.energy),
          level: user.level,
          lastEnergyUpdate: user.lastEnergyUpdate,
          lastPassiveIncomeUpdate: user.lastPassiveIncomeUpdate,
          lastDailyReward: user.lastDailyReward,
          dailyStreak: user.dailyStreak,
          lastActive: Date.now()
        });
      } catch (err) {
        console.error('Sync failed:', err);
      } finally {
        setSyncing(false);
      }
    }, 3000); // Sync every 3 seconds of inactivity

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [user?.coins, user?.energy]);

  const tap = useCallback(() => {
    if (!user || user.energy < 1) return;

    hapticFeedback();
    
    const currentLevel = LEVELS.find(l => l.level === user.level) || LEVELS[0];
    const tapVal = currentLevel.tapValue;

    setUser((prev) => {
      if (!prev || prev.energy < 1) return prev;
      return {
        ...prev,
        coins: prev.coins + tapVal,
        totalCoins: prev.totalCoins + tapVal,
        energy: prev.energy - 1
      };
    });
  }, [user?.energy, user?.level]);

  const levelUp = useCallback(async () => {
    if (!user) return;
    
    const nextLevel = LEVELS.find(l => l.level === user.level + 1);
    if (!nextLevel) return; // Max level reached

    if (user.coins >= nextLevel.upgradeCost) {
      const newUser = {
        ...user,
        coins: user.coins - nextLevel.upgradeCost,
        level: nextLevel.level,
        maxEnergy: nextLevel.maxEnergy,
        passiveIncomeRate: nextLevel.passiveRate,
        // Refill energy on level up
        energy: nextLevel.maxEnergy
      };
      
      setUser(newUser);
      
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          coins: newUser.coins,
          level: newUser.level,
          maxEnergy: newUser.maxEnergy,
          passiveIncomeRate: newUser.passiveIncomeRate,
          energy: newUser.energy
        });
        hapticFeedback();
      } catch (err) {
        console.error('Level upgrade failed:', err);
      }
    }
  }, [user]);

  return { user, loading, syncing, tap, levelUp, setUser };
};

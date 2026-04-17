import { useState, useEffect, useCallback, useRef } from 'react';
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
  const tgData = initTelegram();

  // Auth & Initial Data Fetch
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUser(userSnap.data() as UserData);
        } else {
          // Check for referrer
          let referrerUid = null;
          if (tgData.startParam && tgData.startParam.startsWith('ref_')) {
            const potentialReferrerId = tgData.startParam.replace('ref_', '');
            if (potentialReferrerId !== fbUser.uid) {
              referrerUid = potentialReferrerId;
            }
          }

          // Create new user
          const newUser: UserData = {
            uid: fbUser.uid,
            telegramId: tgData.user?.id || 0,
            username: tgData.user?.username || 'Guest',
            firstName: tgData.user?.first_name || 'Player',
            coins: referrerUid ? REFERRAL_REWARD_REFEREE : 0,
            totalCoins: referrerUid ? REFERRAL_REWARD_REFEREE : 0,
            energy: INITIAL_ENERGY,
            maxEnergy: INITIAL_ENERGY,
            lastEnergyUpdate: Date.now(),
            passiveIncomeRate: 1, 
            lastPassiveIncomeUpdate: Date.now(),
            walletAddress: null,
            referralCode: fbUser.uid, // Use UID as referral code for simplicity
            referredBy: referrerUid,
            referralCount: 0,
            completedTasks: [],
            lastDailyReward: null,
            dailyStreak: 0,
            level: 1
          };
          
          await setDoc(userRef, newUser);

          // If there's a referrer, update their stats
          if (referrerUid) {
            try {
              const referrerRef = doc(db, 'users', referrerUid);
              const referrerSnap = await getDoc(referrerRef);
              if (referrerSnap.exists()) {
                await updateDoc(referrerRef, {
                  referralCount: increment(1),
                  coins: increment(REFERRAL_REWARD_REFERRER),
                  totalCoins: increment(REFERRAL_REWARD_REFERRER)
                });
                console.log('Referrer rewarded!');
              }
            } catch (err) {
              console.error('Failed to reward referrer:', err);
            }
          }

          setUser(newUser);
        }
        setLoading(false);
      } else {
        signInAnonymously(auth);
      }
    });

    return () => unsub();
  }, []);

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
          const income = prev.passiveIncomeRate * passiveSeconds;
          newCoins += income;
          newTotal += income;
        }

        // Check level up
        let newLevel = prev.level;
        const currentLevelInfo = LEVELS.find(l => l.level === prev.level);
        const nextLevelInfo = LEVELS.find(l => l.level === prev.level + 1);
        if (nextLevelInfo && newTotal >= nextLevelInfo.minCoins) {
          newLevel = nextLevelInfo.level;
        }

        return {
          ...prev,
          energy: newEnergy,
          coins: newCoins,
          totalCoins: newTotal,
          level: newLevel,
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
          lastPassiveIncomeUpdate: user.lastPassiveIncomeUpdate
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
    
    setUser((prev) => {
      if (!prev || prev.energy < 1) return prev;
      return {
        ...prev,
        coins: prev.coins + COINS_PER_TAP,
        totalCoins: prev.totalCoins + COINS_PER_TAP,
        energy: prev.energy - 1
      };
    });
  }, [user?.energy]);

  return { user, loading, syncing, tap, setUser };
};

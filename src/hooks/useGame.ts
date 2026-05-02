import { useState, useEffect, useCallback, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import { auth, db } from '../lib/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, increment, getDocFromServer, query, collection, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { initTelegram, hapticFeedback } from '../lib/telegram';
import { UserData } from '../types/game';
import { INITIAL_ENERGY, ENERGY_REFILL_RATE, LEVELS, REFERRAL_REWARD_REFERRER, REFERRAL_REWARD_REFEREE, MINE_CARDS, MAX_CARD_LEVEL, BOOST_COSTS, DAILY_CIPHER_REWARD, DAILY_COMBO_REWARD, DAILY_REWARD_BASE, DAILY_REWARD_STEP } from '../lib/constants';
import confetti from 'canvas-confetti';
import { useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

const calculatePassiveRate = (level: number, mineCards: { [id: string]: number } = {}) => {
  const currentLevel = LEVELS.find(l => l.level === level) || LEVELS[0];
  let cardIncomePerHour = 0;
  
  Object.entries(mineCards).forEach(([id, cardLevel]) => {
    const card = MINE_CARDS.find(c => c.id === id);
    if (card) {
      // Natural scaling: slow start, balanced end
      // formula: base * level * (1 + 0.03*(level-1) + 0.004*(level-1)^2)
      const l = cardLevel;
      const scalingBonus = 1 + (l - 1) * 0.03 + Math.pow(l - 1, 2) * 0.004;
      cardIncomePerHour += Math.floor(card.baseProfit * l * scalingBonus);
    }
  });
  
  return currentLevel.passiveRate + (cardIncomePerHour / 3600);
};

export const useGame = (activeTab?: string, skipInit: boolean = false) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [myReferrals, setMyReferrals] = useState<any[]>([]);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isClaimingRef = useRef(false);
  const wallet = useTonWallet();
  const address = useTonAddress();
  const isConnected = !!wallet;

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

  // Helper to calculate current max energy including boosts
  const calculateMaxEnergy = useCallback((level: number, energyLimitBoost: number) => {
    const baseEnergy = LEVELS.find(l => l.level === level)?.maxEnergy || 1000;
    return baseEnergy + (energyLimitBoost - 1) * 500;
  }, []);

  // Connection Test & Init
  useEffect(() => {
    const testConnection = async () => {
      try {
        if (db) {
          await getDocFromServer(doc(db, 'test', 'connection'));
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or internet connection.");
        }
      }
    };
    testConnection();
  }, []);

  // Auth & Initial Data Fetch
  useEffect(() => {
    const fetchGlobalSettings = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data());
        } else {
          setSettings({
            referrerReward: REFERRAL_REWARD_REFERRER,
            refereeReward: REFERRAL_REWARD_REFEREE,
            passiveCommission: 10,
            adsEnabled: true,
            adTasks: [],
            tgBotToken: '',
            tgChannelId: ''
          });
        }
      } catch (err: any) {
        // Handle "offline" error gracefully as per Firebase guidelines
        if (err.message?.includes('offline')) {
          console.warn("Settings fetch deferred: Client is offline. Using defaults.");
        } else {
          console.error("Failed to fetch settings:", err);
        }
        // Always set defaults so the game doesn't break
        setSettings({
          referrerReward: REFERRAL_REWARD_REFERRER,
          refereeReward: REFERRAL_REWARD_REFEREE,
          passiveCommission: 10,
          adsEnabled: true,
          adTasks: [],
          tgBotToken: '',
          tgChannelId: ''
        });
      }
    };

    if (skipInit) {
      fetchGlobalSettings();
      setLoading(false);
      return;
    }

    fetchGlobalSettings();

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        const tgUser = WebApp?.initDataUnsafe?.user;
        const currentTgId = tgUser?.id;

        // If we are in a Telegram environment but don't have user data yet, 
        // wait for the next effect trigger (since we depend on the user ID)
        // This prevents creating "blank" accounts before Telegram is ready.
        if (WebApp?.initData && !currentTgId) {
           return;
        }

        if (fbUser) {
          const targetUid = fbUser.uid;
          const userRef = doc(db, 'users', targetUid);
          let userSnap;
          try {
            userSnap = await getDoc(userRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `users/${targetUid}`);
            return;
          }

          if (userSnap.exists()) {
            const data = userSnap.data() as UserData;
            
            // SECURITY CHECK: If this account has a DIFFERENT Telegram ID than the current session, sign out.
            // This prevents account hijacking or accidental session sharing in shared browsers.
            if (currentTgId && data.telegramId && data.telegramId !== currentTgId) {
              console.warn('Session conflict detected! Signing out...');
              await auth.signOut();
              return; 
            }
            
            // If the account has no Telegram ID (telegramId: 0) but we have one now,
            // we MUST check if this Telegram ID already exists elsewhere before claiming it.
            if (currentTgId && (data.telegramId === 0 || !data.telegramId)) {
                try {
                  const q = query(collection(db, 'users'), where('telegramId', '==', currentTgId), limit(1));
                  const existingSnap = await getDocs(q);
                  
                  if (!existingSnap.empty) {
                    // This Telegram ID is already linked to another account!
                    // Merge or migrate them.
                    const existingData = existingSnap.docs[0].data() as UserData;
                    const migratedUser: UserData = {
                      ...existingData,
                      uid: targetUid,
                      lastActive: Date.now()
                    };
                    await setDoc(userRef, migratedUser);
                    setUser(migratedUser);
                    return;
                  }
                } catch (err) {
                  console.error("Telegram ID duplicate check failed:", err);
                }
            }

            // Refresh data with current Telegram info if it changed
            if (tgUser && (data.username !== (tgUser.username || tgUser.first_name) || data.telegramId === 0)) {
               data.username = tgUser.username || tgUser.first_name || data.username;
               data.firstName = tgUser.first_name || data.firstName;
               data.telegramId = currentTgId || data.telegramId;
            }

            // Calculate Offline Income
            const now = Date.now();
            const lastUpdate = data.lastPassiveIncomeUpdate || data.lastActive || now;
            const secondsPassed = Math.floor((now - lastUpdate) / 1000);
            
            if (secondsPassed > 1) {
              // Hamster style: Cap offline income at 3 hours (10800 seconds)
              const effectiveSeconds = Math.min(secondsPassed, 10800);
              const currentRate = calculatePassiveRate(data.level, data.mineCards || {});
              const offlineIncome = currentRate * effectiveSeconds;
              
              data.coins += offlineIncome;
              data.totalCoins += offlineIncome;
              data.lastPassiveIncomeUpdate = now;
              
              // Energy refill
              const energyRefill = ENERGY_REFILL_RATE * secondsPassed;
              data.energy = Math.min(data.maxEnergy, data.energy + energyRefill);
              data.lastEnergyUpdate = now;
            }
            
            setUser(data);
          } else {
            // Check if this Telegram ID already exists in our database under a different UID
            if (currentTgId) {
              try {
                const q = query(collection(db, 'users'), where('telegramId', '==', currentTgId), limit(1));
                const existingSnap = await getDocs(q);
                
                if (!existingSnap.empty) {
                  // This user already exists! Migrate them to this new UID
                  const existingData = existingSnap.docs[0].data() as UserData;
                  
                  // Keep original progress but update UID for this session
                  const migratedUser: UserData = {
                    ...existingData,
                    uid: targetUid,
                    lastActive: Date.now()
                  };

                  await setDoc(userRef, migratedUser);
                  // We do NOT reward referrer here because they already had an account
                  setUser(migratedUser);
                  setLoading(false);
                  return;
                }
              } catch (err) {
                console.error("Telegram ID check failed:", err);
              }
            }

            // Wait for settings to load if possible, or use defaults
            const currentSettings = settings || {
              referrerReward: REFERRAL_REWARD_REFERRER,
              refereeReward: REFERRAL_REWARD_REFEREE
            };

            // New User flow (Registration)
            const startParam = WebApp?.initDataUnsafe?.start_param;
            let referrerUid = null;
            if (startParam && startParam.startsWith('ref_')) {
              const potentialReferrerId = startParam.replace('ref_', '');
              if (potentialReferrerId !== targetUid) {
                // Verify referrer exists before rewarding
                try {
                  const refSnap = await getDoc(doc(db, 'users', potentialReferrerId));
                  if (refSnap.exists()) {
                    referrerUid = potentialReferrerId;
                  }
                } catch (e) {
                  console.error("Error checking referrer:", e);
                }
              }
            }

            const newUser: UserData = {
              uid: targetUid,
              telegramId: currentTgId || 0,
              username: tgUser?.username || tgUser?.first_name || 'Player',
              firstName: tgUser?.first_name || 'Player',
              coins: referrerUid ? currentSettings.refereeReward : 0,
              totalCoins: referrerUid ? currentSettings.refereeReward : 0,
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
              lastAdView: null,
              adCompletions: {},
              dailyStreak: 0,
              level: 1,
              mineCards: {},
              boosts: {
                multiTap: 1,
                energyLimit: 1,
                rechargeSpeed: 1,
                refillsToday: 0,
                lastFullRefill: 0
              },
              dailyCipher: {
                word: 'SATO', // Default word, admin can change via settings
                isCompleted: false,
                lastUpdated: Date.now()
              },
              dailyCombo: {
                cards: [], // Will be populated by logic or settings
                claimed: false,
                lastUpdated: Date.now()
              }
            };
            
            try {
              await setDoc(userRef, newUser);
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, `users/${targetUid}`);
            }

            // Reward the referrer
            if (referrerUid) {
              try {
                const referrerRef = doc(db, 'users', referrerUid);
                await updateDoc(referrerRef, {
                  referralCount: increment(1),
                  coins: increment(currentSettings.referrerReward),
                  totalCoins: increment(currentSettings.referrerReward)
                });
              } catch (err) {
                console.error('Failed to reward referrer:', err);
              }
            }

            setUser(newUser);
          }
        } else {
          // If no Firebase user, attempt to sign in anonymounsly if not an admin page
          // This avoids creating guest accounts for admins on refresh
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [WebApp?.initDataUnsafe?.user?.id, skipInit]);
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      setUser((prev) => {
        if (!prev) return null;
        
        const now = Date.now();
        
        // Guard against clock going backwards (e.g. system time sync)
        if (now < prev.lastPassiveIncomeUpdate || now < prev.lastEnergyUpdate) {
            return {
                ...prev,
                lastEnergyUpdate: now,
                lastPassiveIncomeUpdate: now
            };
        }

        const energySeconds = Math.max(0, Math.floor((now - prev.lastEnergyUpdate) / 1000));
        const passiveSeconds = Math.max(0, Math.floor((now - prev.lastPassiveIncomeUpdate) / 1000));
        
        // Skip update if no time passed
        if (energySeconds < 1 && passiveSeconds < 1) return prev;

        // Energy refill
        let newEnergy = prev.energy;
        const currentMaxEnergy = calculateMaxEnergy(prev.level, prev.boosts?.energyLimit || 1);
        const refillRate = ENERGY_REFILL_RATE * (prev.boosts?.rechargeSpeed || 1);

        if (energySeconds >= 1 && prev.energy < currentMaxEnergy) {
          newEnergy = Math.min(currentMaxEnergy, prev.energy + (refillRate * energySeconds));
        }

        // Passive income
        let newCoins = prev.coins;
        let newTotal = prev.totalCoins;
        if (passiveSeconds >= 1) {
          const income = prev.passiveIncomeRate * passiveSeconds;
          newCoins += income;
          newTotal += income;
        }

        return {
          ...prev,
          energy: newEnergy,
          coins: newCoins,
          totalCoins: newTotal,
          maxEnergy: currentMaxEnergy, // Keep display synced
          lastEnergyUpdate: now,
          lastPassiveIncomeUpdate: now
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.uid, calculateMaxEnergy]);

  // Sync Wallet to User Doc
  useEffect(() => {
    const syncWallet = async () => {
      if (user && isConnected && address && user.walletAddress !== address) {
        console.log('Syncing wallet address to Firestore:', address);
        try {
          // Update local state first for immediate feedback
          setUser(prev => prev ? ({ ...prev, walletAddress: address }) : null);
          
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { walletAddress: address });
          console.log('Wallet address synced successfully');
        } catch (err) {
          console.error('Failed to sync wallet address:', err);
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        }
      }
    };
    syncWallet();
  }, [isConnected, address, user?.uid, user?.walletAddress]);

  // Sync to Firestore (Debounced)
  useEffect(() => {
    if (!user || loading) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(async () => {
      setSyncing(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        
        // Calculate income since last sync for commission logic
        // This is a simplified version: we estimate based on passiveRate and time
        // Actual robust implementation would need server-side functions, but we'll do it via client-write for now.
        const rewardReferrer = async () => {
          if (user.referredBy && settings?.passiveCommission > 0) {
            const now = Date.now();
            const lastUpdate = user.lastPassiveIncomeUpdate || now;
            const seconds = Math.floor((now - lastUpdate) / 1000);
            if (seconds > 0) {
              const commission = (user.passiveIncomeRate * seconds) * (settings.passiveCommission / 100);
              if (commission > 0.1) {
                const referrerRef = doc(db, 'users', user.referredBy);
                await updateDoc(referrerRef, {
                  coins: increment(commission),
                  totalCoins: increment(commission)
                });
              }
            }
          }
        };

        await Promise.all([
          updateDoc(userRef, {
            coins: user.coins,
            totalCoins: user.totalCoins,
            energy: user.energy,
            level: user.level,
            lastEnergyUpdate: user.lastEnergyUpdate,
            lastPassiveIncomeUpdate: user.lastPassiveIncomeUpdate,
            lastDailyReward: user.lastDailyReward,
            lastAdView: user.lastAdView || null,
            adCompletions: user.adCompletions || {},
            dailyStreak: user.dailyStreak,
            boosts: user.boosts || null,
            dailyCipher: user.dailyCipher || null,
            dailyCombo: user.dailyCombo || null,
            lastActive: Date.now()
          }),
          rewardReferrer()
        ]);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      } finally {
        setSyncing(false);
      }
    }, 3000); // Sync every 3 seconds of inactivity

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [user?.coins, user?.energy]);

  const tap = useCallback(() => {
    let success = false;
    setUser((prev) => {
      if (!prev) return prev;
      
      const currentMaxEnergy = calculateMaxEnergy(prev.level, prev.boosts?.energyLimit || 1);
      const tapCost = prev.boosts?.multiTap || 1;
      
      if (Math.floor(prev.energy) < tapCost) return prev;
      
      const currentLevel = LEVELS.find(l => l.level === prev.level) || LEVELS[0];
      const tapVal = currentLevel.tapValue * (prev.boosts?.multiTap || 1);
      
      success = true;
      return {
        ...prev,
        coins: prev.coins + tapVal,
        totalCoins: prev.totalCoins + tapVal,
        energy: Math.max(0, prev.energy - tapCost),
        maxEnergy: currentMaxEnergy
      };
    });

    if (success) {
      hapticFeedback();
    }
    return success;
  }, [user?.level, calculateMaxEnergy]);

  const levelUp = useCallback(async () => {
    if (!user) return;
    
    const nextLevel = LEVELS.find(l => l.level === user.level + 1);
    if (!nextLevel) return;

    if (user.coins >= nextLevel.upgradeCost) {
      const newMineCards = user.mineCards || {};
      const newRate = calculatePassiveRate(nextLevel.level, newMineCards);
      
      const newUser = {
        ...user,
        coins: user.coins - nextLevel.upgradeCost,
        level: nextLevel.level,
        maxEnergy: nextLevel.maxEnergy,
        passiveIncomeRate: newRate,
        energy: nextLevel.maxEnergy
      };
      
      setUser(newUser);
      
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          coins: Math.floor(newUser.coins),
          level: newUser.level,
          maxEnergy: newUser.maxEnergy,
          passiveIncomeRate: newUser.passiveIncomeRate,
          energy: Math.floor(newUser.energy)
        });
        hapticFeedback();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  }, [user]);

  const buyCard = useCallback(async (cardId: string) => {
    if (!user) return;
    
    const card = MINE_CARDS.find(c => c.id === cardId);
    if (!card) return;

    const currentLevel = user.mineCards?.[cardId] || 0;
    if (currentLevel >= MAX_CARD_LEVEL) return;

    const upgradeCost = Math.floor(card.baseCost * Math.pow(1.5, currentLevel));
    
    if (user.coins >= upgradeCost) {
      const newMineCards = { ...(user.mineCards || {}), [cardId]: currentLevel + 1 };
      const newRate = calculatePassiveRate(user.level, newMineCards);
      
      // Daily Combo logic
      const today = new Date().toDateString();
      const lastComboUpdate = user.dailyCombo?.lastUpdated ? new Date(user.dailyCombo.lastUpdated).toDateString() : '';
      let currentComboCards = (today === lastComboUpdate) ? (user.dailyCombo?.cards || []) : [];
      
      // If this card is part of today's combo and not already in our logic
      if (settings?.dailyComboCards?.includes(cardId) && !currentComboCards.includes(cardId)) {
        currentComboCards = [...currentComboCards, cardId];
      }

      const updatedCombo = {
        ...(user.dailyCombo || { claimed: false }),
        cards: currentComboCards,
        lastUpdated: Date.now()
      };

      const newUser = {
        ...user,
        coins: user.coins - upgradeCost,
        mineCards: newMineCards,
        passiveIncomeRate: newRate,
        dailyCombo: updatedCombo
      };
      
      setUser(newUser);
      
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          coins: Math.floor(newUser.coins),
          mineCards: newMineCards,
          passiveIncomeRate: newRate,
          dailyCombo: updatedCombo
        });
        hapticFeedback();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'friends' && user?.uid) {
      const fetchMyReferrals = async () => {
        try {
          const q = query(
            collection(db, 'users'), 
            where('referredBy', '==', user.uid),
            orderBy('coins', 'desc'), 
            limit(20)
          );
          const snapshot = await getDocs(q);
          const list = snapshot.docs.map(doc => ({
            username: doc.data().username || 'Anonymous',
            coins: doc.data().coins || 0,
            level: doc.data().level || 1
          }));
          setMyReferrals(list);
        } catch (err) {
          console.error("Referrals fetch error:", err);
        }
      };
      fetchMyReferrals();
    }
  }, [activeTab, user?.uid]);

  const upgradeBoost = useCallback(async (type: 'multiTap' | 'energyLimit' | 'rechargeSpeed') => {
    if (!user) return;
    const currentBoosts = user.boosts || { multiTap: 1, energyLimit: 1, rechargeSpeed: 1, refillsToday: 0, lastFullRefill: 0 };
    const level = currentBoosts[type] || 1;
    const cost = BOOST_COSTS[type] * Math.pow(2.5, level - 1);
    
    if (user.coins >= cost) {
      const newBoosts = { ...currentBoosts, [type]: level + 1 };
      const newUser = {
        ...user,
        coins: user.coins - cost,
        boosts: newBoosts
      };
      setUser(newUser);
      
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          coins: Math.floor(newUser.coins),
          boosts: newBoosts
        });
        hapticFeedback();
      } catch (err) {
        console.error("Boost upgrade failed:", err);
      }
    }
  }, [user]);

  const fullRefill = useCallback(async () => {
    if (!user) return;
    const currentBoosts = user.boosts || { multiTap: 1, energyLimit: 1, rechargeSpeed: 1, refillsToday: 0, lastFullRefill: 0 };
    const now = Date.now();
    
    // Reset refills if it's a new day
    const lastRefillDate = currentBoosts.lastFullRefill ? new Date(currentBoosts.lastFullRefill).toDateString() : '';
    const today = new Date().toDateString();
    const refillsToday = lastRefillDate === today ? (currentBoosts.refillsToday || 0) : 0;
    
    if (refillsToday < 6) {
      const maxEnergy = (LEVELS.find(l => l.level === user.level)?.maxEnergy || user.maxEnergy) + ((currentBoosts.energyLimit || 1) - 1) * 500;
      const newBoosts = { ...currentBoosts, refillsToday: refillsToday + 1, lastFullRefill: now };
      const newUser = {
        ...user,
        energy: maxEnergy,
        boosts: newBoosts
      };
      setUser(newUser);
      
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          energy: maxEnergy,
          boosts: newBoosts
        });
        hapticFeedback();
      } catch (err) {
        console.error("Full refill failed:", err);
      }
    } else {
      alert("Daily limit reached (6/6). Come back tomorrow!");
    }
  }, [user]);

  const claimDailyReward = useCallback(async () => {
    if (!user || isClaimingRef.current) return;

    const now = Date.now();
    const lastClaim = user.lastDailyReward || 0;
    const isNewDay = new Date(lastClaim).toDateString() !== new Date(now).toDateString();

    if (!isNewDay) {
      alert("You already claimed your reward today!");
      return;
    }

    isClaimingRef.current = true;
    const rewardCount = user.dailyStreak; // use existing streak for day calculation
    const reward = DAILY_REWARD_BASE + (rewardCount * DAILY_REWARD_STEP);
    
    // Streak logic: if last claim was yesterday, increment, else reset to 0
    let nextStreak = user.dailyStreak + 1;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (user.lastDailyReward && new Date(user.lastDailyReward).toDateString() !== yesterday.toDateString()) {
       nextStreak = 1;
    }
    if (nextStreak > 10) nextStreak = 1;

    const newUser = {
      ...user,
      coins: user.coins + reward,
      totalCoins: user.totalCoins + reward,
      dailyStreak: nextStreak,
      lastDailyReward: now
    };

    setUser(newUser);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        coins: Math.floor(newUser.coins),
        totalCoins: Math.floor(newUser.totalCoins),
        dailyStreak: newUser.dailyStreak,
        lastDailyReward: now
      });
      hapticFeedback();
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      console.error("Daily claim failed:", err);
    } finally {
      isClaimingRef.current = false;
    }
  }, [user]);

  const claimCipher = useCallback(async () => {
    if (!user || user.dailyCipher?.isCompleted) return;
    
    const updatedCipher = {
      ...(user.dailyCipher || { word: 'SATO', isCompleted: false, lastUpdated: Date.now() }),
      isCompleted: true,
      lastUpdated: Date.now()
    };
    
    const newUser = {
      ...user,
      coins: user.coins + DAILY_CIPHER_REWARD,
      totalCoins: user.totalCoins + DAILY_CIPHER_REWARD,
      dailyCipher: updatedCipher
    };
    
    setUser(newUser);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        coins: Math.floor(newUser.coins),
        totalCoins: Math.floor(newUser.totalCoins),
        dailyCipher: updatedCipher
      });
      hapticFeedback();
    } catch (err) {
      console.error("Cipher claim failed:", err);
    }
  }, [user]);

  const claimCombo = useCallback(async () => {
    if (!user || user.dailyCombo?.claimed) return;
    
    const updatedCombo = {
      ...(user.dailyCombo || { cards: [], claimed: false, lastUpdated: Date.now() }),
      claimed: true,
      lastUpdated: Date.now()
    };
    
    const newUser = {
      ...user,
      coins: user.coins + DAILY_COMBO_REWARD,
      totalCoins: user.totalCoins + DAILY_COMBO_REWARD,
      dailyCombo: updatedCombo
    };
    
    setUser(newUser);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        coins: Math.floor(newUser.coins),
        totalCoins: Math.floor(newUser.totalCoins),
        dailyCombo: updatedCombo
      });
      hapticFeedback();
    } catch (err) {
      console.error("Combo claim failed:", err);
    }
  }, [user]);

  return { 
    user, loading, syncing, tap, levelUp, buyCard, setUser, settings, myReferrals,
    upgradeBoost, fullRefill, claimCipher, claimCombo, claimDailyReward
  };
};

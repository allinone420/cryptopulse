import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import { useGame } from './hooks/useGame';
import { Navigation, Header } from './components/Navigation';
import { Zap, Coins, Users, Trophy, Wallet, CheckCircle2, ChevronRight, PlayCircle, Copy, Check, X, Pickaxe, Info, TrendingUp, Clock, Calendar, MessageSquare, LayoutGrid, Gift, Sparkles, Brain } from 'lucide-react';
import { TASKS, DAILY_REWARD_BASE, DAILY_REWARD_STEP, COINS_PER_TAP, BOT_USERNAME, LEVELS, MINE_CARDS, MineCard, MAX_CARD_LEVEL, DAILY_CIPHER_REWARD, DAILY_COMBO_REWARD, BOOST_COSTS } from './lib/constants';
import confetti from 'canvas-confetti';
import WebApp from '@twa-dev/sdk';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './lib/firebase';
import { LeaderboardEntry, AdTask } from './types/game';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  
  const checkIsAdmin = () => {
    const url = window.location.href.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    return (
      params.has('admin') || 
      window.location.hash.includes('admin') || 
      window.location.pathname.includes('/admin') ||
      url.includes('?admin')
    );
  };

  const [isAdminPath, setIsAdminPath] = useState(checkIsAdmin());
  const hapticFeedback = () => {
    try {
      WebApp.HapticFeedback.impactOccurred('medium');
    } catch (e) {}
  };

  const { 
    user, loading, syncing, tap, levelUp, buyCard, setUser, settings, myReferrals,
    upgradeBoost, fullRefill, claimCipher, claimCombo, claimDailyReward
  } = useGame(activeTab, isAdminPath);
  
  const [adCooldown, setAdCooldown] = useState(0);
  const [verifyingTask, setVerifyingTask] = useState<string | null>(null);
  const [taps, setTaps] = useState<{ id: number; x: number; y: number; value: number }[]>([]);
  const [showDaily, setShowDaily] = useState(false);
  const [showCipher, setShowCipher] = useState(false);
  const [showCombo, setShowCombo] = useState(false);
  const [showBoosts, setShowBoosts] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [cipherInput, setCipherInput] = useState<string>('');
  const [cipherStatus, setCipherStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [mineCategory, setMineCategory] = useState<'Markets' | 'PR&Team' | 'Legal' | 'Special'>('Markets');
  const tapContainerRef = useRef<HTMLDivElement>(null);

  // Simple Router based on path/search/hash
  useEffect(() => {
    const handlePathChange = () => {
      setIsAdminPath(checkIsAdmin());
    };
    window.addEventListener('popstate', handlePathChange);
    // Also listen for hash changes
    window.addEventListener('hashchange', handlePathChange);
    return () => {
      window.removeEventListener('popstate', handlePathChange);
      window.removeEventListener('hashchange', handlePathChange);
    };
  }, []);

  // Animated Coins State
  const coinsDisplay = useMotionValue(user?.coins || 0);
  const roundedCoins = useTransform(coinsDisplay, (latest) => Math.floor(latest).toLocaleString());

  useEffect(() => {
    if (user?.coins !== undefined) {
      const currentVal = coinsDisplay.get();
      const diff = user.coins - currentVal;
      
      // If jump is huge (like returning from background), snap immediately
      if (Math.abs(diff) > 5000) {
        coinsDisplay.set(user.coins);
      } else if (Math.abs(diff) > 0.1) {
        // Only animate if there's a tangible change to avoid jitter
        animate(coinsDisplay, user.coins, { duration: 0.5, ease: "easeOut" });
      }
    }
  }, [user?.coins]);

  // Fetch Leaderboard
  useEffect(() => {
    if (activeTab === 'leaders') {
      const fetchLeaders = async () => {
        setLoadingLeaders(true);
        try {
          const q = query(collection(db, 'users'), orderBy('coins', 'desc'), limit(50));
          const snapshot = await getDocs(q);
          const leaders = snapshot.docs.map(doc => ({
            uid: doc.id,
            username: doc.data().username || 'Anonymous',
            coins: doc.data().coins || 0,
            level: doc.data().level || 1
          }));
          setLeaderboard(leaders);
        } catch (err) {
          console.error("Leaderboard fetch error:", err);
        } finally {
          setLoadingLeaders(false);
        }
      };
      fetchLeaders();
    }
  }, [activeTab]);

  const verifyTelegramJoin = async (taskId: string, reward: number) => {
    if (!user) return;
    setVerifyingTask(taskId);
    
    // Default success if no bot token (prevents locking user if admin config is incomplete)
    let isMember = true; 

    if (settings?.tgBotToken && settings?.tgChannelId) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${settings.tgBotToken}/getChatMember?chat_id=${settings.tgChannelId}&user_id=${user.telegramId}`);
        const data = await response.json();
        
        if (data.ok) {
          const status = data.result.status;
          isMember = ['member', 'administrator', 'creator'].includes(status);
        } else {
          console.error("Telegram API Error:", data.description);
          // If the bot token is invalid or bot is not in channel, we don't block the user but log it
          isMember = false;
        }
      } catch (err) {
        console.error("Verification failed:", err);
        isMember = false;
      }
    } else {
      // If admin hasn't set anything, just let them pass for now
      isMember = true;
    }

    if (isMember) {
      // Check if already completed to prevent double reward
      if (user.completedTasks.includes(taskId)) {
        alert("You have already received the reward for this task!");
        setVerifyingTask(null);
        return;
      }

      const updatedUser = {
        ...user,
        coins: user.coins + reward,
        totalCoins: user.totalCoins + reward,
        completedTasks: [...(user.completedTasks || []), taskId]
      };
      setUser(updatedUser);
      
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          coins: increment(reward),
          totalCoins: increment(reward),
          completedTasks: updatedUser.completedTasks
        });
      } catch (e) {
        console.error("Failed to update task completion:", e);
      }

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      WebApp.HapticFeedback.notificationOccurred('success');
      alert("Verification successful! Reward added.");
    } else {
      WebApp.HapticFeedback.notificationOccurred('error');
      const channelDisplayName = settings?.tgChannelId || "@SatoCryp";
      alert(`Join failed or not verified. Please join ${channelDisplayName} channel first!`);
    }
    
    setVerifyingTask(null);
  };

  const verifyInviteTask = async (taskId: string, reward: number, requiredCount: number) => {
    if (!user) return;
    setVerifyingTask(taskId);

    const currentInvites = user.referralCount || 0;

    if (currentInvites >= requiredCount) {
      // Check if already completed to prevent double reward
      if (user.completedTasks.includes(taskId)) {
        alert("You have already received the reward for this task!");
        setVerifyingTask(null);
        return;
      }

      const updatedUser = {
        ...user,
        coins: user.coins + reward,
        totalCoins: user.totalCoins + reward,
        completedTasks: [...(user.completedTasks || []), taskId]
      };
      setUser(updatedUser);
      
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          coins: increment(reward),
          totalCoins: increment(reward),
          completedTasks: updatedUser.completedTasks
        });
      } catch (e) {
        console.error("Failed to update task completion:", e);
      }

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      WebApp.HapticFeedback.notificationOccurred('success');
      alert(`Milestone reached! ${reward.toLocaleString()} coins added.`);
    } else {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert(`You need ${requiredCount} friends. Currently: ${currentInvites}`);
    }
    
    setVerifyingTask(null);
  };

  const nextLevel = LEVELS.find(l => l.level === (user?.level || 1) + 1);
  const currentLevelInfo = LEVELS.find(l => l.level === (user?.level || 1)) || LEVELS[0];

  const handleLevelUp = async () => {
    if (!user || !nextLevel) return;
    if (user.coins >= nextLevel.upgradeCost) {
      await levelUp();
      setShowLevelUp(false);
      
      // Celebratory Effects
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      WebApp.HapticFeedback.notificationOccurred('success');
    } else {
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  };

  // Daily Reward Check
  useEffect(() => {
    if (!user || loading) return;

    const checkDaily = () => {
      const now = new Date();
      
      if (!user.lastDailyReward) {
        setShowDaily(true);
        return;
      }

      const last = new Date(user.lastDailyReward);
      
      // If already claimed today, don't show
      const isSameDay = 
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth() &&
        last.getDate() === now.getDate();

      if (!isSameDay) {
        // Check if streak was broken (last claim was before yesterday)
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        
        const wasConsecutive = 
          last.getFullYear() === yesterday.getFullYear() &&
          last.getMonth() === yesterday.getMonth() &&
          last.getDate() === yesterday.getDate();

        if (!wasConsecutive) {
          // Reset streak in local state to show correct info in modal
          // The actual DB update happens on claim
          setUser(prev => prev ? ({ ...prev, dailyStreak: 0 }) : null);
        }
        
        setShowDaily(true);
      }
    };

    checkDaily();
  }, [user?.uid, loading]);

  const claimDaily = () => {
    claimDailyReward();
    setShowDaily(false);
  };


  const watchAd = (task: AdTask) => {
    if (!user || !settings?.adsEnabled) return;
    
    // Check daily limit for THIS specific ad
    if (user.adCompletions && user.adCompletions[task.id]) {
      try {
        const last = new Date(user.adCompletions[task.id]);
        const now = new Date();
        const lastDateStr = last.toISOString().split('T')[0];
        const nowDateStr = now.toISOString().split('T')[0];
        
        if (lastDateStr === nowDateStr) {
          alert(`You have already watched "${task.title}" today. Come back tomorrow!`);
          return;
        }
      } catch (e) {
        // Fallback
      }
    }

    if (adCooldown > 0) return;
    if (typeof (window as any).show_10932949 !== 'function') {
      alert("Ads SDK is loading, please try again in a moment.");
      return;
    }
    
    // Safety timeout
    const adPromise = task.type === 'popup' 
      ? (window as any).show_10932949('pop') 
      : (window as any).show_10932949();

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Ad load timeout')), 60000)
    );

    Promise.race([adPromise, timeoutPromise]).then(() => {
      // Reward user
      const now = Date.now();
      const updatedUser = {
        ...user,
        coins: user.coins + task.reward,
        totalCoins: user.totalCoins + task.reward,
        lastAdView: now,
        adCompletions: {
          ...(user.adCompletions || {}),
          [task.id]: now
        }
      };
      
      setUser(updatedUser);
      
      // Persist immediately
      try {
        const userRef = doc(db, 'users', user.uid);
        updateDoc(userRef, {
          coins: Math.floor(updatedUser.coins),
          totalCoins: Math.floor(updatedUser.totalCoins),
          lastAdView: updatedUser.lastAdView,
          adCompletions: updatedUser.adCompletions
        });
      } catch (err) {
        console.error("Failed to save ad reward:", err);
      }
      
      confetti({
        particleCount: 100,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#f3ba2f', '#ffffff']
      });

      WebApp.HapticFeedback.notificationOccurred('success');
      
      setAdCooldown(5);
      const adTimer = setInterval(() => {
        setAdCooldown(prev => {
          if (prev <= 1) {
            clearInterval(adTimer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }).catch((e: any) => {
      console.error('Ad Error:', e);
      WebApp.HapticFeedback.notificationOccurred('error');
    });
  };

  const handleTap = (e: React.PointerEvent) => {
    if (!user) return;
    
    // Prevent default to avoid virtual mouse events on some devices
    if (e.cancelable) e.preventDefault();

    const success = tap();
    if (!success) return;

    // Get coordinates relative to the container for better positioning
    if (tapContainerRef.current) {
      const rect = tapContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const currentLevel = LEVELS.find(l => l.level === user.level) || LEVELS[0];
      const newTap = { id: Math.random() + performance.now(), x, y, value: currentLevel.tapValue };
      
      setTaps((prev) => [...prev, newTap]);
      setTimeout(() => {
        setTaps((prev) => prev.filter((t) => t.id !== newTap.id));
      }, 700);
    }
  };

  const renderHome = () => (
    <div className="flex flex-col gap-6 w-full">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5 px-5 mt-2.5">
        <button 
          onClick={() => setShowLevelUp(true)}
          className="bg-card-bg p-3 rounded-2xl text-center border-b-2 border-white/5 active:scale-95 transition-transform"
        >
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 font-medium">Level Progression</div>
          <div className="text-sm font-bold text-accent-gold flex items-center justify-center gap-1">
             {currentLevelInfo.name} <ChevronRight size={14} />
          </div>
        </button>
        <div className="bg-card-bg p-3 rounded-2xl text-center border-b-2 border-white/5">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 font-medium">Profit per hour</div>
          <div className="text-sm font-bold text-accent-gold">+{(Math.floor((user?.passiveIncomeRate || 0) * 3600)).toLocaleString()}</div>
        </div>
      </div>

      {/* Tap Main Area */}
      <div className="flex-1 flex flex-col items-center justify-center pt-4">
        <div className="text-center mb-8">
          <div className="text-sm text-text-secondary uppercase tracking-widest mb-1.5 font-medium">Total Balance</div>
          <h1 className="text-[44px] font-black flex items-center justify-center gap-3 leading-none tracking-tight">
            <div className="w-11 h-11 bg-accent-gold rounded-full coin-icon-shadow border-2 border-white/30 flex items-center justify-center text-black/70 text-2xl font-black shadow-[inset_0_2px_6px_rgba(255,255,255,0.5),0_0_20px_rgba(243,186,47,0.4)]">S</div>
            <motion.span className="text-white drop-shadow-[0_0_10px_rgba(243,186,47,0.2)]">{roundedCoins}</motion.span>
          </h1>
        </div>

        <div className="relative" ref={tapContainerRef}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onPointerDown={handleTap}
            className="w-[240px] h-[240px] bg-radial-[circle_at_center,_var(--color-bg-main)_0%,_#1c212b_100%] rounded-full flex items-center justify-center border-[12px] border-accent-gold shadow-[0_0_40px_rgba(243,186,47,0.1)] tap-button-shadow group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-accent-gold/5 group-active:opacity-20 transition-opacity" />
            <div className="w-[160px] h-[160px] bg-[#363d4a] rounded-[40px] rotate-45 flex items-center justify-center overflow-hidden">
               <div className="-rotate-45 relative w-full h-full flex items-center justify-center">
                <img 
                  src="https://i.ibb.co.com/0ywpgL4q/logo.webp" 
                  alt="SatoCryp" 
                  className="w-full h-full object-cover select-none pointer-events-none opacity-90"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=1000&auto=format&fit=crop";
                  }}
                />
               </div>
            </div>
          </motion.button>

          {/* Floating Numbers */}
          <AnimatePresence>
            {taps.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -150 }}
                exit={{ opacity: 0 }}
                className="absolute pointer-events-none text-white font-black text-4xl z-50 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] select-none"
                style={{ left: t.x - 20, top: t.y - 20 }}
              >
                +{t.value}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Energy Section */}
      <div className="px-5 pb-5 w-full">
        <div className="flex justify-between items-center mb-2 font-bold text-[13px]">
          <div className="flex items-center gap-1.5 uppercase tracking-tight text-white/90">
             ⚡ {Math.floor(user?.energy || 0)} / {user?.maxEnergy}
          </div>
          <button 
            onClick={() => setShowBoosts(true)}
            className="text-accent-blue font-black uppercase text-[11px] tracking-widest hover:opacity-80 transition-opacity flex items-center gap-1"
          >
            <Zap size={10} fill="currentColor" /> Boost
          </button>
        </div>
        <div className="w-full h-3 bg-[#252b36] rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-energy"
            initial={{ width: 0 }}
            animate={{ width: `${((user?.energy || 0) / (user?.maxEnergy || 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );

  const renderTasks = () => {
    const isAdWatchedToday = (adId: string) => {
      if (!user?.adCompletions || !user.adCompletions[adId]) return false;
      try {
        const last = new Date(user.adCompletions[adId]);
        const now = new Date();
        const lastDateStr = last.toISOString().split('T')[0];
        const nowDateStr = now.toISOString().split('T')[0];
        return lastDateStr === nowDateStr;
      } catch (e) {
        return false;
      }
    };

    const adTasks = (settings?.adTasks || []) as AdTask[];

    return (
      <div className="p-5 flex flex-col gap-8 pb-24 overflow-y-auto max-h-screen">
        {/* Daily Feature Cards */}
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => setShowDaily(true)}
            className="bg-card-bg border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 group active:scale-95 transition-all shadow-lg"
          >
            <div className="w-10 h-10 bg-accent-gold/10 rounded-xl flex items-center justify-center text-accent-gold group-hover:scale-110 transition-transform">
              <Calendar size={20} />
            </div>
            <span className="text-[10px] font-black uppercase text-white tracking-widest leading-none">Daily Reward</span>
          </button>
          
          <button 
            onClick={() => setShowCipher(true)}
            className={`bg-card-bg border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 group active:scale-95 transition-all shadow-lg ${user?.dailyCipher?.isCompleted ? 'opacity-60' : ''}`}
          >
            <div className="w-10 h-10 bg-accent-blue/10 rounded-xl flex items-center justify-center text-accent-blue group-hover:scale-110 transition-transform">
              <MessageSquare size={20} />
            </div>
            <span className="text-[10px] font-black uppercase text-white tracking-widest leading-none">Daily Cipher</span>
          </button>
          
          <button 
            onClick={() => setShowCombo(true)}
            className={`bg-card-bg border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 group active:scale-95 transition-all shadow-lg ${user?.dailyCombo?.claimed ? 'opacity-60' : ''}`}
          >
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
              <LayoutGrid size={20} />
            </div>
            <span className="text-[10px] font-black uppercase text-white tracking-widest leading-none">Daily Combo</span>
          </button>
        </div>

        {/* Ads Section */}
        {settings?.adsEnabled && adTasks.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <PlayCircle className="text-accent-gold" size={20} />
              <h2 className="text-xl font-black text-white tracking-tight uppercase italic">Monetization</h2>
            </div>
            <div className="grid gap-3">
              {adTasks.map((task) => {
                const adWatched = isAdWatchedToday(task.id);
                return (
                  <div key={task.id} className={`bg-card-bg border border-white/5 p-4 rounded-2xl flex items-center justify-between group ${adWatched ? 'opacity-40' : ''}`}>
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-accent-gold">
                        <PlayCircle size={24} />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm leading-tight mb-1">{task.title}</h4>
                        <div className="flex items-center gap-1.5 text-accent-gold text-xs font-black italic">
                           +{task.reward.toLocaleString()} <Coins size={12} />
                        </div>
                      </div>
                    </div>
                    <button 
                      disabled={adWatched || adCooldown > 0}
                      onClick={() => watchAd(task)}
                      className={`${adWatched ? 'bg-gray-700 text-gray-400' : 'bg-accent-gold text-black'} px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all disabled:scale-100 min-w-[100px]`}
                    >
                      {adWatched ? 'Daily Done' : adCooldown > 0 ? `${adCooldown}s` : 'Watch'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Regular Tasks Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="text-accent-gold" size={20} />
            <h2 className="text-xl font-black text-white tracking-tight uppercase italic">Social Tasks</h2>
          </div>
          <div className="grid gap-3">
            {TASKS.filter(t => t.type !== 'ads').map((task) => {
              const isCompleted = user?.completedTasks.includes(task.id);
              return (
                <div key={task.id} className={`bg-card-bg border border-white/5 p-4 rounded-2xl flex items-center justify-between group ${isCompleted ? 'opacity-40' : ''}`}>
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-accent-gold">
                      <Users size={24} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm leading-tight mb-1">{task.title}</h4>
                      <div className="flex items-center gap-1.5 text-accent-gold text-xs font-black italic">
                         +{task.reward.toLocaleString()} <Coins size={12} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      disabled={isCompleted}
                      onClick={() => {
                        if (task.type === 'invite') {
                          setActiveTab('friends');
                        } else if (task.link) {
                          window.open(task.link, '_blank');
                        }
                      }}
                      className={`${isCompleted ? 'bg-gray-700 text-gray-400' : 'bg-accent-gold text-black'} px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all disabled:scale-100 min-w-[80px]`}
                    >
                      {isCompleted ? 'Done' : task.type === 'invite' ? 'Invite' : 'Join'}
                    </button>
                    {!isCompleted && (task.type === 'telegram' || task.type === 'invite') && (
                      <button 
                        disabled={verifyingTask === task.id}
                        onClick={() => {
                          if (task.type === 'telegram') {
                            verifyTelegramJoin(task.id, task.reward);
                          } else if (task.type === 'invite') {
                            verifyInviteTask(task.id, task.reward, task.requiredInvites || 0);
                          }
                        }}
                        className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50 min-w-[80px] flex items-center justify-center"
                      >
                        {verifyingTask === task.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Check'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const generateInviteLink = () => {
    return `https://t.me/${BOT_USERNAME}?startapp=ref_${user?.uid}`;
  };

  const shareInvite = () => {
    const link = generateInviteLink();
    const text = `Join me on SatoCryp and get 2,500 coins as a welcome bonus! 🚀`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    WebApp.openTelegramLink(shareUrl);
  };

  const copyToClipboard = () => {
    const link = generateInviteLink();
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const renderFriends = () => (
    <div className="p-5 flex flex-col gap-6 pb-24 overflow-y-auto max-h-screen">
      <div className="flex flex-col items-center text-center gap-4 mt-4">
        <div className="w-20 h-20 bg-card-bg rounded-[28px] flex items-center justify-center text-accent-gold transform rotate-6 border-b-4 border-black/20 shadow-xl">
          <Users size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Invite Squad</h2>
          <p className="text-text-secondary text-xs max-w-[280px]">Grow your community and earn rewards per user!</p>
        </div>
      </div>
      
      <div className="w-full bg-card-bg border border-white/5 p-5 rounded-3xl flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-2 p-3 bg-black/40 rounded-xl border border-dashed border-white/10 font-mono text-[10px] text-text-secondary overflow-hidden">
          <span className="truncate flex-1 text-left">{generateInviteLink()}</span>
          <button onClick={copyToClipboard} className="text-accent-gold hover:opacity-80 transition-opacity">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <button 
          onClick={shareInvite}
          className="w-full bg-accent-gold text-black py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg shadow-accent-gold/20 active:translate-y-0.5 transition-transform flex items-center justify-center gap-2"
        >
          <Users size={18} />
          Invite a Friend
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card-bg p-4 rounded-2xl border border-white/5 text-center">
            <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Total Friends</p>
            <p className="text-xl font-black text-white">{user?.referralCount || 0}</p>
        </div>
        <div className="bg-card-bg p-4 rounded-2xl border border-white/5 text-center">
            <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Earned Bonus</p>
            <p className="text-xl font-black text-accent-gold">{((user?.referralCount || 0) * 5000).toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-4">
        <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Your Referral Squad</h3>
        <div className="bg-card-bg rounded-2xl border border-white/5 overflow-hidden shadow-xl flex flex-col">
          <div className="p-3 bg-white/5 flex justify-between items-center text-[9px] uppercase font-bold text-text-secondary tracking-widest">
            <span>User</span>
            <span>Earnings</span>
          </div>
          <div className="flex flex-col">
            {myReferrals && myReferrals.length > 0 ? (
              myReferrals.map((ref, index) => (
                <div key={index} className="p-3 flex items-center justify-between border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-accent-gold/10 flex items-center justify-center text-accent-gold font-bold text-xs">
                      {ref.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate max-w-[120px]">{ref.username}</p>
                      <p className="text-[8px] text-accent-gold uppercase font-black">Lvl {ref.level}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white">
                      {Math.floor(ref.coins).toLocaleString()}
                    </span>
                    <Coins size={10} className="text-accent-gold" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-text-secondary text-xs italic">
                No friends found yet. Share your link!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLeaders = () => (
    <div className="p-5 flex flex-col gap-4 h-full overflow-hidden pb-24">
      <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">Global Elite</h2>
      <div className="bg-card-bg rounded-2xl border border-white/5 overflow-hidden shadow-xl flex flex-col flex-1 mb-2">
        <div className="p-4 bg-white/5 flex justify-between items-center text-[10px] uppercase font-bold text-text-secondary tracking-widest sticky top-0 z-10">
          <span>Rank / Player</span>
          <span>Coins</span>
        </div>
        <div className="overflow-y-auto flex-1 no-scrollbar">
          {loadingLeaders ? (
            <div className="p-10 flex justify-center">
               <div className="w-6 h-6 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : leaderboard.length > 0 ? (
            leaderboard.map((leader, index) => (
              <div key={index} className={`p-4 flex items-center justify-between border-t border-white/5 hover:bg-white/5 transition-colors ${leader.uid === user?.uid ? 'bg-accent-gold/10 border-accent-gold/20' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${index === 0 ? 'bg-accent-gold text-black' : index === 1 ? 'bg-gray-400 text-black' : index === 2 ? 'bg-amber-600 text-white' : 'text-white/40'}`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white truncate max-w-[120px]">{leader.username}</p>
                    <p className="text-[9px] text-accent-gold uppercase font-black tracking-wide">Lvl {leader.level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-black text-sm text-accent-gold italic">
                  {Math.floor(leader.coins).toLocaleString()} <Coins size={12} />
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-text-secondary text-sm italic">
              No players found yet.
            </div>
          )}
        </div>
        {/* Your position footer */}
        <div className="p-4 bg-accent-gold/20 border-t border-accent-gold/40 flex items-center justify-between sticky bottom-0 z-10">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-gold text-black flex items-center justify-center font-black text-[10px]">YOU</div>
              <p className="text-sm font-black text-white italic">{user?.username}</p>
            </div>
            <div className="flex items-center gap-1 font-black text-sm text-accent-gold italic">
              {Math.floor(user?.coins || 0).toLocaleString()} <Coins size={12} />
            </div>
        </div>
      </div>
    </div>
  );

  const renderAirdrop = () => (
    <div className="p-5 flex flex-col gap-6 pb-24 overflow-y-auto max-h-screen">
      <div className="flex flex-col items-center text-center gap-4 mt-4">
        <div className="w-20 h-20 bg-card-bg rounded-[28px] flex items-center justify-center text-accent-gold transform -rotate-3 border-b-4 border-black/20 shadow-xl">
          <Wallet size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Airdrop Tasks</h2>
          <p className="text-text-secondary text-xs max-w-[280px]">Listing is coming soon. Complete the tasks to stay qualified!</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="text-accent-blue" size={20} />
          <h2 className="text-lg font-black text-white tracking-tight uppercase italic">Requirements</h2>
        </div>
        
        <div className="bg-card-bg border border-white/5 p-4 rounded-2xl flex items-center justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-accent-gold">
              <Wallet size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Connect Wallet</h4>
              <p className="text-text-secondary text-[10px]">{user?.walletAddress ? 'Connected' : 'Wallet not found'}</p>
            </div>
          </div>
          {user?.walletAddress ? (
            <CheckCircle2 className="text-green-500" size={24} />
          ) : (
            <div className="text-accent-gold"><Info size={20} /></div>
          )}
        </div>

        <div className="bg-card-bg border border-white/5 p-4 rounded-2xl flex items-center justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-accent-blue">
               <Pickaxe size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Profit Per Hour</h4>
              <p className="text-text-secondary text-[10px]">Higher is better</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-bold text-xs">{(Math.floor((user?.passiveIncomeRate || 0) * 3600)).toLocaleString()}</p>
            <p className="text-[10px] text-accent-gold font-bold">READY</p>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-accent-gold/10 border border-accent-gold/20 p-5 rounded-3xl flex flex-col items-center text-center gap-3">
         <Trophy size={48} className="text-accent-gold animate-pulse" />
         <h4 className="text-white font-black uppercase text-sm italic">Global Leaderboard</h4>
         <p className="text-text-secondary text-[10px] leading-relaxed">Competition is tough! See how you stack up against the top players in the SatoCryp ecosystem.</p>
         <button 
           onClick={() => setActiveTab('leaders')}
           className="bg-accent-gold text-black px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest mt-2"
         >
           View Ranking
         </button>
      </div>
    </div>
  );
  const renderMine = () => {
    const categories: ('Markets' | 'PR&Team' | 'Legal' | 'Special')[] = ['Markets', 'PR&Team', 'Legal', 'Special'];
    const totalProfitPerHour = Math.floor((user?.passiveIncomeRate || 0) * 3600);

    return (
      <div className="flex flex-col h-full bg-black">
        <div className="px-5 pt-4 pb-2 flex flex-col gap-4 sticky top-0 bg-black z-20">
          {/* Stats Header */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-3 flex flex-col items-center text-center shadow-md">
              <TrendingUp size={18} className="text-accent-gold mb-1" />
              <span className="text-[9px] uppercase font-bold text-text-secondary tracking-widest">Profit per hour</span>
              <span className="text-md font-black text-white italic">+{totalProfitPerHour.toLocaleString()}</span>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-3 flex flex-col items-center text-center shadow-md">
              <Clock size={18} className="text-accent-blue mb-1" />
              <span className="text-[9px] uppercase font-bold text-text-secondary tracking-widest">Offline Limit</span>
              <span className="text-md font-black text-white italic">3 Hours</span>
            </div>
          </div>

          {/* Categories Selector */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar gap-1 custom-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                id={`cat-${cat.toLowerCase().replace(/&/g, '')}`}
                onClick={() => {
                  setMineCategory(cat);
                  hapticFeedback();
                }}
                className={`flex-1 py-2.5 px-3 rounded-lg text-[9px] uppercase tracking-widest font-black transition-all whitespace-nowrap min-w-[80px] select-none ${
                  mineCategory === cat 
                    ? 'bg-accent-gold text-black shadow-md' 
                    : 'text-text-secondary active:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid - Scrollable area */}
        <div className="flex-1 overflow-y-auto px-5 pb-32 no-scrollbar">
          <div className="grid grid-cols-2 gap-3 mt-3">
            {MINE_CARDS.filter(c => c.category === mineCategory).map(card => {
              const level = user?.mineCards?.[card.id] || 0;
              const isMaxLevel = level >= MAX_CARD_LEVEL;
              const upgradeCost = Math.floor(card.baseCost * Math.pow(1.5, level));
              
              // Calculate current profit and next level profit for display
              const calculateCardProfit = (l: number) => {
                  if (l === 0) return 0;
                  const scalingBonus = 1 + (l - 1) * 0.03 + Math.pow(l - 1, 2) * 0.004;
                  return Math.floor(card.baseProfit * l * scalingBonus);
              };
              
              const currentProfit = calculateCardProfit(level);
              const nextLevelProfit = calculateCardProfit(level + 1);
              const profitIncrease = nextLevelProfit - currentProfit;
              
              const canAfford = (user?.coins || 0) >= upgradeCost && !isMaxLevel;

              return (
                <div 
                  key={card.id}
                  id={`card-${card.id}`}
                  onClick={() => {
                      if (canAfford) buyCard(card.id);
                  }}
                  className={`bg-[#151515] rounded-[24px] border border-white/5 p-4 flex flex-col gap-3 relative overflow-hidden shadow-md transition-all duration-100 select-none touch-manipulation ${isMaxLevel ? 'opacity-80' : 'active:scale-[0.97]'}`}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-accent-gold">
                      <Pickaxe size={20} />
                    </div>
                    <div className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${isMaxLevel ? 'text-text-secondary border-white/10 bg-white/5' : 'text-accent-gold border-accent-gold/20 bg-accent-gold/10'}`}>
                      L{level}
                    </div>
                  </div>

                  <div className="relative z-10 flex-1">
                    <h4 className="text-[12px] font-black text-white leading-tight mb-1 tracking-tight truncate">{card.name}</h4>
                    <p className="text-[9px] text-text-secondary leading-tight line-clamp-2 h-[22px]">{card.description}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5 relative z-10 mt-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[8px] font-bold text-text-secondary uppercase">Profit/h</span>
                      <span className="text-[9px] font-black text-accent-gold">
                        {level === 0 ? `+${card.baseProfit}` : `+${profitIncrease.toLocaleString()}`}
                      </span>
                    </div>
                    
                    <div
                      className={`w-full py-2.5 rounded-[12px] flex items-center justify-center gap-1.5 transition-all ${
                        isMaxLevel
                          ? 'bg-white/5 text-text-secondary font-black text-[10px]'
                          : canAfford 
                            ? 'bg-accent-gold text-black font-black text-[10px] shadow-sm' 
                            : 'bg-white/5 text-text-secondary font-bold text-[10px] opacity-40'
                      }`}
                    >
                      {isMaxLevel ? (
                        <span className="uppercase tracking-widest">Max Level</span>
                      ) : (
                        <>
                          <Coins size={12} />
                          <span>
                            {upgradeCost >= 1000000 ? `${(upgradeCost/1000000).toFixed(1)}M` : upgradeCost >= 1000 ? `${(upgradeCost/1000).toFixed(1)}K` : upgradeCost.toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-white/[0.02] rounded-full blur-2xl" />
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center p-5 bg-white/5 rounded-2xl border border-white/5 mb-4">
             <Info size={18} className="mx-auto text-text-secondary mb-2" />
             <p className="text-[10px] text-text-secondary font-medium leading-relaxed">
               Upgrading cards increases your <span className="text-white font-bold">Profit Per Hour</span>. 
               Coins are collected automatically for up to <span className="text-white font-bold">3 hours</span> while you are offline.
             </p>
          </div>
        </div>
      </div>
    );
  };

  if (isAdminPath) {
    return <AdminPanel />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-[#f3ba2f] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#f3ba2f] font-bold uppercase tracking-widest text-xs">SatoCryp Initializing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-text-primary font-sans selection:bg-accent-gold/30">
      <div className="w-full min-h-screen bg-bg-main relative flex flex-col overflow-hidden">
        <Header user={user} syncing={syncing} setUser={setUser} />
        
        <main className="flex-1 h-0 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-hidden"
            >
              {activeTab === 'home' && <div className="h-full overflow-y-auto pb-24 no-scrollbar">{renderHome()}</div>}
              {activeTab === 'mine' && renderMine()}
              {activeTab === 'tasks' && <div className="h-full overflow-y-auto pb-24 no-scrollbar">{renderTasks()}</div>}
              {activeTab === 'friends' && <div className="h-full overflow-y-auto pb-24 no-scrollbar">{renderFriends()}</div>}
              {activeTab === 'airdrop' && <div className="h-full overflow-y-auto pb-24 no-scrollbar">{renderAirdrop()}</div>}
              {activeTab === 'leaders' && renderLeaders()}
            </motion.div>
          </AnimatePresence>
        </main>

        <Navigation active={activeTab} setActive={setActiveTab} />
      </div>

      {/* Daily Reward Modal */}
      <AnimatePresence>
        {showDaily && (
          <div 
            onClick={() => setShowDaily(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1f24] w-full max-w-sm rounded-3xl border border-[#f3ba2f]/30 p-8 flex flex-col items-center text-center gap-6"
            >
              <div className="w-20 h-20 bg-[#f3ba2f]/20 rounded-full flex items-center justify-center text-[#f3ba2f] animate-bounce">
                <Trophy size={40} />
              </div>
              <div>
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Daily Bonus!</h2>
                <p className="text-white/60 text-sm">Day {user?.dailyStreak + 1} of your streak</p>
              </div>
              
              <div className="bg-black/40 w-full py-4 rounded-2xl border border-gray-800">
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-2 text-[#f3ba2f] text-3xl font-black">
                    +{(DAILY_REWARD_BASE + (user?.dailyStreak || 0) * DAILY_REWARD_STEP).toLocaleString()} <Coins size={28} />
                  </div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                    Streak Bonus Included
                  </p>
                </div>
              </div>

              <button 
                onClick={claimDaily}
                className="w-full bg-[#f3ba2f] text-black py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-[#f3ba2f]/20"
              >
                Claim Reward
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Level Up Modal */}
      <AnimatePresence>
        {showLevelUp && (
          <div 
            onClick={() => setShowLevelUp(false)}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card-bg w-full max-w-sm rounded-[32px] border border-white/10 flex flex-col shadow-2xl relative max-h-[90vh] overflow-hidden"
            >
              <div className="absolute top-4 right-4 z-20">
                <button 
                  onClick={() => setShowLevelUp(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-text-secondary transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="flex flex-col items-center gap-4 text-center mb-6">
                  <div className="w-20 h-20 bg-accent-gold/20 rounded-[28px] flex items-center justify-center text-accent-gold shadow-lg shadow-accent-gold/10 mt-2">
                    <Trophy size={40} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic text-white leading-tight">LEVEL UPGRADE</h3>
                    <p className="text-text-secondary text-sm">Enhance your tapping power</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Current</p>
                    <p className="text-lg font-black text-white">{currentLevelInfo.name}</p>
                 </div>
                 <div className="p-4 bg-accent-gold/10 rounded-2xl border border-accent-gold/20 text-center">
                    <p className="text-[10px] text-accent-gold uppercase font-bold mb-1">Next</p>
                    <p className="text-lg font-black text-accent-gold">{nextLevel ? nextLevel.name : 'MAX'}</p>
                 </div>
              </div>

              {nextLevel ? (
                <>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-secondary">Tap Value</span>
                      <span className="text-white font-bold">+{currentLevelInfo.tapValue} → <span className="text-accent-gold">+{nextLevel.tapValue}</span></span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-secondary">Profit per Hour</span>
                      <span className="text-white font-bold">{(currentLevelInfo.passiveRate * 3600).toLocaleString()} → <span className="text-accent-gold">{(nextLevel.passiveRate * 3600).toLocaleString()}</span></span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-secondary">Max Energy</span>
                      <span className="text-white font-bold">{currentLevelInfo.maxEnergy.toLocaleString()} → <span className="text-accent-gold">{nextLevel.maxEnergy.toLocaleString()}</span></span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-secondary">Upgrade Cost</span>
                      <span className="text-accent-gold font-black flex items-center gap-1">
                        {nextLevel.upgradeCost.toLocaleString()} <Coins size={14} />
                      </span>
                    </div>
                  </div>

                  {/* Level Roadmap */}
                  <div className="flex flex-col gap-2 mt-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar bg-black/20 p-3 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-text-secondary uppercase font-black sticky top-0 bg-transparent py-1 backdrop-blur-sm">Roadmap (Available Levels)</p>
                    {LEVELS.map((lvl) => (
                      <div key={lvl.level} className={`flex justify-between items-center p-2 rounded-lg text-[10px] ${lvl.level === user?.level ? 'bg-accent-gold/20' : 'bg-black/20'}`}>
                        <div className="flex items-center gap-2">
                           <span className={lvl.level <= (user?.level || 1) ? 'text-accent-gold' : 'text-text-secondary'}>#{lvl.level}</span>
                           <span className="font-bold text-white uppercase">{lvl.name}</span>
                        </div>
                        <span className="text-accent-gold font-bold">+{lvl.tapValue} Tap / {(lvl.passiveRate * 3600).toLocaleString()} PPH</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={handleLevelUp}
                    disabled={(user?.coins || 0) < nextLevel.upgradeCost}
                    className="w-full bg-accent-gold text-black py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-accent-gold/20 active:translate-y-0.5 transition-all disabled:opacity-30 disabled:scale-100 mt-4"
                  >
                    Upgrade Level
                  </button>
                </>
              ) : (
                <div className="text-center p-6 bg-accent-gold/5 rounded-2xl border border-accent-gold/10 font-bold text-accent-gold">
                  You are at the Maximum Level! 🏆
                </div>
              )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Boosts Modal */}
      <AnimatePresence>
        {showBoosts && (
          <div 
            onClick={() => setShowBoosts(false)}
            className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-card-bg w-full max-w-lg rounded-t-[40px] border-t border-white/10 p-8 flex flex-col shadow-2xl relative max-h-[85vh] overflow-hidden pb-12"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
              
              <div className="flex flex-col items-center gap-2 text-center mb-8">
                <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter">Boost Your Progress</h3>
                <p className="text-text-secondary text-sm">Upgrade your stats or refill your energy</p>
              </div>

              <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {/* Free Boosts */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Free Daily Boosts</h4>
                  <button 
                    onClick={fullRefill}
                    disabled={!user || (user.boosts?.refillsToday || 0) >= 6}
                    className="bg-secondary-bg border border-white/5 p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent-blue/20 rounded-xl flex items-center justify-center text-accent-blue">
                        <Zap size={24} fill="currentColor" />
                      </div>
                      <div className="text-left">
                        <h5 className="text-white font-bold text-sm">Full Energy</h5>
                        <p className="text-text-secondary text-[10px]">{6 - (user?.boosts?.refillsToday || 0)} / 6 available</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-text-secondary" />
                  </button>
                </div>

                {/* Paid Boosts */}
                <div className="flex flex-col gap-3 mt-4">
                  <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Stat Upgrades</h4>
                  
                  {[
                    { type: 'multiTap', name: 'Multitap', icon: <Sparkles size={24} />, desc: 'Increase coins per tap' },
                    { type: 'energyLimit', name: 'Energy Limit', icon: <Zap size={24} />, desc: '+500 max energy per level' },
                    { type: 'rechargeSpeed', name: 'Recharging Speed', icon: <Clock size={24} />, desc: 'Faster energy refill' }
                  ].map((boost) => {
                    const level = user?.boosts?.[boost.type as keyof typeof user.boosts] || 1;
                    const cost = BOOST_COSTS[boost.type as keyof typeof BOOST_COSTS] * Math.pow(2.5, level - 1);
                    const canAfford = (user?.coins || 0) >= cost;

                    return (
                      <button 
                        key={boost.type}
                        onClick={() => upgradeBoost(boost.type as any)}
                        disabled={!canAfford}
                        className="bg-secondary-bg border border-white/5 p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-accent-gold/20 rounded-xl flex items-center justify-center text-accent-gold">
                            {boost.icon}
                          </div>
                          <div className="text-left">
                            <h5 className="text-white font-bold text-sm">{boost.name}</h5>
                            <div className="flex items-center gap-2">
                               <span className="text-accent-gold text-xs font-black italic">{Math.floor(cost).toLocaleString()} <Coins size={12} className="inline mb-0.5" /></span>
                               <span className="text-text-secondary text-[10px]">• Lvl {level}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-text-secondary" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Daily Cipher Modal */}
      <AnimatePresence>
        {showCipher && (
          <div 
            onClick={() => setShowCipher(false)}
            className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1f24] w-full max-w-sm rounded-[32px] border border-accent-blue/30 p-8 flex flex-col items-center text-center gap-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setShowCipher(false)} className="text-white/20 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="w-20 h-20 bg-accent-blue/20 rounded-[24px] flex items-center justify-center text-accent-blue shadow-lg shadow-accent-blue/10">
                <Brain size={40} />
              </div>
              
              <div>
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Daily Cipher</h2>
                <p className="text-text-secondary text-xs mt-1">Decode the secret word to win big!</p>
              </div>

              {user?.dailyCipher?.isCompleted ? (
                <div className="w-full bg-green-500/10 border border-green-500/20 py-6 rounded-2xl flex flex-col items-center gap-2">
                   <CheckCircle2 size={32} className="text-green-500" />
                   <p className="text-green-500 font-black uppercase text-sm">Reward Claimed!</p>
                   <p className="text-white font-bold">+{DAILY_CIPHER_REWARD.toLocaleString()} <Coins size={14} className="inline mb-1" /></p>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <input 
                      type="text" 
                      value={cipherInput}
                      onChange={(e) => setCipherInput(e.target.value.toUpperCase())}
                      placeholder="ENTER SECRET WORD"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-center text-white font-black tracking-[0.2em] placeholder:text-white/10 focus:outline-none focus:border-accent-blue/50 transition-all"
                    />
                    <p className="text-[10px] text-text-secondary uppercase font-bold text-center">Hint: Check our TG Channel</p>
                  </div>

                  <button 
                    onClick={() => {
                      const correctWord = settings?.dailyCipherWord || user?.dailyCipher?.word || 'SATO';
                      if (cipherInput.toUpperCase() === correctWord.toUpperCase()) {
                        setCipherStatus('success');
                        claimCipher();
                        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#00a3ff', '#ffffff'] });
                        setTimeout(() => {
                           setShowCipher(false);
                           setCipherInput('');
                        }, 2000);
                      } else {
                        setCipherStatus('error');
                        WebApp.HapticFeedback.notificationOccurred('error');
                        setTimeout(() => setCipherStatus('idle'), 1000);
                      }
                    }}
                    className={`w-full py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all ${
                      cipherStatus === 'success' ? 'bg-green-500 text-white' : 
                      cipherStatus === 'error' ? 'bg-red-500 text-white animate-shake' : 
                      'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
                    }`}
                  >
                    {cipherStatus === 'success' ? 'DECODED!' : cipherStatus === 'error' ? 'WRONG WORD' : 'VERIFY WORD'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Daily Combo Modal */}
      <AnimatePresence>
        {showCombo && (
          <div 
            onClick={() => setShowCombo(false)}
            className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1f24] w-full max-w-sm rounded-[32px] border border-purple-500/30 p-8 flex flex-col items-center text-center gap-6 shadow-2xl relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setShowCombo(false)} className="text-white/20 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="w-20 h-20 bg-purple-500/20 rounded-[24px] flex items-center justify-center text-purple-500 shadow-lg shadow-purple-500/10">
                <LayoutGrid size={40} />
              </div>

              <div>
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Daily Combo</h2>
                <p className="text-text-secondary text-xs mt-1">Collect today's special cards</p>
              </div>

              {user?.dailyCombo?.claimed ? (
                <div className="w-full bg-green-500/10 border border-green-500/20 py-6 rounded-2xl flex flex-col items-center gap-2">
                   <CheckCircle2 size={32} className="text-green-500" />
                   <p className="text-green-500 font-black uppercase text-sm">Combo Complete!</p>
                   <p className="text-white font-bold">+{DAILY_COMBO_REWARD.toLocaleString()} <Coins size={14} className="inline mb-1" /></p>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-6">
                  <div className="flex justify-center gap-3">
                    {[1, 2, 3].map((i) => {
                      const isFound = (user?.dailyCombo?.cards?.length || 0) >= i;
                      return (
                        <div key={i} className={`w-16 h-20 rounded-xl flex items-center justify-center transition-all ${isFound ? 'bg-purple-500/30 border-2 border-purple-500 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-black/40 border border-dashed border-white/10 text-white/5'}`}>
                           {isFound ? <Sparkles size={24} /> : <Pickaxe size={24} />}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-text-secondary uppercase font-bold leading-relaxed px-4">
                    Find the 3 secret cards in the Mine tab to unlock today's bounty! Progress: {user?.dailyCombo?.cards?.length || 0}/3
                  </p>

                  <button 
                    disabled={(user?.dailyCombo?.cards?.length || 0) < 3}
                    onClick={() => {
                        claimCombo();
                        setShowCombo(false);
                    }}
                    className={`w-full py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all ${
                        (user?.dailyCombo?.cards?.length || 0) >= 3 
                        ? 'bg-purple-500 text-white shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-95' 
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {(user?.dailyCombo?.cards?.length || 0) >= 3 ? 'Claim Bounty' : 'Incomplete'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

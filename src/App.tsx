import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import { useGame } from './hooks/useGame';
import { Navigation, Header } from './components/Navigation';
import { Zap, Coins, Users, Trophy, Wallet, CheckCircle2, ChevronRight, PlayCircle, Copy, Check } from 'lucide-react';
import { TASKS, DAILY_REWARD_BASE, DAILY_REWARD_STEP, COINS_PER_TAP, BOT_USERNAME, LEVELS } from './lib/constants';
import confetti from 'canvas-confetti';
import WebApp from '@twa-dev/sdk';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { LeaderboardEntry } from './types/game';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const { user, loading, syncing, tap, levelUp, setUser, myReferrals } = useGame(activeTab);

  useEffect(() => {
    // Other initializations can go here
  }, []);
  
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
  const [taps, setTaps] = useState<{ id: number; x: number; y: number; value: number }[]>([]);
  const [showDaily, setShowDaily] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [adCooldown, setAdCooldown] = useState(0);
  const [copied, setCopied] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
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
    if (!user) return;
    
    const now = new Date();
    let newStreak = (user.dailyStreak || 0) + 1;
    
    // Safety check again for streak reset
    if (user.lastDailyReward) {
      const last = new Date(user.lastDailyReward);
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      
      const wasConsecutive = 
        last.getFullYear() === yesterday.getFullYear() &&
        last.getMonth() === yesterday.getMonth() &&
        last.getDate() === yesterday.getDate();

      if (!wasConsecutive) {
        newStreak = 1; // Reset to 1 on claim if broken
      }
    }

    const reward = DAILY_REWARD_BASE + (newStreak - 1) * DAILY_REWARD_STEP;
    
    const updatedUser = {
      ...user,
      coins: user.coins + reward,
      totalCoins: user.totalCoins + reward,
      lastDailyReward: Date.now(),
      dailyStreak: newStreak
    };

    setUser(updatedUser);

    // Immediate persistence to prevent repeat popups on refresh
    try {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        coins: Math.floor(updatedUser.coins),
        totalCoins: Math.floor(updatedUser.totalCoins),
        lastDailyReward: updatedUser.lastDailyReward,
        dailyStreak: updatedUser.dailyStreak
      });
    } catch (err) {
      console.error('Failed to save daily reward:', err);
    }

    setShowDaily(false);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f3ba2f', '#e19c00', '#ffffff']
    });
    WebApp.HapticFeedback.notificationOccurred('success');
  };


  const watchAd = (taskId: string) => {
    if (adCooldown > 0) return;
    if (typeof (window as any).show_10932949 !== 'function') {
      alert("Ads SDK is loading, please try again in a moment.");
      return;
    }
    
    const task = TASKS.find(t => t.id === taskId);
    if (!task) return;

    // Safety timeout for ad call to prevent "adex timeout" hanging
    const adPromise = taskId === 'ad_popup' ? (window as any).show_10932949('pop') : (window as any).show_10932949();
    
    // Create a timeout promise - increased to 60s for better tolerance
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Ad load timeout')), 60000)
    );

    Promise.race([adPromise, timeoutPromise]).then(() => {
      // Reward user
      setUser(prev => prev ? ({
        ...prev,
        coins: prev.coins + task.reward,
        totalCoins: prev.totalCoins + task.reward,
        completedTasks: [...prev.completedTasks, taskId]
      }) : null);
      
      confetti({
        particleCount: 100,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#f3ba2f', '#ffffff']
      });

      WebApp.HapticFeedback.notificationOccurred('success');
      
      // Still set a small cooldown to prevent spamming
      setAdCooldown(10);
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

    // Get exact coordinates from pointer event
    const clientX = e.clientX;
    const clientY = e.clientY;

    const currentLevel = LEVELS.find(l => l.level === user.level) || LEVELS[0];

    const newTap = { id: Math.random() + performance.now(), x: clientX, y: clientY, value: currentLevel.tapValue };
    setTaps((prev) => [...prev, newTap]);
    setTimeout(() => {
      setTaps((prev) => prev.filter((t) => t.id !== newTap.id));
    }, 700);
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
          <div className="text-sm font-bold text-accent-gold">+{(currentLevelInfo.passiveRate * 3600).toLocaleString()}</div>
        </div>
      </div>

      {/* Tap Main Area */}
      <div className="flex-1 flex flex-col items-center justify-center pt-4">
        <div className="text-center mb-8">
          <div className="text-sm text-text-secondary uppercase tracking-widest mb-1.5 font-medium">Total Balance</div>
          <h1 className="text-[42px] font-bold flex items-center justify-center gap-2.5 leading-none">
            <div className="w-10 h-10 bg-accent-gold rounded-full coin-icon-shadow border-2 border-white/20 flex items-center justify-center text-black/60 text-xl font-black shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_0_15px_rgba(243,186,47,0.3)]">S</div>
            <motion.span>{roundedCoins}</motion.span>
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
                animate={{ opacity: 0, y: -100 }}
                exit={{ opacity: 0 }}
                className="fixed pointer-events-none text-white font-black text-3xl z-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] select-none"
                style={{ left: t.x - 20, top: t.y - 40 }}
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
          <div className="flex items-center gap-1.5 uppercase tracking-tight">
             ⚡ {Math.floor(user?.energy || 0)} / {user?.maxEnergy}
          </div>
          <button className="text-accent-blue font-black uppercase text-[11px] tracking-widest hover:opacity-80 transition-opacity">
            Boost
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

  const renderTasks = () => (
    <div className="p-5 flex flex-col gap-4 pb-20 overflow-y-auto max-h-screen">
      <h2 className="text-2xl font-bold text-white tracking-tight italic">Tasks & Rewards</h2>
      <div className="grid gap-3">
        {TASKS.map((task) => {
          const isCompleted = user?.completedTasks.includes(task.id);
          return (
            <div key={task.id} className={`bg-card-bg border border-white/5 p-4 rounded-2xl flex items-center justify-between group ${isCompleted ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-accent-gold">
                  {task.type === 'telegram' ? <Users size={24} /> : <PlayCircle size={24} />}
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm leading-tight mb-1">{task.title}</h4>
                  <div className="flex items-center gap-1.5 text-accent-gold text-xs font-black italic">
                     +{task.reward.toLocaleString()} <Coins size={12} />
                  </div>
                </div>
              </div>
              <button 
                disabled={isCompleted || (task.type === 'ads' && adCooldown > 0)}
                onClick={() => task.type === 'ads' ? watchAd(task.id) : window.open(task.link, '_blank')}
                className={`${isCompleted ? 'bg-gray-700 text-gray-400' : 'bg-accent-gold text-black'} px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all disabled:scale-100`}
              >
                {isCompleted ? 'Done' : task.type === 'ads' && adCooldown > 0 ? `${adCooldown}s` : 'Start'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

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
        
        <main className="flex-1 flex flex-col pb-24 h-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'home' && renderHome()}
              {activeTab === 'tasks' && renderTasks()}
              {activeTab === 'friends' && renderFriends()}
              {activeTab === 'leaders' && (
                <div className="p-5 flex flex-col gap-4">
                  <h2 className="text-2xl font-bold text-white tracking-tight italic">Global Elite</h2>
                  <div className="bg-card-bg rounded-2xl border border-white/5 overflow-hidden shadow-xl flex flex-col max-h-[70vh]">
                    <div className="p-4 bg-white/5 flex justify-between items-center text-[10px] uppercase font-bold text-text-secondary tracking-widest sticky top-0 z-10 backdrop-blur-md">
                      <span>Rank / Player</span>
                      <span>Coins</span>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {loadingLeaders ? (
                        <div className="p-10 flex justify-center">
                           <div className="w-6 h-6 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : leaderboard.length > 0 ? (
                        leaderboard.map((leader, index) => (
                          <div key={index} className="p-4 flex items-center justify-between border-t border-white/5 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${index === 0 ? 'bg-accent-gold text-black' : index === 1 ? 'bg-gray-400 text-black' : index === 2 ? 'bg-amber-600 text-white' : 'text-white/40'}`}>
                                {index + 1}
                              </span>
                              <div>
                                <p className="text-sm font-bold text-white truncate max-w-[120px]">{leader.username}</p>
                                <p className="text-[9px] text-accent-gold uppercase font-black">Lvl {leader.level}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 font-black text-sm text-accent-gold">
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
                    <div className="p-4 bg-accent-gold/10 border-t-2 border-accent-gold/40 flex items-center justify-between sticky bottom-0 z-10 backdrop-blur-md">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-accent-gold text-black flex items-center justify-center font-bold text-[10px]">YOU</div>
                          <p className="text-sm font-bold text-white italic">{user?.username}</p>
                        </div>
                        <div className="flex items-center gap-1 font-black text-sm text-accent-gold">
                          {Math.floor(user?.coins || 0).toLocaleString()} <Coins size={12} />
                        </div>
                    </div>
                  </div>
                </div>
              )}
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
              className="bg-card-bg w-full max-w-sm rounded-[32px] border border-white/10 p-6 flex flex-col gap-5 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button 
                onClick={() => setShowLevelUp(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-full text-text-secondary"
              >
                <CheckCircle2 size={24} className="rotate-45" />
              </button>

              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 bg-accent-gold/20 rounded-[28px] flex items-center justify-center text-accent-gold shadow-lg shadow-accent-gold/10">
                  <Trophy size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-black italic text-white leading-tight">LEVEL UPGRADE</h3>
                  <p className="text-text-secondary text-sm">Enhance your tapping power</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <div className="flex flex-col gap-2 mt-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                    <p className="text-[10px] text-text-secondary uppercase font-black sticky top-0 bg-card-bg py-1">Roadmap (Available Levels)</p>
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from './hooks/useGame';
import { Navigation, Header } from './components/Navigation';
import { Zap, Coins, Users, Trophy, Wallet, CheckCircle2, ChevronRight, PlayCircle, Copy, Check } from 'lucide-react';
import { TASKS, DAILY_REWARDS, COINS_PER_TAP, BOT_USERNAME } from './lib/constants';
import confetti from 'canvas-confetti';
import WebApp from '@twa-dev/sdk';

export default function App() {
  const { user, loading, syncing, tap, setUser } = useGame();
  const [activeTab, setActiveTab] = useState('home');
  const [taps, setTaps] = useState<{ id: number; x: number; y: number }[]>([]);
  const [showDaily, setShowDaily] = useState(false);
  const [adCooldown, setAdCooldown] = useState(0);
  const [copied, setCopied] = useState(false);
  const tapContainerRef = useRef<HTMLDivElement>(null);

  // Daily Reward Check
  useEffect(() => {
    if (user && !user.lastDailyReward) {
      setShowDaily(true);
    } else if (user?.lastDailyReward) {
      const last = new Date(user.lastDailyReward);
      const now = new Date();
      if (last.getDate() !== now.getDate()) {
        setShowDaily(true);
      }
    }
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-[#f3ba2f] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#f3ba2f] font-bold uppercase tracking-widest text-xs">CryptoPulse Initializing...</p>
      </div>
    );
  }

  const claimDaily = () => {
    if (!user) return;
    const reward = DAILY_REWARDS[user.dailyStreak % DAILY_REWARDS.length];
    setUser(prev => prev ? ({
      ...prev,
      coins: prev.coins + reward,
      totalCoins: prev.totalCoins + reward,
      lastDailyReward: Date.now(),
      dailyStreak: prev.dailyStreak + 1
    }) : null);
    setShowDaily(false);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f3ba2f', '#e19c00', '#ffffff']
    });
  };

  const watchAd = (taskId: string) => {
    if (adCooldown > 0) return;
    
    // Simulate Ad Watch
    setAdCooldown(30); // 30s cooldown
    const timer = setInterval(() => {
      setAdCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const task = TASKS.find(t => t.id === taskId);
    if (task) {
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
        colors: ['#f3ba2f']
      });
    }
  };

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (!user || user.energy < 1) return;
    
    tap();

    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

    const newTap = { id: Date.now(), x: clientX, y: clientY };
    setTaps((prev) => [...prev, newTap]);
    setTimeout(() => {
      setTaps((prev) => prev.filter((t) => t.id !== newTap.id));
    }, 700);
  };

  const renderHome = () => (
    <div className="flex flex-col gap-6 w-full">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5 px-5 mt-2.5">
        <div className="bg-card-bg p-3 rounded-2xl text-center border-b-2 border-white/5">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 font-medium">Profit per hour</div>
          <div className="text-sm font-bold text-accent-gold">+{((user?.passiveIncomeRate || 1) * 3600).toLocaleString()}</div>
        </div>
        <div className="bg-card-bg p-3 rounded-2xl text-center border-b-2 border-white/5">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 font-medium">Tap Value</div>
          <div className="text-sm font-bold text-accent-gold">+{COINS_PER_TAP}</div>
        </div>
      </div>

      {/* Tap Main Area */}
      <div className="flex-1 flex flex-col items-center justify-center pt-4">
        <div className="text-center mb-8">
          <div className="text-sm text-text-secondary uppercase tracking-widest mb-1.5 font-medium">Total Balance</div>
          <h1 className="text-[42px] font-bold flex items-center justify-center gap-2.5 leading-none">
            <div className="w-10 h-10 bg-accent-gold rounded-full coin-icon-shadow border-2 border-white/10" />
            {Math.floor(user?.coins || 0).toLocaleString()}
          </h1>
        </div>

        <div className="relative" ref={tapContainerRef}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleTap}
            onTouchStart={handleTap}
            className="w-[240px] h-[240px] bg-radial-[circle_at_center,_var(--color-bg-main)_0%,_#1c212b_100%] rounded-full flex items-center justify-center border-[12px] border-[#252b36] tap-button-shadow group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-accent-gold/5 group-active:opacity-20 transition-opacity" />
            <div className="w-[160px] h-[160px] bg-[#363d4a] rounded-[40px] rotate-45 flex items-center justify-center overflow-hidden">
               <div className="-rotate-45 relative w-full h-full flex items-center justify-center">
                <img 
                  src="https://picsum.photos/seed/cryptopulse_tap/500/500" 
                  alt="CryptoPulse" 
                  className="w-[180%] h-[180%] object-cover select-none pointer-events-none opacity-80"
                  referrerPolicy="no-referrer"
                />
               </div>
            </div>
          </motion.button>

          {/* Floating Numbers */}
          <AnimatePresence>
            {taps.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 1, y: t.y - 150, x: t.x - 20 }}
                animate={{ opacity: 0, y: t.y - 250 }}
                exit={{ opacity: 0 }}
                className="fixed pointer-events-none text-white font-black text-3xl z-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                style={{ left: t.x, top: t.y }}
              >
                +{COINS_PER_TAP}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-black/10 mx-5 py-2 px-3 rounded-xl text-[11px] text-text-secondary flex justify-center gap-2 font-medium">
        <span className="text-accent-blue font-bold">Live:</span>
        <motion.div
           animate={{ opacity: [0.6, 1, 0.6] }}
           transition={{ duration: 2, repeat: Infinity }}
        >
          User @cryptoking earned 500 coins • 2s ago
        </motion.div>
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
    const text = `Join me on CryptoPulse and get 2,500 coins as a welcome bonus! 🚀`;
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
    <div className="p-5 flex flex-col items-center justify-center gap-8 min-h-[70vh] text-center">
      <div className="w-24 h-24 bg-card-bg rounded-[32px] flex items-center justify-center text-accent-gold mb-2 transform rotate-6 border-b-4 border-black/20 shadow-xl">
        <Users size={48} />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-white italic tracking-tighter mb-2">Invite Squad</h2>
        <p className="text-text-secondary text-sm max-w-[280px]">Grow your community and earn <span className="text-accent-gold font-bold">+5,000</span> per user!</p>
      </div>
      
      <div className="w-full max-w-[340px] bg-card-bg border border-white/5 p-6 rounded-3xl flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center gap-2 p-4 bg-black/40 rounded-2xl border border-dashed border-white/10 font-mono text-[11px] text-text-secondary overflow-hidden">
          <span className="truncate flex-1 text-left">{generateInviteLink()}</span>
          <button onClick={copyToClipboard} className="text-accent-gold hover:opacity-80 transition-opacity">
            {copied ? <Check size={16} /> : <Copy size={16} />}
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

      <div className="mt-4 text-left w-full">
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">Active Friends</h3>
          <span className="text-accent-gold font-bold text-sm">{user?.referralCount}</span>
        </div>
        <div className="bg-card-bg rounded-2xl border border-white/5 p-5 text-text-secondary text-xs italic text-center">
           {user && user.referralCount > 0 
             ? `You have successfully invited ${user.referralCount} friends!` 
             : "No referrals found. Invite friends to start earning!"}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main text-text-primary font-sans selection:bg-accent-gold/30 flex flex-col items-center">
      <div className="w-full max-w-[390px] min-h-screen bg-bg-main relative flex flex-col overflow-hidden shadow-2xl">
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
                  <h2 className="text-2xl font-bold text-white tracking-tight">Leaderboard</h2>
                  <div className="bg-card-bg rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                    <div className="p-4 bg-white/5 flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">Rank / Player</span>
                      <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">Coins</span>
                    </div>
                    {[
                      { rank: 1, name: 'CryptoWhale', coins: 14500000, level: 5 },
                      { rank: 2, name: 'TapperGod', coins: 12000000, level: 5 },
                      { rank: 3, name: 'HamsterBoss', coins: 9500000, level: 4 },
                      { rank: 4, name: 'MiniAppKing', coins: 7200000, level: 4 },
                      { rank: 5, name: 'SolanaFarmer', coins: 4100000, level: 3 },
                    ].map((leader) => (
                      <div key={leader.rank} className="p-4 flex items-center justify-between border-t border-white/5 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${leader.rank === 1 ? 'bg-accent-gold text-black' : leader.rank === 2 ? 'bg-gray-400 text-black' : leader.rank === 3 ? 'bg-amber-600 text-white' : 'text-white/40'}`}>
                            {leader.rank}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-white">{leader.name}</p>
                            <p className="text-[9px] text-accent-gold uppercase font-black">Lvl {leader.level}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 font-black text-sm text-accent-gold">
                          {leader.coins.toLocaleString()} <Coins size={12} />
                        </div>
                      </div>
                    ))}
                    {/* Your position */}
                    <div className="p-4 bg-accent-gold/10 border-t-2 border-accent-gold/40 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-accent-gold text-black flex items-center justify-center font-bold text-[10px]">#45k</span>
                          <p className="text-sm font-bold text-white italic">You ({user?.username})</p>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
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
                <div className="flex items-center justify-center gap-2 text-[#f3ba2f] text-3xl font-black">
                  +{DAILY_REWARDS[user?.dailyStreak % DAILY_REWARDS.length].toLocaleString()} <Coins size={28} />
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

      {/* Fake Activity Feed */}
      <div className="fixed bottom-24 left-4 right-4 z-30 pointer-events-none overflow-hidden h-6 bg-black/5 rounded-lg flex items-center justify-center">
        <motion.div
          animate={{ x: [-200, 400] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="whitespace-nowrap italic text-[10px] text-text-secondary font-bold uppercase tracking-widest"
        >
          User @cryptoking earned 500 coins • @MegaHamster reached Level 4 • @TapperPros connected wallet •
        </motion.div>
      </div>
    </div>
  );
}

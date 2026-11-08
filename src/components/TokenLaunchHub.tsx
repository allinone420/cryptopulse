import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Calendar, PieChart, Coins, Lock, CheckCircle2, ChevronRight, 
  Sparkles, ExternalLink, ShieldCheck, Clock, ArrowUpRight, TrendingUp,
  AlertCircle, Wallet, Info, Check, RefreshCw
} from 'lucide-react';
import { UserData } from '../types/game';
import { TOKEN_CONFIG, AIRDROP_CONFIG } from '../lib/constants';
import WebApp from '@twa-dev/sdk';
import { useTonConnectUI } from '@tonconnect/ui-react';

interface TokenLaunchHubProps {
  user: UserData;
  onVerifyClick: () => void;
  stakeTokens: (poolId: string, amount: number, durationDays: number, apy: number) => Promise<{ success: boolean; message: string }>;
  claimStakingYield: (poolId: string) => Promise<{ success: boolean; amount?: number; message?: string }>;
  unstakeTokens: (poolId: string) => Promise<{ success: boolean; returned?: number; message?: string }>;
  claimAirdropTokens: (amount: number) => Promise<{ success: boolean; message: string }>;
}

export default function TokenLaunchHub({
  user,
  onVerifyClick,
  stakeTokens,
  claimStakingYield,
  unstakeTokens,
  claimAirdropTokens
}: TokenLaunchHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<'allocation' | 'roadmap' | 'tokenomics' | 'staking' | 'claim'>('allocation');
  const [tonConnectUI] = useTonConnectUI();
  
  // Staking Modal State
  const [selectedPool, setSelectedPool] = useState<any>(null);
  const [stakeAmountInput, setStakeAmountInput] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [stakingStatusMsg, setStakingStatusMsg] = useState<string | null>(null);

  // Claim Modal State
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatusMsg, setClaimStatusMsg] = useState<string | null>(null);

  // Live Countdown State
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const updateCountdown = () => {
      const target = TOKEN_CONFIG.TGE_TARGET_TIMESTAMP;
      const now = Date.now();
      const diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const haptic = () => {
    try {
      WebApp?.HapticFeedback?.impactOccurred('light');
    } catch (e) {}
  };

  // Dynamic Token Allocation Calculation
  const coinsWeight = (user.coins || 0) * 0.0005;
  const pphPerHour = Math.floor((user.passiveIncomeRate || 0) * 3600);
  const pphWeight = (pphPerHour / 100) * 1.5;
  const referralBonus = (user.referralCount || 0) * 250;
  const taskBonus = (user.completedTasks?.length || 0) * 100;
  const streakBonus = (user.dailyStreak || 0) * 150;
  
  const rawScore = coinsWeight + pphWeight + referralBonus + taskBonus + streakBonus;
  const verificationMultiplier = user.isVerified ? 1.5 : 0.8;
  const estimatedSatoTokens = Math.max(500, Math.floor(rawScore * verificationMultiplier));
  const estimatedUsdVal = (estimatedSatoTokens * TOKEN_CONFIG.ESTIMATED_LISTING_PRICE_USD).toFixed(2);
  const availableToClaim = Math.max(0, estimatedSatoTokens - (user.claimedTokens || 0));

  // Handle Stake Submit
  const handleStakeSubmit = async () => {
    if (!selectedPool) return;
    const amount = parseInt(stakeAmountInput, 10);
    if (isNaN(amount) || amount < selectedPool.minStake) {
      alert(`Minimum stake amount is ${selectedPool.minStake.toLocaleString()} $SATO`);
      return;
    }
    if (amount > estimatedSatoTokens) {
      alert(`You can only stake up to your total allocated $SATO balance (${estimatedSatoTokens.toLocaleString()} $SATO)`);
      return;
    }

    setIsStaking(true);
    setStakingStatusMsg('Locking tokens in smart vault...');
    const res = await stakeTokens(selectedPool.id, amount, selectedPool.durationDays, selectedPool.apy);
    setIsStaking(false);
    if (res.success) {
      setStakingStatusMsg(res.message);
      setTimeout(() => {
        setSelectedPool(null);
        setStakeAmountInput('');
        setStakingStatusMsg(null);
      }, 1500);
    } else {
      alert(res.message);
    }
  };

  // Handle Claim
  const handleClaimSubmit = async () => {
    if (!user.walletAddress && !tonConnectUI.account) {
      alert("Please connect your TON wallet first using the Connect button!");
      return;
    }
    if (!user.isVerified) {
      alert("Please complete identity verification to claim your TGE allocation.");
      onVerifyClick();
      return;
    }
    if (availableToClaim <= 0) {
      alert("You have already claimed all your available $SATO tokens!");
      return;
    }

    setIsClaiming(true);
    setClaimStatusMsg('Broadcasting claim request to TON Network...');
    
    // Simulate transaction / trigger claim
    setTimeout(async () => {
      const res = await claimAirdropTokens(availableToClaim);
      setIsClaiming(false);
      setClaimStatusMsg(res.message);
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-5 w-full pb-28 pt-2">
      {/* Top Banner & Countdown Header */}
      <div className="bg-gradient-to-b from-[#1c212b] to-[#12161f] border border-white/10 rounded-3xl p-5 mx-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-accent-gold/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-emerald-400 font-bold">TGE Phase 2 Active</span>
          </div>
          <span className="text-[11px] text-text-secondary font-medium">{TOKEN_CONFIG.NETWORK}</span>
        </div>

        <div className="flex items-baseline justify-between mb-4 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">{TOKEN_CONFIG.SYMBOL} Token Launch</h2>
            <p className="text-xs text-text-secondary mt-0.5">Official Token Generation Event & DEX Listing</p>
          </div>
        </div>

        {/* Live Countdown Grid */}
        <div className="grid grid-cols-4 gap-2 text-center bg-black/40 border border-white/5 p-3 rounded-2xl relative z-10">
          <div className="flex flex-col">
            <span className="text-xl font-black text-accent-gold font-mono">{String(timeLeft.days).padStart(2, '0')}</span>
            <span className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Days</span>
          </div>
          <div className="flex flex-col border-l border-white/5">
            <span className="text-xl font-black text-white font-mono">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Hours</span>
          </div>
          <div className="flex flex-col border-l border-white/5">
            <span className="text-xl font-black text-white font-mono">{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Mins</span>
          </div>
          <div className="flex flex-col border-l border-white/5">
            <span className="text-xl font-black text-white font-mono">{String(timeLeft.seconds).padStart(2, '0')}</span>
            <span className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Secs</span>
          </div>
        </div>

        {/* DEX Partners */}
        <div className="flex items-center justify-between text-[10px] text-text-secondary mt-3 pt-3 border-t border-white/5 relative z-10">
          <span>Target DEX Liquidity:</span>
          <span className="text-white font-bold tracking-wide">STON.fi · DeDust.io</span>
        </div>
      </div>

      {/* Segmented Sub-Tab Switcher */}
      <div className="flex bg-[#161a22] p-1.5 rounded-2xl border border-white/5 mx-4 overflow-x-auto no-scrollbar gap-1">
        {[
          { id: 'allocation', label: 'My Allocation', icon: Coins },
          { id: 'roadmap', label: 'Roadmap', icon: Rocket },
          { id: 'tokenomics', label: 'Tokenomics', icon: PieChart },
          { id: 'staking', label: 'Staking Vault', icon: Lock },
          { id: 'claim', label: 'Claim Portal', icon: Wallet },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSubTab(tab.id as any);
              haptic();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-bold tracking-tight transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'bg-accent-gold text-black shadow-md'
                : 'text-text-secondary hover:text-white active:bg-white/5'
            }`}
          >
            <tab.icon size={13} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-Tab 1: MY ALLOCATION CALCULATOR */}
      {activeSubTab === 'allocation' && (
        <div className="flex flex-col gap-4 px-4">
          {/* Main Allocated Value Card */}
          <div className="bg-gradient-to-br from-[#1c212b] via-[#161b24] to-[#0f1218] border border-accent-gold/20 p-5 rounded-3xl relative overflow-hidden shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-accent-gold">Estimated Balance</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-black text-white tracking-tight">{estimatedSatoTokens.toLocaleString()}</h3>
                  <span className="text-accent-gold font-bold text-sm">$SATO</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Target Value</span>
                <p className="text-xl font-black text-emerald-400 mt-1">~${estimatedUsdVal}</p>
                <span className="text-[9px] text-text-secondary font-mono">@ $0.005 TGE</span>
              </div>
            </div>

            {/* Verification Status Badge */}
            <div className={`p-3 rounded-2xl flex items-center justify-between border ${
              user.isVerified 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} />
                <div className="text-left">
                  <p className="text-xs font-bold leading-tight">
                    {user.isVerified ? 'Sybil Verified: 1.5x Booster Applied' : 'Unverified: 0.8x Baseline Rate'}
                  </p>
                  <p className="text-[10px] opacity-80">
                    {user.isVerified ? 'Your account is cleared for 100% token claim.' : 'Complete 0.1 TON verification to unlock the +50% bonus.'}
                  </p>
                </div>
              </div>
              {!user.isVerified && (
                <button
                  onClick={onVerifyClick}
                  className="px-3 py-1.5 bg-accent-gold text-black rounded-xl text-[10px] font-black uppercase tracking-wider hover:opacity-90 active:scale-95 shrink-0 ml-2"
                >
                  Verify Now
                </button>
              )}
            </div>
          </div>

          {/* Allocation Breakdown Factors */}
          <div className="bg-card-bg border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center justify-between">
              <span>Allocation Factors Breakdown</span>
              <span className="text-[10px] text-text-secondary font-normal font-mono">Transparent Weights</span>
            </h4>

            <div className="flex flex-col divide-y divide-white/5 text-xs">
              <div className="py-2.5 flex justify-between items-center">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Coins size={14} className="text-accent-gold" />
                  <span>Tap & Coin Balance ({Math.floor(user.coins || 0).toLocaleString()})</span>
                </div>
                <span className="font-bold text-white font-mono">+{Math.floor(coinsWeight).toLocaleString()} $SATO</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <div className="flex items-center gap-2 text-text-secondary">
                  <TrendingUp size={14} className="text-accent-blue" />
                  <span>Profit Per Hour (+{pphPerHour.toLocaleString()}/h)</span>
                </div>
                <span className="font-bold text-white font-mono">+{Math.floor(pphWeight).toLocaleString()} $SATO</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Rocket size={14} className="text-purple-400" />
                  <span>Referrals ({user.referralCount || 0} miners invited)</span>
                </div>
                <span className="font-bold text-white font-mono">+{referralBonus.toLocaleString()} $SATO</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <div className="flex items-center gap-2 text-text-secondary">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>Completed Tasks & Streaks</span>
                </div>
                <span className="font-bold text-white font-mono">+{(taskBonus + streakBonus).toLocaleString()} $SATO</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setActiveSubTab('staking')}
              className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex flex-col items-start gap-1 transition-all active:scale-98 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-1">
                <Lock size={16} />
              </div>
              <span className="text-xs font-bold text-white">Stake in Vaults</span>
              <span className="text-[10px] text-text-secondary">Earn up to 92% APY Yield</span>
            </button>

            <button
              onClick={() => setActiveSubTab('claim')}
              className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex flex-col items-start gap-1 transition-all active:scale-98 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-1">
                <Wallet size={16} />
              </div>
              <span className="text-xs font-bold text-white">Claim Portal</span>
              <span className="text-[10px] text-text-secondary">TON Wallet Distribution</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: ROADMAP */}
      {activeSubTab === 'roadmap' && (
        <div className="flex flex-col gap-4 px-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Official Launch Roadmap</h3>
            <span className="text-[10px] text-accent-gold font-bold">2026 TGE Cycle</span>
          </div>

          <div className="flex flex-col gap-3 relative">
            {TOKEN_CONFIG.ROADMAP.map((item, index) => {
              const isDone = item.status === 'completed';
              const isActive = item.status === 'active';
              return (
                <div 
                  key={item.phase} 
                  className={`p-4 rounded-2xl border transition-all ${
                    isActive 
                      ? 'bg-[#1c212b] border-accent-gold shadow-lg shadow-accent-gold/5 ring-1 ring-accent-gold/20' 
                      : isDone 
                        ? 'bg-card-bg/60 border-white/5 opacity-80' 
                        : 'bg-card-bg/30 border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        isDone ? 'bg-emerald-500 text-black' : isActive ? 'bg-accent-gold text-black' : 'bg-white/10 text-white'
                      }`}>
                        {isDone ? <Check size={12} strokeWidth={4} /> : item.phase}
                      </div>
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      isActive ? 'text-accent-gold font-mono' : 'text-text-secondary'
                    }`}>
                      {item.period}
                    </span>
                  </div>

                  <ul className="grid grid-cols-1 gap-1.5 ml-8 mt-2">
                    {item.items.map((sub, i) => (
                      <li key={i} className="text-[11px] text-text-secondary flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-emerald-400' : isActive ? 'bg-accent-gold' : 'bg-white/20'}`} />
                        <span>{sub}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: TOKENOMICS */}
      {activeSubTab === 'tokenomics' && (
        <div className="flex flex-col gap-4 px-4">
          <div className="bg-card-bg border border-white/5 rounded-3xl p-5">
            <div className="text-center mb-5">
              <span className="text-[10px] font-bold tracking-widest text-text-secondary uppercase">Total Fixed Supply</span>
              <h3 className="text-3xl font-black text-white font-mono mt-0.5">10,000,000,000</h3>
              <p className="text-xs text-accent-gold font-bold mt-0.5">{TOKEN_CONFIG.NAME} ({TOKEN_CONFIG.SYMBOL})</p>
            </div>

            {/* Visual Multi-Segment Bar */}
            <div className="w-full h-4 bg-black/60 rounded-full overflow-hidden flex mb-5 border border-white/10">
              {TOKEN_CONFIG.TOKENOMICS.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  className="h-full relative group transition-all"
                  title={`${item.label}: ${item.percentage}%`}
                />
              ))}
            </div>

            {/* Tokenomics Breakdown Cards */}
            <div className="flex flex-col gap-2.5">
              {TOKEN_CONFIG.TOKENOMICS.map((item, idx) => (
                <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-start gap-2.5">
                    <span 
                      className="w-3.5 h-3.5 rounded-lg mt-0.5 shrink-0" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.label}</h4>
                      <p className="text-[10px] text-text-secondary max-w-[200px] leading-tight mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-white font-mono">{item.percentage}%</span>
                    <p className="text-[10px] text-text-secondary font-mono">{(item.tokens / 1000000000).toFixed(1)}B</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-text-secondary leading-relaxed">
            <p className="font-bold text-white mb-1 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" /> Transparent Community Fair Launch
            </p>
            No private pre-sale dumps. 60% of all tokens are directly reserved for active Telegram community miners and stakers.
          </div>
        </div>
      )}

      {/* Sub-Tab 4: STAKING VAULTS */}
      {activeSubTab === 'staking' && (
        <div className="flex flex-col gap-4 px-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Staking Vaults</h3>
              <p className="text-[10px] text-text-secondary">Lock $SATO allocation to earn high APY yield</p>
            </div>
            <span className="text-[10px] text-accent-gold font-bold font-mono">Up to 92% APY</span>
          </div>

          {/* Active Staked Positions */}
          {user.stakedPositions && Object.keys(user.stakedPositions).length > 0 && (
            <div className="bg-gradient-to-r from-purple-900/20 to-black border border-purple-500/30 p-4 rounded-2xl flex flex-col gap-3">
              <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={13} /> Your Active Staking Positions
              </h4>

              {Object.values(user.stakedPositions).map((pos) => {
                const elapsedMs = Date.now() - pos.stakedAt;
                const elapsedYears = elapsedMs / (365 * 24 * 3600 * 1000);
                const currentAccrued = Math.floor(pos.amount * (pos.apy / 100) * elapsedYears);
                const poolMeta = TOKEN_CONFIG.STAKING_POOLS.find(p => p.id === pos.poolId);

                return (
                  <div key={pos.poolId} className="bg-black/40 border border-white/10 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-white">{poolMeta?.name || 'Vault'}</p>
                      <p className="text-[10px] text-text-secondary font-mono">
                        Staked: {pos.amount.toLocaleString()} $SATO · {pos.apy}% APY
                      </p>
                      <p className="text-[10px] text-emerald-400 font-bold mt-1">
                        Accumulated Yield: +{currentAccrued.toLocaleString()} $SATO
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0 ml-3">
                      <button
                        onClick={async () => {
                          const res = await claimStakingYield(pos.poolId);
                          alert(res.message || 'Yield updated');
                        }}
                        className="px-3 py-1 bg-accent-gold text-black rounded-lg text-[10px] font-black uppercase tracking-wider hover:opacity-90 active:scale-95"
                      >
                        Claim Yield
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Unstake ${pos.amount.toLocaleString()} $SATO?`)) {
                            const res = await unstakeTokens(pos.poolId);
                            alert(res.message);
                          }
                        }}
                        className="px-3 py-1 bg-white/10 text-white rounded-lg text-[10px] font-bold hover:bg-white/20 active:scale-95"
                      >
                        Unstake
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Staking Pool Cards */}
          <div className="flex flex-col gap-3">
            {TOKEN_CONFIG.STAKING_POOLS.map((pool) => {
              const isLocked = !!user.stakedPositions?.[pool.id];

              return (
                <div 
                  key={pool.id}
                  className={`bg-card-bg border p-4 rounded-2xl flex flex-col gap-3 transition-all ${
                    pool.recommended 
                      ? 'border-accent-gold/40 shadow-lg ring-1 ring-accent-gold/20' 
                      : 'border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{pool.name}</h4>
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-gold/10 text-accent-gold border border-accent-gold/20">
                          {pool.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-secondary mt-0.5">Lock Period: {pool.lockPeriod}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-accent-gold font-mono">{pool.apy}%</span>
                      <p className="text-[9px] text-text-secondary uppercase tracking-wider font-bold">APY</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-secondary pt-2 border-t border-white/5">
                    <span>Min Deposit: {pool.minStake.toLocaleString()} $SATO</span>
                    <span className="text-emerald-400 font-bold">{pool.multiplier}</span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPool(pool);
                      setStakeAmountInput(pool.minStake.toString());
                      haptic();
                    }}
                    className="w-full py-2.5 bg-accent-gold text-black rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <Lock size={13} /> {isLocked ? 'Add More to Vault' : 'Stake in Vault'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Tab 5: CLAIM PORTAL */}
      {activeSubTab === 'claim' && (
        <div className="flex flex-col gap-4 px-4">
          <div className="bg-card-bg border border-white/5 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-accent-gold/10 flex items-center justify-center text-accent-gold">
                <Wallet size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Official Token Claim Portal</h3>
                <p className="text-xs text-text-secondary">Direct distribution to your connected TON wallet</p>
              </div>
            </div>

            {/* Claimable Balance Box */}
            <div className="bg-black/50 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">Available to Claim</span>
                <p className="text-2xl font-black text-white font-mono mt-0.5">{availableToClaim.toLocaleString()} $SATO</p>
                <span className="text-[10px] text-emerald-400 font-medium">Estimated ${(availableToClaim * 0.005).toFixed(2)} USD</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">Claimed So Far</span>
                <p className="text-lg font-bold text-accent-gold font-mono mt-0.5">{(user.claimedTokens || 0).toLocaleString()}</p>
                <span className="text-[9px] text-text-secondary">Direct to TON</span>
              </div>
            </div>

            {/* Target Address Info */}
            <div className="flex flex-col gap-1 text-xs">
              <span className="text-[10px] font-bold uppercase text-text-secondary tracking-wider">Destination Address</span>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 font-mono text-xs text-white break-all flex items-center justify-between">
                <span>{user.walletAddress || tonConnectUI.account?.address || 'No TON Wallet Connected'}</span>
                {user.walletAddress && <CheckCircle2 size={16} className="text-emerald-400 shrink-0 ml-2" />}
              </div>
            </div>

            {/* Checklist */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/5 text-xs">
              <div className="flex items-center gap-2">
                {user.walletAddress ? <CheckCircle2 size={14} className="text-emerald-400" /> : <AlertCircle size={14} className="text-amber-400" />}
                <span className={user.walletAddress ? 'text-white' : 'text-text-secondary'}>TON Wallet Connected</span>
              </div>
              <div className="flex items-center gap-2">
                {user.isVerified ? <CheckCircle2 size={14} className="text-emerald-400" /> : <AlertCircle size={14} className="text-amber-400" />}
                <span className={user.isVerified ? 'text-white' : 'text-text-secondary'}>On-Chain Identity Verified (0.1 TON)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-white">Smart Contract Gas Fee Sponsored (~0.02 TON)</span>
              </div>
            </div>

            {/* Claim Action Button */}
            {claimStatusMsg ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-emerald-300 text-xs font-bold">
                {claimStatusMsg}
              </div>
            ) : (
              <button
                disabled={isClaiming || availableToClaim <= 0}
                onClick={handleClaimSubmit}
                className="w-full py-3 bg-accent-gold text-black rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-98 transition-all disabled:opacity-40 disabled:scale-100 shadow-lg flex items-center justify-center gap-2"
              >
                {isClaiming ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing Claim on TON...</span>
                  </>
                ) : availableToClaim <= 0 ? (
                  'All Tokens Claimed'
                ) : (
                  `Claim ${availableToClaim.toLocaleString()} $SATO Tokens`
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stake Modal */}
      <AnimatePresence>
        {selectedPool && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1c212b] border border-white/10 rounded-3xl p-5 w-full max-w-sm flex flex-col gap-4 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <h3 className="font-bold text-sm">{selectedPool.name}</h3>
                  <p className="text-[10px] text-accent-gold font-mono">{selectedPool.apy}% APY · {selectedPool.lockPeriod}</p>
                </div>
                <button 
                  onClick={() => setSelectedPool(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary"
                >
                  ✕
                </button>
              </div>

              <div>
                <div className="flex justify-between text-xs text-text-secondary mb-1.5">
                  <span>Enter $SATO Amount</span>
                  <span>Available: {estimatedSatoTokens.toLocaleString()}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={stakeAmountInput}
                    onChange={(e) => setStakeAmountInput(e.target.value)}
                    placeholder={`Min ${selectedPool.minStake}`}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-accent-gold"
                  />
                  <button
                    onClick={() => setStakeAmountInput(estimatedSatoTokens.toString())}
                    className="absolute right-3 top-2.5 px-2 py-1 bg-white/10 hover:bg-white/20 text-accent-gold text-[10px] font-bold rounded-lg uppercase"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Estimated Yield Calculation */}
              {parseInt(stakeAmountInput, 10) > 0 && (
                <div className="bg-white/5 p-3 rounded-xl flex justify-between items-center text-xs">
                  <span className="text-text-secondary">Est. Yield ({selectedPool.lockPeriod}):</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    +{Math.floor(parseInt(stakeAmountInput, 10) * (selectedPool.apy / 100) * (selectedPool.durationDays / 365)).toLocaleString()} $SATO
                  </span>
                </div>
              )}

              {stakingStatusMsg ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-center text-xs font-bold">
                  {stakingStatusMsg}
                </div>
              ) : (
                <button
                  disabled={isStaking || !stakeAmountInput || parseInt(stakeAmountInput, 10) < selectedPool.minStake}
                  onClick={handleStakeSubmit}
                  className="w-full py-3 bg-accent-gold text-black rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-98 transition-all disabled:opacity-40 shadow-lg"
                >
                  {isStaking ? 'Confirming Stake...' : `Confirm & Lock $SATO`}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState } from 'react';
import { Coins, Zap, Trophy, Users, CheckCircle2, Wallet, RefreshCw } from 'lucide-react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TabProps {
  active: string;
  setActive: (t: string) => void;
}

export const Navigation = ({ active, setActive }: TabProps) => {
  const tabs = [
    { id: 'home', icon: Coins, label: 'Exchange' },
    { id: 'tasks', icon: CheckCircle2, label: 'Earn' },
    { id: 'friends', icon: Users, label: 'Friends' },
    { id: 'leaders', icon: Trophy, label: 'Leaders' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card-bg border-t border-white/5 px-4 pb-8 pt-4 flex justify-between items-center z-50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActive(tab.id)}
          className={`flex flex-col items-center gap-1 transition-colors ${
            active === tab.id ? 'text-text-primary' : 'text-text-secondary hover:text-gray-400'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-0.5 transition-colors ${active === tab.id ? 'bg-accent-gold text-black' : 'bg-[#363d4a]'}`}>
            <tab.icon size={18} />
          </div>
          <span className="text-[10px] font-medium tracking-wider uppercase">{tab.label}</span>
          {tab.id === 'friends' && <div className="absolute top-0 right-[-10px] bg-[#eb5757] text-white text-[8px] px-1.5 py-0.5 rounded-sm">+2</div>}
        </button>
      ))}
    </nav>
  );
};

export const Header = ({ user }: { user: any; syncing: boolean; setUser: React.Dispatch<React.SetStateAction<any>> }) => {
  return (
    <header className="p-5 pb-3 flex justify-between items-center bg-bg-main sticky top-0 z-40">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-[10px] bg-accent-blue flex items-center justify-center font-bold text-white text-sm">
          {user?.username?.[0]?.toUpperCase() || 'P'}
        </div>
        <div>
          <strong className="text-sm block leading-tight">{user?.username || '@player'}</strong>
          <span className="text-xs text-text-secondary block">Level {user?.level} / 10</span>
        </div>
      </div>
      
      <TonConnectButton />
    </header>
  );
};

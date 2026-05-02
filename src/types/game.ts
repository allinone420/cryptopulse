export interface AdTask {
  id: string;
  title: string;
  reward: number;
  type: 'video' | 'popup';
}

export interface GlobalSettings {
  referrerReward: number;
  refereeReward: number;
  passiveCommission: number;
  adsEnabled: boolean;
  adTasks?: AdTask[];
  tgBotToken?: string;
  tgChannelId?: string;
}

export interface UserData {
  uid: string;
  telegramId: number;
  username: string;
  firstName: string;
  coins: number;
  totalCoins: number;
  energy: number;
  maxEnergy: number;
  lastEnergyUpdate: number; // timestamp
  passiveIncomeRate: number; // coins per second
  lastPassiveIncomeUpdate: number; // timestamp
  walletAddress: string | null;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  completedTasks: string[];
  lastDailyReward: number | null; // timestamp
  lastAdView?: number | null; // Keep for global fallback
  adCompletions?: { [adId: string]: number }; // timestamp of last view per ad
  dailyStreak: number;
  level: number;
  mineCards?: { [cardId: string]: number }; // cardId -> level
  lastActive?: number;
  
  // New Features
  dailyCipher?: {
    word: string;
    isCompleted: boolean;
    lastUpdated: number;
  };
  dailyCombo?: {
    cards: string[]; // IDs of the cards in today's combo
    claimed: boolean;
    lastUpdated: number;
  };
  boosts?: {
    multiTap: number;
    energyLimit: number;
    rechargeSpeed: number;
    lastFullRefill?: number;
    refillsToday?: number;
  };
}

export interface Task {
  id: string;
  title: string;
  reward: number;
  type: 'telegram' | 'ads' | 'invite';
  link?: string;
  requiredInvites?: number;
}

export interface LeaderboardEntry {
  uid: string;
  username: string;
  coins: number;
  level: number;
}

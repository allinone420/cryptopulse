export interface AdTask {
  id: string;
  title: string;
  reward: number;
}

export interface GlobalSettings {
  referrerReward: number;
  refereeReward: number;
  passiveCommission: number;
  adsEnabled: boolean;
  interstitialEnabled?: boolean;
  interstitialReward?: number;
  bannerEnabled?: boolean;
  bannerReward?: number;
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
  lastActive?: number;
}

export interface Task {
  id: string;
  title: string;
  reward: number;
  type: 'telegram' | 'ads' | 'invite';
  link?: string;
}

export interface LeaderboardEntry {
  username: string;
  coins: number;
  level: number;
}

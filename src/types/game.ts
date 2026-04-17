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
  dailyStreak: number;
  level: number;
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

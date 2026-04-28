export const INITIAL_ENERGY = 1000;
export const BOT_USERNAME = 'SatoCryp_bot';
export const ENERGY_REFILL_RATE = 1; // energy per second
export const COINS_PER_TAP = 1;

export const TASKS = [
  { id: 'tg_join', title: 'Join our Telegram Channel', reward: 500, type: 'telegram', link: 'https://t.me/SatoCryp' },
  { id: 'invite_3', title: 'Invite 3 Friends', reward: 2000, type: 'invite', requiredInvites: 3 },
  { id: 'invite_10', title: 'Invite 10 Friends', reward: 15000, type: 'invite', requiredInvites: 10 },
  { id: 'invite_25', title: 'Invite 25 Friends', reward: 50000, type: 'invite', requiredInvites: 25 },
  { id: 'invite_50', title: 'Invite 50 Friends', reward: 125000, type: 'invite', requiredInvites: 50 },
  { id: 'invite_100', title: 'Invite 100 Friends', reward: 300000, type: 'invite', requiredInvites: 100 },
];

export const DAILY_REWARD_BASE = 1000;
export const DAILY_REWARD_STEP = 500;

export const REFERRAL_REWARD_REFERRER = 5000;
export const REFERRAL_REWARD_REFEREE = 2500;

export const LEVELS = [
  { level: 1, name: 'Bronze', upgradeCost: 0, tapValue: 1, maxEnergy: 1000, passiveRate: 1 },
  { level: 2, name: 'Silver', upgradeCost: 10000, tapValue: 2, maxEnergy: 2000, passiveRate: 3 },
  { level: 3, name: 'Gold', upgradeCost: 50000, tapValue: 5, maxEnergy: 5000, passiveRate: 10 },
  { level: 4, name: 'Platinum', upgradeCost: 200000, tapValue: 10, maxEnergy: 10000, passiveRate: 30 },
  { level: 5, name: 'Diamond', upgradeCost: 1000000, tapValue: 20, maxEnergy: 20000, passiveRate: 100 },
  { level: 6, name: 'Epic', upgradeCost: 5000000, tapValue: 50, maxEnergy: 50000, passiveRate: 300 },
  { level: 7, name: 'Legendary', upgradeCost: 25000000, tapValue: 100, maxEnergy: 100000, passiveRate: 1000 },
  { level: 8, name: 'Master', upgradeCost: 100000000, tapValue: 250, maxEnergy: 250000, passiveRate: 3000 },
  { level: 9, name: 'Grandmaster', upgradeCost: 500000000, tapValue: 500, maxEnergy: 500000, passiveRate: 10000 },
  { level: 10, name: 'God Mode', upgradeCost: 2000000000, tapValue: 1000, maxEnergy: 1000000, passiveRate: 30000 },
];

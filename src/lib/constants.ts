export const INITIAL_ENERGY = 1000;
export const BOT_USERNAME = 'CryptoPulseBot'; // User should update this with their actual bot username
export const ENERGY_REFILL_RATE = 1; // energy per second
export const COINS_PER_TAP = 1;

export const TASKS = [
  { id: 'tg_join', title: 'Join our Telegram Channel', reward: 500, type: 'telegram', link: 'https://t.me/example' },
  { id: 'watch_ad_1', title: 'Watch Ad - Earn 100 Coins', reward: 100, type: 'ads' },
  { id: 'invite_3', title: 'Invite 3 Friends', reward: 2000, type: 'invite' },
];

export const DAILY_REWARDS = [100, 200, 300, 500, 1000, 2500, 5000];

export const REFERRAL_REWARD_REFERRER = 5000;
export const REFERRAL_REWARD_REFEREE = 2500;

export const LEVELS = [
  { level: 1, name: 'Bronze', minCoins: 0 },
  { level: 2, name: 'Silver', minCoins: 5000 },
  { level: 3, name: 'Gold', minCoins: 25000 },
  { level: 4, name: 'Platinum', minCoins: 100000 },
  { level: 5, name: 'Diamond', minCoins: 1000000 },
];

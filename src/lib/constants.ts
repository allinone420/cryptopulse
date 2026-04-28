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
export const MAX_CARD_LEVEL = 25;

export const REFERRAL_REWARD_REFERRER = 5000;
export const REFERRAL_REWARD_REFEREE = 2500;

export const LEVELS = [
  { level: 1, name: 'Bronze', upgradeCost: 0, tapValue: 1, maxEnergy: 1000, passiveRate: 1 },
  { level: 2, name: 'Silver', upgradeCost: 25000, tapValue: 2, maxEnergy: 2500, passiveRate: 5 },
  { level: 3, name: 'Gold', upgradeCost: 100000, tapValue: 4, maxEnergy: 5000, passiveRate: 15 },
  { level: 4, name: 'Platinum', upgradeCost: 500000, tapValue: 8, maxEnergy: 10000, passiveRate: 50 },
  { level: 5, name: 'Diamond', upgradeCost: 2000000, tapValue: 15, maxEnergy: 25000, passiveRate: 150 },
  { level: 6, name: 'Epic', upgradeCost: 10000000, tapValue: 30, maxEnergy: 60000, passiveRate: 500 },
  { level: 7, name: 'Legendary', upgradeCost: 50000000, tapValue: 60, maxEnergy: 150000, passiveRate: 1500 },
  { level: 8, name: 'Master', upgradeCost: 250000000, tapValue: 125, maxEnergy: 400000, passiveRate: 5000 },
  { level: 9, name: 'Grandmaster', upgradeCost: 1000000000, tapValue: 250, maxEnergy: 1000000, passiveRate: 15000 },
  { level: 10, name: 'God Mode', upgradeCost: 5000000000, tapValue: 500, maxEnergy: 2500000, passiveRate: 50000 },
];

export interface MineCard {
  id: string;
  name: string;
  category: 'Markets' | 'PR&Team' | 'Legal' | 'Special';
  baseCost: number;
  baseProfit: number; // profit per hour at level 1
  description: string;
  image?: string;
  requiredLevel?: number;
}

export const MINE_CARDS: MineCard[] = [
  // Markets
  { id: 'm_fan_tokens', name: 'Fan Tokens', category: 'Markets', baseCost: 500, baseProfit: 50, description: 'Invest in sports fan engagement tokens' },
  { id: 'm_staking', name: 'Staking', category: 'Markets', baseCost: 2000, baseProfit: 180, description: 'Secure the network and earn rewards' },
  { id: 'm_derivatives', name: 'Derivatives', category: 'Markets', baseCost: 10000, baseProfit: 950, description: 'Advanced trading instruments' },
  { id: 'm_prediction', name: 'Prediction', category: 'Markets', baseCost: 50000, baseProfit: 4800, description: 'Decentralized prediction markets' },
  { id: 'm_liquidity', name: 'Liquidity Pools', category: 'Markets', baseCost: 150000, baseProfit: 15000, description: 'Provide liquidity to DEX and earn fees' },
  { id: 'm_margin', name: 'Margin Trading', category: 'Markets', baseCost: 400000, baseProfit: 42000, description: 'Trade with leverage for higher returns' },
  { id: 'm_index', name: 'Crypto Index', category: 'Markets', baseCost: 1000000, baseProfit: 110000, description: 'Diversified portfolio of top assets' },
  { id: 'm_arbitrage', name: 'Arbitrage Bot', category: 'Markets', baseCost: 5000000, baseProfit: 550000, description: 'Profit from price differences across exchanges' },
  
  // PR&Team
  { id: 'pr_influencers', name: 'Influencers', category: 'PR&Team', baseCost: 1000, baseProfit: 90, description: 'Famous people talking about SatoCryp' },
  { id: 'pr_it_team', name: 'IT Team', category: 'PR&Team', baseCost: 5000, baseProfit: 450, description: 'Best developers to build the ecosystem' },
  { id: 'pr_marketing', name: 'Global Marketing', category: 'PR&Team', baseCost: 25000, baseProfit: 2300, description: 'Worldwide advertising campaigns' },
  { id: 'pr_community', name: 'Community Managers', category: 'PR&Team', baseCost: 75000, baseProfit: 7200, description: 'Growing our social presence' },
  { id: 'pr_branding', name: 'Brand Ambassadors', category: 'PR&Team', baseCost: 250000, baseProfit: 25000, description: 'Global faces for the project' },
  { id: 'pr_security', name: 'Audit Team', category: 'PR&Team', baseCost: 1000000, baseProfit: 105000, description: 'Ensuring smart contract safety' },
  { id: 'pr_ux', name: 'UX Designers', category: 'PR&Team', baseCost: 2500000, baseProfit: 280000, description: 'Top-tier user interface improvements' },
  
  // Legal
  { id: 'l_kyc', name: 'KYC', category: 'Legal', baseCost: 1500, baseProfit: 120, description: 'Know your customer compliance' },
  { id: 'l_license_europe', name: 'EU License', category: 'Legal', baseCost: 25000, baseProfit: 2200, description: 'License to operate in Europe' },
  { id: 'l_license_asia', name: 'Asia License', category: 'Legal', baseCost: 100000, baseProfit: 9500, description: 'License to operate in Asian markets' },
  { id: 'l_aml', name: 'AML System', category: 'Legal', baseCost: 300000, baseProfit: 28000, description: 'Anti-money laundering detection' },
  { id: 'l_compliance', name: 'Compliance Officer', category: 'Legal', baseCost: 800000, baseProfit: 82000, description: 'Dedicated legal expert for regulations' },
  { id: 'l_patent', name: 'Technology Patent', category: 'Legal', baseCost: 2000000, baseProfit: 220000, description: 'Protecting our unique tech innovations' },
  { id: 'l_sec', name: 'SEC Clearance', category: 'Legal', baseCost: 10000000, baseProfit: 1200000, description: 'Highest level of regulatory approval' },
  
  // Special
  { id: 's_ton_partner', name: 'TON Partnership', category: 'Special', baseCost: 100000, baseProfit: 15000, description: 'Deep integration with TON network' },
  { id: 's_ai_trading', name: 'AI Trading Bot', category: 'Special', baseCost: 500000, baseProfit: 55000, description: 'Neural network based trading algorithm' },
  { id: 's_mining_farm', name: 'Green Mining Farm', category: 'Special', baseCost: 2500000, baseProfit: 320000, description: 'Sustainable crypto mining operation' },
  { id: 's_hardware_wallet', name: 'Custom Wallet', category: 'Special', baseCost: 10000000, baseProfit: 1500000, description: 'Physical security for digital assets' },
  { id: 's_exchange', name: 'Our Own DEX', category: 'Special', baseCost: 50000000, baseProfit: 8000000, description: 'Fully decentralized exchange platform' },
];

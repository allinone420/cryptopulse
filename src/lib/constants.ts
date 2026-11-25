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

export const DAILY_CIPHER_REWARD = 1000000; // 1M for cipher
export const DAILY_COMBO_REWARD = 5000000; // 5M for combo

export const AIRDROP_CONFIG = {
  MIN_TRANSACTION_AMOUNT: 0.1, // Exactly 0.1 TON
  ADMIN_TON_ADDRESS: "UQDKyZLK_cRo4Gcy5sOxSoCiW_-jQEwGYTYhGeflGPjw10gH", // Admin's TON address
  WEIGHTS: {
    COINS: 0.1,
    PROFIT_PER_HOUR: 10,
    REFERRALS: 5000
  },
  VERIFICATION_FEE_TON: "0.1"
};

export const TOKEN_CONFIG = {
  NAME: 'SatoCryp Token',
  SYMBOL: '$SATO',
  TOTAL_SUPPLY: 10000000000, // 10 Billion $SATO
  ESTIMATED_LISTING_PRICE_USD: 0.005, // $0.005 target initial price
  TGE_TARGET_TIMESTAMP: Date.now() + 68 * 24 * 60 * 60 * 1000, // ~68 days countdown
  NETWORK: 'TON Blockchain (Jetton Standard)',
  DEX_PARTNERS: ['STON.fi', 'DeDust.io'],
  TOKENOMICS: [
    { label: 'Community Airdrop', percentage: 60, tokens: 6000000000, color: '#f3ba2f', desc: 'Direct reward to players based on activity, PPH & verification' },
    { label: 'DEX Liquidity Pool', percentage: 18, tokens: 1800000000, color: '#2d9cdb', desc: 'Permanently locked liquidity on STON.fi & DeDust for trading' },
    { label: 'Ecosystem & Staking Vaults', percentage: 12, tokens: 1200000000, color: '#a855f7', desc: 'Yield rewards for locking and staking $SATO in-app' },
    { label: 'Marketing & Strategic Listings', percentage: 10, tokens: 1000000000, color: '#22c55e', desc: 'Exchange listings, security audits, and partnership campaigns' }
  ],
  ROADMAP: [
    { 
      phase: 1, 
      title: 'Phase 1: Mining & Community Genesis', 
      status: 'completed', 
      period: 'Q1-Q2 2026', 
      items: ['Telegram Mini App Launch', 'Tap-to-Earn & Passive Profit Engine', 'Referral Network & Daily Cipher/Combo', 'Community Growth (100K+ Miners)'] 
    },
    { 
      phase: 2, 
      title: 'Phase 2: Sybil Audit & TON Verification', 
      status: 'active', 
      period: 'Current Phase', 
      items: ['TON Connect 2.0 Web3 Integration', '0.1 TON On-Chain Identity Verification', 'Bot & Multi-Account Sybil Filter Engine', 'Live Token Allocation Estimator'] 
    },
    { 
      phase: 3, 
      title: 'Phase 3: Snapshot & Token Generation (TGE)', 
      status: 'upcoming', 
      period: 'Q3 2026', 
      items: ['Final In-Game Balances Snapshot', '$SATO Jetton Smart Contract Deployment', 'On-Chain Token Claiming Activation', 'Community Distribution Initiation'] 
    },
    { 
      phase: 4, 
      title: 'Phase 4: DEX Listing & Staking Ecosystem', 
      status: 'upcoming', 
      period: 'Q4 2026', 
      items: ['STON.fi & DeDust.io Liquidity Pools Open', 'CoinGecko & CoinMarketCap Tracking', 'In-App Staking Vaults & Governance', 'CEX Tier-1 Exchange Expansion'] 
    }
  ],
  STAKING_POOLS: [
    { 
      id: 'flexible_7d', 
      name: 'Silver Flex Vault', 
      durationDays: 7, 
      apy: 18, 
      minStake: 500, 
      lockPeriod: '7 Days', 
      badge: 'Low Risk',
      multiplier: '1.15x Mining Boost'
    },
    { 
      id: 'diamond_30d', 
      name: 'Diamond Lock Vault', 
      durationDays: 30, 
      apy: 45, 
      minStake: 2500, 
      lockPeriod: '30 Days', 
      badge: 'Popular',
      recommended: true,
      multiplier: '1.45x Mining Boost'
    },
    { 
      id: 'whale_90d', 
      name: 'Whale Grand Vault', 
      durationDays: 90, 
      apy: 92, 
      minStake: 10000, 
      lockPeriod: '90 Days', 
      badge: 'Max APY',
      multiplier: '2.0x Mining Boost'
    }
  ]
};

export const BOOST_COSTS = {
  multiTap: 5000,
  energyLimit: 10000,
  rechargeSpeed: 20000
};

export const LEVELS = [
  { level: 1, name: 'Bronze', upgradeCost: 0, tapValue: 1, maxEnergy: 1000, passiveRate: 1 },
  { level: 2, name: 'Silver', upgradeCost: 50000, tapValue: 2, maxEnergy: 3000, passiveRate: 10 },
  { level: 3, name: 'Gold', upgradeCost: 250000, tapValue: 5, maxEnergy: 6000, passiveRate: 35 },
  { level: 4, name: 'Platinum', upgradeCost: 1000000, tapValue: 10, maxEnergy: 12000, passiveRate: 120 },
  { level: 5, name: 'Diamond', upgradeCost: 5000000, tapValue: 20, maxEnergy: 25000, passiveRate: 400 },
  { level: 6, name: 'Epic', upgradeCost: 25000000, tapValue: 50, maxEnergy: 60000, passiveRate: 1500 },
  { level: 7, name: 'Legendary', upgradeCost: 125000000, tapValue: 100, maxEnergy: 150000, passiveRate: 5000 },
  { level: 8, name: 'Master', upgradeCost: 600000000, tapValue: 250, maxEnergy: 400000, passiveRate: 18000 },
  { level: 9, name: 'Grandmaster', upgradeCost: 2500000000, tapValue: 500, maxEnergy: 1000000, passiveRate: 60000 },
  { level: 10, name: 'God Mode', upgradeCost: 10000000000, tapValue: 1000, maxEnergy: 2500000, passiveRate: 200000 },
];

export interface MineCard {
  id: string;
  name: string;
  category: 'Nodes' | 'DeFi' | 'CoreTech' | 'Space';
  baseCost: number;
  baseProfit: number; // profit per hour at level 1
  description: string;
  image?: string;
  requiredLevel?: number;
}

export const MINE_CARDS: MineCard[] = [
  // Nodes
  { id: 'n_quantum', name: 'Quantum Node', category: 'Nodes', baseCost: 500, baseProfit: 50, description: 'Next-gen subatomic computing node' },
  { id: 'n_ai_rig', name: 'AI Miner Rig', category: 'Nodes', baseCost: 2000, baseProfit: 180, description: 'Neural hash verification unit' },
  { id: 'n_validator', name: 'PoS Validator', category: 'Nodes', baseCost: 10000, baseProfit: 950, description: 'Decentralized consensus validator' },
  { id: 'n_sentinel', name: 'Sentinel Relay', category: 'Nodes', baseCost: 50000, baseProfit: 4800, description: 'Encrypted network relay station' },
  { id: 'n_cluster', name: 'Cloud Hash Cluster', category: 'Nodes', baseCost: 150000, baseProfit: 15000, description: 'Scalable distributed compute array' },
  { id: 'n_darknet', name: 'Darknet Compute', category: 'Nodes', baseCost: 400000, baseProfit: 42000, description: 'Anonymous high-speed hash engine' },
  { id: 'n_genesis', name: 'Genesis Rig', category: 'Nodes', baseCost: 1000000, baseProfit: 110000, description: 'Foundational bedrock mining rig' },
  { id: 'n_singularity', name: 'Singularity Core', category: 'Nodes', baseCost: 5000000, baseProfit: 550000, description: 'Infinite scalability mining core' },
  
  // DeFi
  { id: 'd_harvester', name: 'Yield Harvester', category: 'DeFi', baseCost: 1000, baseProfit: 90, description: 'Automated liquidity yield optimizer' },
  { id: 'd_flash', name: 'Flash Loan Engine', category: 'DeFi', baseCost: 5000, baseProfit: 450, description: 'Zero-collateral instant liquidity protocol' },
  { id: 'd_amm', name: 'AMM Router', category: 'DeFi', baseCost: 25000, baseProfit: 2300, description: 'Decentralized exchange routing protocol' },
  { id: 'd_vault', name: 'Synthetic Vault', category: 'DeFi', baseCost: 75000, baseProfit: 7200, description: 'Multi-asset synthetic yield vault' },
  { id: 'd_arbitrage', name: 'Arbitrage Matrix', category: 'DeFi', baseCost: 250000, baseProfit: 25000, description: 'Cross-chain price divergence sniper' },
  { id: 'd_derivative', name: 'Derivative Engine', category: 'DeFi', baseCost: 1000000, baseProfit: 105000, description: 'Advanced perpetual futures protocol' },
  { id: 'd_liquid', name: 'Liquid Staking Hub', category: 'DeFi', baseCost: 2500000, baseProfit: 280000, description: 'Unstake without locking periods' },
  
  // CoreTech
  { id: 'c_copilot', name: 'Neural Copilot', category: 'CoreTech', baseCost: 1500, baseProfit: 120, description: 'Autonomous AI assistant for developers' },
  { id: 'c_ml_core', name: 'ML Core Processor', category: 'CoreTech', baseCost: 25000, baseProfit: 2200, description: 'Deep learning pattern recognition' },
  { id: 'c_agent', name: 'Autonomous Agent', category: 'CoreTech', baseCost: 100000, baseProfit: 9500, description: 'Self-executing smart contract agent' },
  { id: 'c_encryption', name: 'Quantum Encryption', category: 'CoreTech', baseCost: 300000, baseProfit: 28000, description: 'Unbreakable cryptographic shield' },
  { id: 'c_shield', name: 'Contract Firewall', category: 'CoreTech', baseCost: 800000, baseProfit: 82000, description: 'Real-time exploit prevention system' },
  { id: 'c_dns', name: 'Decentralized DNS', category: 'CoreTech', baseCost: 2000000, baseProfit: 220000, description: 'Censorship-resistant domain routing' },
  { id: 'c_zk_proof', name: 'ZK Proof Engine', category: 'CoreTech', baseCost: 10000000, baseProfit: 1200000, description: 'Zero-knowledge privacy verification' },
  
  // Space
  { id: 's_uplink', name: 'Satellite Uplink', category: 'Space', baseCost: 100000, baseProfit: 15000, description: 'Low-earth orbit crypto transceiver' },
  { id: 's_orbital', name: 'Orbital Relay', category: 'Space', baseCost: 500000, baseProfit: 55000, description: 'Space-based transaction relay station' },
  { id: 's_solar', name: 'Solar Array Grid', category: 'Space', baseCost: 2500000, baseProfit: 320000, description: 'Infinite clean energy mining array' },
  { id: 's_deep_space', name: 'Deep Space Miner', category: 'Space', baseCost: 10000000, baseProfit: 1500000, description: 'Asteroid belt resource extractor' },
  { id: 's_starfleet', name: 'Starfleet Gateway', category: 'Space', baseCost: 50000000, baseProfit: 8000000, description: 'Interplanetary blockchain gateway' },
];

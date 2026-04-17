import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5/react';

// 1. Get projectId from https://cloud.walletconnect.com
const projectId = 'c2b64d0d0f50e70ca981c2f9e4f50937'; 

// 2. Set chains
const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://cloudflare-eth.com'
};

const bsc = {
  chainId: 56,
  name: 'Binance Smart Chain',
  currency: 'BNB',
  explorerUrl: 'https://bscscan.com',
  rpcUrl: 'https://bsc-dataseed.binance.org/'
};

// 3. Create modal
const metadata = {
  name: 'CryptoPulse',
  description: 'Tap to earn crypto and connect your wallet',
  url: window.location.origin,
  icons: ['https://picsum.photos/seed/cryptopulse/200']
};

export const web3Modal = createWeb3Modal({
  ethersConfig: defaultConfig({ metadata }),
  chains: [mainnet, bsc],
  projectId,
  enableAnalytics: true
});

export const formatAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

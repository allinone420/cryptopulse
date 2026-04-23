/// <reference types="vite/client" />
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5/react';

// 1. Get projectId from https://cloud.walletconnect.com
const projectId = (import.meta as any).env.VITE_PROJECT_ID || 'c2b64d0d0f50e70ca981c2f9e4f50937'; 

if (!projectId || projectId === 'c2b64d0d0f50e70ca981c2f9e4f50937') {
  console.warn('WalletConnect Project ID is missing or using default. Modal might not load wallet lists correctly.');
}

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
  name: 'SatoCryp',
  description: 'Tap to earn crypto and connect your wallet',
  url: window.location.origin || 'https://satocryp.com', 
  icons: ['https://raw.githubusercontent.com/allinone420/cryptopulse/refs/heads/main/public/logo.png']
};

export const web3Modal = createWeb3Modal({
  ethersConfig: defaultConfig({ 
    metadata,
    enableEIP6963: true,
    enableInjected: true,
    enableCoinbase: true,
    rpcUrl: bsc.rpcUrl // Provide a default RPC
  }),
  chains: [bsc, mainnet], // Put BSC first as it's common for tap games
  projectId,
  enableAnalytics: true,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#f3ba2f'
  }
});

export const formatAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

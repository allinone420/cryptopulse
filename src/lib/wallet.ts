// SatoCryp uses TON Connect for wallet operations.
// This utility provides simple address formatting helpers.

export const formatAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

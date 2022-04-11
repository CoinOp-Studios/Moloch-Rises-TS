import WalletConnectProvider from "@walletconnect/web3-provider";
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';

export const SUPPORTED_NETWORKS = {
  '0x539': {
    chainId: '0x539',
    name: 'Hardhat',
    symbol: 'ETH',
    explorer: 'http://localhost:1234',
    rpc: 'http://localhost:8545',
  },
  '0x89': {
    chainId: '0x89',
    name: 'Polygon',
    symbol: 'MATIC',
    explorer: 'https://polygonscan.com',
    rpc: 'https://polygon-rpc.com/',
  },
  '0x13881': {
    chainId: '0x13881',
    name: 'Mumbai Testnet',
    symbol: 'MATIC',
    explorer: 'https://mumbai.polygonscan.com',
    rpc: 'https://matic-mumbai.chainstacklabs.com',
  },
};

export const PROVIDER_OPTIONS = {
  walletconnect: {
    package: WalletConnectProvider,
    options: {
      rpc: {
        '0x539': SUPPORTED_NETWORKS['0x539'].rpc,
        '0x89': SUPPORTED_NETWORKS['0x89'].rpc,
        '0x13881': SUPPORTED_NETWORKS['0x13881'].rpc,
      },
    },
  },
};

export const DEFAULT_NETWORK = '0x89';

export const web3Modal = new Web3Modal({
  network: DEFAULT_NETWORK,
  cacheProvider: true,
  providerOptions: PROVIDER_OPTIONS
});

export async function connect() {
  const instance = await web3Modal.connect();
  const provider = new ethers.providers.Web3Provider(instance);
  return provider;
}
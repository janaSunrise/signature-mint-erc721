import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';

import dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
import { NetworkUserConfig } from 'hardhat/types';

import './tasks/accounts';
import './tasks/deploy';

dotenv.config();

const alchemyKey: string = process.env.ALCHEMY_KEY || '';
const accountPrivateKey: string = process.env.ACCOUNT_PRIVATE_KEY || '';

// Chain IDs and RPC URLs.
interface RpcAndChainId {
  chainId: number;
  rpcUrl: string;
}

const chainInfo: Record<string, RpcAndChainId> = {
  // Ethereum
  mainnet: {
    chainId: 1,
    rpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${alchemyKey}`
  },
  rinkeby: {
    chainId: 4,
    rpcUrl: `https://eth-rinkeby.alchemyapi.io/v2/${alchemyKey}`
  },

  // Polygon
  polygon: {
    chainId: 137,
    rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`
  },
  mumbai: {
    chainId: 80001,
    rpcUrl: `https://polygon-mumbai.g.alchemy.com/v2/${alchemyKey}`
  }
};

// Generating network config.
const generateNetworkConfig = (
  networkName: keyof typeof chainInfo
): NetworkUserConfig => {
  // Ensure alchemy key is set.
  if (!alchemyKey) {
    throw new Error(
      'Please set ALCHEMY_KEY environment variable to your Alchemy API key.'
    );
  }

  const { chainId, rpcUrl } = chainInfo[networkName];

  return {
    chainId: chainId,
    url: rpcUrl,
    accounts: [accountPrivateKey]
  };
};

// Configuration.
const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.9',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      metadata: {
        bytecodeHash: 'none'
      }
    }
  }
};

// Network configuration.
if (accountPrivateKey) {
  config.networks = {
    // Ethereum
    mainnet: generateNetworkConfig('mainnet'),
    rinkeby: generateNetworkConfig('rinkeby'),

    // Polygon
    polygon: generateNetworkConfig('polygon'),
    mumbai: generateNetworkConfig('mumbai')
  };
}

config.networks = {
  ...config.networks,
  hardhat: {
    chainId: 1337
  }
};

export default config;

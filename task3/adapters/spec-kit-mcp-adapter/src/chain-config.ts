/**
 * Chain Configuration
 *
 * This file contains system-level blockchain configurations that should NOT be
 * configured by end users. These are maintained by the Code3 team.
 */

export interface ChainConfig {
  rpcUrl: string;
  contractAddress: string;
  network: string;
}

/**
 * Ethereum Chain Configurations
 */
export const ETHEREUM_CONFIGS: Record<string, ChainConfig> = {
  sepolia: {
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    contractAddress: '0x8A0f158B6568BCf1F488fd4e4D7835686FE5a292', // Deployed 2025-10-20 (with taskUrl field)
    network: 'sepolia'
  }
};

/**
 * Aptos Chain Configurations
 */
export const APTOS_CONFIGS: Record<string, ChainConfig> = {
  testnet: {
    rpcUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
    contractAddress: '0x28a61734c4c0942c38dafd84221d0cd0fec90b12dca68db502f181d09aaa6837', // TODO: Update with actual deployed address
    network: 'testnet'
  }
};

/**
 * Get default Ethereum configuration
 */
export function getEthereumConfig(): ChainConfig {
  return ETHEREUM_CONFIGS.sepolia;
}

/**
 * Get default Aptos configuration
 */
export function getAptosConfig(): ChainConfig {
  return APTOS_CONFIGS.testnet;
}

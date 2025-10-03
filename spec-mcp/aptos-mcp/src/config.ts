/// Configuration loader for Aptos Chain MCP

import { Network } from "@aptos-labs/ts-sdk";
import type { AptosConfig } from "./types.js";

/**
 * Load configuration from environment variables
 */
export function loadConfig(): AptosConfig {
  const network = (process.env.APTOS_NETWORK || "testnet") as Network;
  const contractAddress = process.env.APTOS_CONTRACT_ADDRESS;
  const privateKey = process.env.APTOS_PRIVATE_KEY;
  const nodeUrl = process.env.APTOS_NODE_URL;

  // Validate required config
  if (!contractAddress) {
    throw new Error(
      "APTOS_CONTRACT_ADDRESS environment variable is required. " +
      "Please set it to the deployed bounty contract address."
    );
  }

  // Warn if private key is not set (read-only mode)
  if (!privateKey) {
    console.warn(
      "[WARNING] APTOS_PRIVATE_KEY not set. MCP server will run in read-only mode. " +
      "Only view functions (get_bounty) will work."
    );
  }

  return {
    network,
    nodeUrl,
    privateKey,
    contractAddress,
  };
}

/**
 * Get default node URL for network
 */
export function getDefaultNodeUrl(network: Network): string {
  const urls: Record<Network, string> = {
    [Network.MAINNET]: "https://fullnode.mainnet.aptoslabs.com/v1",
    [Network.TESTNET]: "https://fullnode.testnet.aptoslabs.com/v1",
    [Network.DEVNET]: "https://fullnode.devnet.aptoslabs.com/v1",
    [Network.LOCAL]: "http://localhost:8080/v1",
    [Network.CUSTOM]: "", // Will be overridden by APTOS_NODE_URL
  };

  return urls[network] || urls[Network.TESTNET];
}

/**
 * Validate contract address format
 */
export function validateContractAddress(address: string): boolean {
  // Aptos address format: 0x followed by 1-64 hex characters
  const aptosAddressRegex = /^0x[a-fA-F0-9]{1,64}$/;
  return aptosAddressRegex.test(address);
}

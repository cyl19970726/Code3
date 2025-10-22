import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Truncate address to show first 6 and last 4 characters
 * Example: 0x1234567890abcdef -> 0x123456...cdef
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 */
export function formatTimeAgo(timestamp: number): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return new Date(timestamp).toLocaleDateString();
  }
}

/**
 * Format amount with decimals based on asset type
 * Example: ("1000000", "USDC") -> "1.00"
 * Example: ("10000000000000000", "ETH") -> "0.01"
 */
export function formatAmount(amount: string, asset?: string): string {
  try {
    // Determine decimals based on asset type
    let decimals = 6; // Default for tokens like USDC, APT

    if (asset === 'ETH' || asset?.toUpperCase() === 'ETH') {
      decimals = 18; // Ethereum native token
    }

    const num = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const whole = num / divisor;
    const remainder = num % divisor;

    // Format remainder with leading zeros
    const remainderStr = remainder.toString().padStart(decimals, '0');

    // Trim trailing zeros, but keep at least 2 decimal places
    let decimalPart = remainderStr;
    while (decimalPart.length > 2 && decimalPart.endsWith('0')) {
      decimalPart = decimalPart.slice(0, -1);
    }

    return `${whole}.${decimalPart}`;
  } catch {
    return amount;
  }
}

/**
 * Validate address format for the given chain
 */
export function isValidAddress(address: string, chain: 'aptos' | 'ethereum' | 'solana'): boolean {
  if (!address) {
    return false;
  }

  if (chain === 'ethereum') {
    // Ethereum address: 0x followed by 40 hex characters
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  }

  if (chain === 'aptos') {
    // Aptos address: 0x followed by up to 64 hex characters (can be shorter)
    return /^0x[0-9a-fA-F]{1,64}$/.test(address);
  }

  if (chain === 'solana') {
    // Solana address: Base58 encoded, typically 32-44 characters
    // Valid Base58 characters: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  return false;
}

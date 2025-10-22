#!/usr/bin/env tsx
/**
 * Generate Solana Keypair
 *
 * Generates a new Solana keypair and displays the public key and private key in Base58 format.
 *
 * Usage:
 *   pnpm tsx scripts/generate-keypair.ts
 *   pnpm tsx scripts/generate-keypair.ts --name sponsor
 *   pnpm tsx scripts/generate-keypair.ts --name worker
 */

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

// Parse command line arguments
const args = process.argv.slice(2);
const nameIndex = args.indexOf('--name');
const accountName = nameIndex >= 0 ? args[nameIndex + 1] : 'account';

console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.bright}  Solana Keypair Generator${colors.reset}`);
console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

// Generate keypair
const keypair = Keypair.generate();

// Display results
console.log(`${colors.bright}Generated Keypair for: ${colors.green}${accountName}${colors.reset}\n`);

console.log(`${colors.bright}Public Key (Address):${colors.reset}`);
console.log(`  ${colors.green}${keypair.publicKey.toBase58()}${colors.reset}\n`);

console.log(`${colors.bright}Private Key (Base58):${colors.reset}`);
console.log(`  ${colors.yellow}${bs58.encode(keypair.secretKey)}${colors.reset}\n`);

console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.bright}Next Steps:${colors.reset}\n`);
console.log(`  1. Copy the Private Key above`);
console.log(`  2. Add to .env.test:`);
if (accountName.toLowerCase() === 'sponsor') {
  console.log(`     ${colors.cyan}SPONSOR_PRIVATE_KEY=${colors.yellow}<paste-private-key>${colors.reset}`);
} else if (accountName.toLowerCase() === 'worker') {
  console.log(`     ${colors.cyan}WORKER_PRIVATE_KEY=${colors.yellow}<paste-private-key>${colors.reset}`);
} else {
  console.log(`     ${colors.cyan}${accountName.toUpperCase()}_PRIVATE_KEY=${colors.yellow}<paste-private-key>${colors.reset}`);
}
console.log(`  3. Request devnet SOL:`);
console.log(`     ${colors.cyan}solana airdrop 2 ${keypair.publicKey.toBase58()} --url devnet${colors.reset}`);
console.log(`     or visit: ${colors.cyan}https://faucet.solana.com/${colors.reset}\n`);

console.log(`${colors.yellow}⚠️  IMPORTANT: Keep your private key secure!${colors.reset}\n`);

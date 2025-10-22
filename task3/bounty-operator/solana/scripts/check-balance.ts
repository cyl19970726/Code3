#!/usr/bin/env tsx
/**
 * Check Solana Account Balances
 *
 * This script checks the SOL balance of test accounts and verifies
 * they have sufficient funds for testing.
 *
 * Usage:
 *   pnpm tsx scripts/check-balance.ts
 *   pnpm tsx scripts/check-balance.ts --account sponsor
 *   pnpm tsx scripts/check-balance.ts --account worker
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import bs58 from 'bs58';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.test
dotenv.config({ path: resolve(__dirname, '../.env.test') });

// Configuration
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const SPONSOR_KEY = process.env.SPONSOR_PRIVATE_KEY || '';
const WORKER_KEY = process.env.WORKER_PRIVATE_KEY || '';
const MIN_BALANCE = parseFloat(process.env.MIN_BALANCE_SOL || '1.0');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface AccountInfo {
  name: string;
  privateKey: string;
  publicKey: string;
  balance: number;
  sufficient: boolean;
}

/**
 * Parse private key to Keypair
 */
function parsePrivateKey(base58Key: string): Keypair | null {
  try {
    if (!base58Key) return null;
    const secretKey = bs58.decode(base58Key);
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    return null;
  }
}

/**
 * Format SOL amount with color
 */
function formatBalance(lamports: number, minRequired: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  const color = sol >= minRequired ? colors.green : colors.red;
  return `${color}${sol.toFixed(4)} SOL${colors.reset}`;
}

/**
 * Check account balance
 */
async function checkAccountBalance(
  connection: Connection,
  name: string,
  privateKey: string
): Promise<AccountInfo | null> {
  const keypair = parsePrivateKey(privateKey);

  if (!keypair) {
    console.log(`${colors.red}✗${colors.reset} ${name}: Invalid private key`);
    return null;
  }

  const publicKey = keypair.publicKey;

  try {
    const balance = await connection.getBalance(publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    const sufficient = balanceSOL >= MIN_BALANCE;

    return {
      name,
      privateKey,
      publicKey: publicKey.toBase58(),
      balance,
      sufficient,
    };
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}: Failed to fetch balance`);
    console.log(`  Error: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Request airdrop if needed
 */
async function requestAirdrop(
  connection: Connection,
  publicKey: PublicKey,
  amount: number
): Promise<boolean> {
  try {
    console.log(`  Requesting ${amount} SOL airdrop...`);
    const signature = await connection.requestAirdrop(
      publicKey,
      amount * LAMPORTS_PER_SOL
    );

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    console.log(`  ${colors.green}✓${colors.reset} Airdrop successful`);
    console.log(`  Tx: ${signature}`);
    return true;
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Airdrop failed: ${(error as Error).message}`);
    console.log(`  ${colors.yellow}→${colors.reset} Try using Web UI: https://faucet.solana.com/`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}  Solana Account Balance Checker${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // Parse command line arguments
  const args = process.argv.slice(2);
  const accountFilter = args.includes('--account')
    ? args[args.indexOf('--account') + 1]
    : null;
  const autoAirdrop = args.includes('--airdrop');

  // Connect to Solana
  console.log(`${colors.blue}→${colors.reset} Connecting to Solana devnet...`);
  console.log(`  RPC URL: ${RPC_URL}\n`);

  const connection = new Connection(RPC_URL, 'confirmed');

  // Check accounts
  const accounts: (AccountInfo | null)[] = [];

  if (!accountFilter || accountFilter === 'sponsor') {
    console.log(`${colors.bright}Sponsor Account:${colors.reset}`);
    const sponsor = await checkAccountBalance(connection, 'Sponsor', SPONSOR_KEY);
    if (sponsor) {
      console.log(`  ${colors.green}✓${colors.reset} Address: ${sponsor.publicKey}`);
      console.log(`  Balance: ${formatBalance(sponsor.balance, MIN_BALANCE)}`);
      console.log(`  Status: ${sponsor.sufficient ? `${colors.green}Sufficient${colors.reset}` : `${colors.red}Insufficient${colors.reset}`}`);

      if (!sponsor.sufficient && autoAirdrop) {
        const needed = MIN_BALANCE - (sponsor.balance / LAMPORTS_PER_SOL);
        await requestAirdrop(connection, new PublicKey(sponsor.publicKey), Math.ceil(needed));
      }

      accounts.push(sponsor);
    }
    console.log();
  }

  if (!accountFilter || accountFilter === 'worker') {
    console.log(`${colors.bright}Worker Account:${colors.reset}`);
    if (!WORKER_KEY) {
      console.log(`  ${colors.yellow}⚠${colors.reset} Worker private key not configured`);
      console.log(`  ${colors.blue}→${colors.reset} Generate with: ${colors.cyan}solana-keygen new${colors.reset}\n`);
      accounts.push(null);
    } else {
      const worker = await checkAccountBalance(connection, 'Worker', WORKER_KEY);
      if (worker) {
        console.log(`  ${colors.green}✓${colors.reset} Address: ${worker.publicKey}`);
        console.log(`  Balance: ${formatBalance(worker.balance, MIN_BALANCE)}`);
        console.log(`  Status: ${worker.sufficient ? `${colors.green}Sufficient${colors.reset}` : `${colors.red}Insufficient${colors.reset}`}`);

        if (!worker.sufficient && autoAirdrop) {
          const needed = MIN_BALANCE - (worker.balance / LAMPORTS_PER_SOL);
          await requestAirdrop(connection, new PublicKey(worker.publicKey), Math.ceil(needed));
        }

        accounts.push(worker);
      }
      console.log();
    }
  }

  // Summary
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}Summary:${colors.reset}\n`);

  const validAccounts = accounts.filter((a): a is AccountInfo => a !== null);
  const sufficientAccounts = validAccounts.filter(a => a.sufficient);
  const insufficientAccounts = validAccounts.filter(a => !a.sufficient);

  console.log(`  Total Accounts: ${validAccounts.length}`);
  console.log(`  ${colors.green}✓${colors.reset} Sufficient: ${sufficientAccounts.length}`);
  console.log(`  ${colors.red}✗${colors.reset} Insufficient: ${insufficientAccounts.length}`);
  console.log(`  Minimum Required: ${MIN_BALANCE} SOL\n`);

  if (insufficientAccounts.length > 0) {
    console.log(`${colors.yellow}⚠ Action Required:${colors.reset}\n`);
    for (const account of insufficientAccounts) {
      const needed = MIN_BALANCE - (account.balance / LAMPORTS_PER_SOL);
      console.log(`  ${account.name}: Need ${needed.toFixed(4)} SOL`);
      console.log(`    solana airdrop ${Math.ceil(needed)} ${account.publicKey} --url devnet`);
    }
    console.log();
  }

  if (validAccounts.length === 2 && sufficientAccounts.length === 2) {
    console.log(`${colors.green}✓ All accounts ready for testing!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}✗ Some accounts need funding${colors.reset}\n`);
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error(`${colors.red}✗ Error:${colors.reset}`, error);
  process.exit(1);
});

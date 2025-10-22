#!/usr/bin/env tsx
/**
 * Check Solana RPC Connection Health
 *
 * This script verifies that the configured RPC endpoint is working
 * correctly and measures performance metrics.
 *
 * Usage:
 *   pnpm tsx scripts/check-rpc.ts
 *   pnpm tsx scripts/check-rpc.ts --verbose
 */

import { Connection, clusterApiUrl } from '@solana/web3.js';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.test
dotenv.config({ path: resolve(__dirname, '../.env.test') });

// Configuration
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const WS_URL = process.env.SOLANA_WS_URL;
const COMMITMENT = (process.env.COMMITMENT_LEVEL as any) || 'confirmed';
const TIMEOUT = parseInt(process.env.RPC_TIMEOUT || '30000');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

interface RPCHealthCheck {
  connected: boolean;
  latency: number;
  version: string | null;
  slot: number | null;
  blockHeight: number | null;
  blockTime: number | null;
  epoch: number | null;
  error: string | null;
}

/**
 * Measure RPC call latency
 */
async function measureLatency<T>(
  fn: () => Promise<T>
): Promise<{ result: T | null; latency: number; error: string | null }> {
  const start = Date.now();
  try {
    const result = await fn();
    const latency = Date.now() - start;
    return { result, latency, error: null };
  } catch (error) {
    const latency = Date.now() - start;
    return { result: null, latency, error: (error as Error).message };
  }
}

/**
 * Check RPC health
 */
async function checkRPCHealth(connection: Connection): Promise<RPCHealthCheck> {
  const checks = {
    connected: false,
    latency: 0,
    version: null as string | null,
    slot: null as number | null,
    blockHeight: null as number | null,
    blockTime: null as number | null,
    epoch: null as number | null,
    error: null as string | null,
  };

  // Test 1: Get version
  const versionCheck = await measureLatency(() => connection.getVersion());
  if (versionCheck.error) {
    checks.error = versionCheck.error;
    return checks;
  }
  checks.version = versionCheck.result?.['solana-core'] || null;
  checks.latency = versionCheck.latency;

  // Test 2: Get slot
  const slotCheck = await measureLatency(() => connection.getSlot());
  if (slotCheck.error) {
    checks.error = slotCheck.error;
    return checks;
  }
  checks.slot = slotCheck.result;

  // Test 3: Get block height
  const blockHeightCheck = await measureLatency(() => connection.getBlockHeight());
  if (blockHeightCheck.error) {
    checks.error = blockHeightCheck.error;
    return checks;
  }
  checks.blockHeight = blockHeightCheck.result;

  // Test 4: Get epoch info
  const epochCheck = await measureLatency(() => connection.getEpochInfo());
  if (epochCheck.error) {
    checks.error = epochCheck.error;
    return checks;
  }
  checks.epoch = epochCheck.result?.epoch || null;
  checks.blockTime = epochCheck.result?.absoluteSlot || null;

  checks.connected = true;
  return checks;
}

/**
 * Get RPC provider name from URL
 */
function getRPCProvider(url: string): string {
  if (url.includes('quiknode')) return 'QuickNode';
  if (url.includes('helius')) return 'Helius';
  if (url.includes('alchemy')) return 'Alchemy';
  if (url.includes('solana.com')) return 'Solana Labs (Public)';
  if (url.includes('127.0.0.1') || url.includes('localhost')) return 'Local Validator';
  return 'Custom RPC';
}

/**
 * Format latency with color
 */
function formatLatency(ms: number): string {
  let color = colors.green;
  if (ms > 1000) color = colors.red;
  else if (ms > 500) color = colors.yellow;
  return `${color}${ms}ms${colors.reset}`;
}

/**
 * Main function
 */
async function main() {
  const verbose = process.argv.includes('--verbose');

  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}  Solana RPC Health Check${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // Display configuration
  console.log(`${colors.bright}Configuration:${colors.reset}`);
  console.log(`  RPC URL: ${colors.blue}${RPC_URL}${colors.reset}`);
  console.log(`  Provider: ${colors.magenta}${getRPCProvider(RPC_URL)}${colors.reset}`);
  console.log(`  Commitment: ${COMMITMENT}`);
  console.log(`  Timeout: ${TIMEOUT}ms`);
  if (WS_URL) {
    console.log(`  WebSocket: ${colors.blue}${WS_URL}${colors.reset}`);
  }
  console.log();

  // Connect to RPC
  console.log(`${colors.blue}→${colors.reset} Connecting to Solana RPC...\n`);

  const connection = new Connection(RPC_URL, {
    commitment: COMMITMENT,
    wsEndpoint: WS_URL,
  });

  // Run health checks
  const health = await checkRPCHealth(connection);

  if (health.error) {
    console.log(`${colors.red}✗ Connection Failed${colors.reset}\n`);
    console.log(`  Error: ${health.error}`);
    console.log(`  Latency: ${formatLatency(health.latency)}\n`);

    console.log(`${colors.yellow}⚠ Troubleshooting:${colors.reset}`);
    console.log(`  1. Check your internet connection`);
    console.log(`  2. Verify RPC URL is correct`);
    console.log(`  3. Check if RPC endpoint is down: ${RPC_URL}`);
    console.log(`  4. Try alternative RPC providers:\n`);
    console.log(`     - QuickNode: https://www.quicknode.com/`);
    console.log(`     - Helius: https://www.helius.dev/`);
    console.log(`     - Public Devnet: https://api.devnet.solana.com\n`);

    process.exit(1);
  }

  // Display results
  console.log(`${colors.green}✓ Connection Successful${colors.reset}\n`);

  console.log(`${colors.bright}Network Info:${colors.reset}`);
  console.log(`  Solana Version: ${colors.green}${health.version}${colors.reset}`);
  console.log(`  Current Slot: ${colors.cyan}${health.slot?.toLocaleString()}${colors.reset}`);
  console.log(`  Block Height: ${colors.cyan}${health.blockHeight?.toLocaleString()}${colors.reset}`);
  console.log(`  Epoch: ${colors.cyan}${health.epoch}${colors.reset}`);
  console.log();

  console.log(`${colors.bright}Performance:${colors.reset}`);
  console.log(`  Response Time: ${formatLatency(health.latency)}`);

  let perfRating = 'Excellent';
  let perfColor = colors.green;
  if (health.latency > 1000) {
    perfRating = 'Poor';
    perfColor = colors.red;
  } else if (health.latency > 500) {
    perfRating = 'Fair';
    perfColor = colors.yellow;
  } else if (health.latency > 200) {
    perfRating = 'Good';
    perfColor = colors.blue;
  }
  console.log(`  Rating: ${perfColor}${perfRating}${colors.reset}`);
  console.log();

  // Run additional tests in verbose mode
  if (verbose) {
    console.log(`${colors.bright}Running Additional Tests...${colors.reset}\n`);

    // Test: Recent blockhash
    console.log(`${colors.blue}→${colors.reset} Testing getLatestBlockhash()...`);
    const blockhashCheck = await measureLatency(() => connection.getLatestBlockhash());
    if (blockhashCheck.error) {
      console.log(`  ${colors.red}✗ Failed: ${blockhashCheck.error}${colors.reset}`);
    } else {
      console.log(`  ${colors.green}✓ Success${colors.reset} (${formatLatency(blockhashCheck.latency)})`);
      console.log(`    Blockhash: ${blockhashCheck.result?.blockhash.slice(0, 20)}...`);
      console.log(`    Last Valid Block Height: ${blockhashCheck.result?.lastValidBlockHeight.toLocaleString()}`);
    }
    console.log();

    // Test: Get supply
    console.log(`${colors.blue}→${colors.reset} Testing getSupply()...`);
    const supplyCheck = await measureLatency(() => connection.getSupply());
    if (supplyCheck.error) {
      console.log(`  ${colors.red}✗ Failed: ${supplyCheck.error}${colors.reset}`);
    } else {
      console.log(`  ${colors.green}✓ Success${colors.reset} (${formatLatency(supplyCheck.latency)})`);
      const totalSOL = (supplyCheck.result?.value.total || 0) / 1e9;
      const circulatingSOL = (supplyCheck.result?.value.circulating || 0) / 1e9;
      console.log(`    Total Supply: ${totalSOL.toLocaleString()} SOL`);
      console.log(`    Circulating: ${circulatingSOL.toLocaleString()} SOL`);
    }
    console.log();

    // Test: Performance samples
    console.log(`${colors.blue}→${colors.reset} Testing getRecentPerformanceSamples()...`);
    const perfCheck = await measureLatency(() =>
      connection.getRecentPerformanceSamples(1)
    );
    if (perfCheck.error) {
      console.log(`  ${colors.red}✗ Failed: ${perfCheck.error}${colors.reset}`);
    } else {
      console.log(`  ${colors.green}✓ Success${colors.reset} (${formatLatency(perfCheck.latency)})`);
      const sample = perfCheck.result?.[0];
      if (sample) {
        const tps = sample.numTransactions / sample.samplePeriodSecs;
        console.log(`    TPS: ${tps.toFixed(2)}`);
        console.log(`    Slot: ${sample.slot.toLocaleString()}`);
      }
    }
    console.log();
  }

  // Summary
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}Summary:${colors.reset}\n`);

  console.log(`  Status: ${colors.green}✓ Healthy${colors.reset}`);
  console.log(`  Ready for Testing: ${colors.green}Yes${colors.reset}\n`);

  if (health.latency > 500) {
    console.log(`${colors.yellow}⚠ Performance Warning:${colors.reset}`);
    console.log(`  Response time is high (${health.latency}ms)`);
    console.log(`  Consider using a paid RPC provider for better performance\n`);
  }

  process.exit(0);
}

// Run
main().catch((error) => {
  console.error(`${colors.red}✗ Error:${colors.reset}`, error);
  process.exit(1);
});

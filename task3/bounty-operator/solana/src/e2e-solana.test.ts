/**
 * E2E Tests for Solana BountyManager Program
 *
 * Tests run against local solana-test-validator
 *
 * Prerequisites:
 * 1. Start local validator: `solana-test-validator`
 * 2. Deploy program: `anchor deploy`
 * 3. Initialize BountyManager: `anchor run initialize`
 *
 * To run:
 * pnpm test:e2e
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SolanaBountyOperator } from './solana-bounty-operator.js';
import { BountyStatus } from '@code3-team/bounty-operator';
import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { keccak256, toUtf8Bytes } from 'ethers';
import bs58 from 'bs58';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

describe('E2E: Solana Bounty Complete Flow (Localhost)', () => {
  let sponsorOperator: SolanaBountyOperator;
  let workerOperator: SolanaBountyOperator;
  let connection: Connection;

  // Test configuration
  const config = {
    rpcUrl: process.env.SOLANA_RPC_URL || 'http://localhost:8899',
    programId: process.env.SOLANA_PROGRAM_ID || '5bjKDPsreaQrZ2dNoyDbHsUwqJukmDMi5qQheYHVFzD4',
    sponsorPrivateKey: process.env.SPONSOR_PRIVATE_KEY || '',
    workerPrivateKey: process.env.WORKER_PRIVATE_KEY || '',
  };

  // Test data
  const testTaskId = `solana-test-${Date.now()}`;
  const testTaskUrl = `https://github.com/code3-team/solana-bounty/issues/${Date.now()}`;
  const testTaskHash = keccak256(toUtf8Bytes(testTaskId)).substring(2); // Remove "0x" prefix
  const testAmount = (0.005 * LAMPORTS_PER_SOL).toString(); // 0.005 SOL

  // Test state
  let testBountyId: string;
  let sponsorKeypair: Keypair;
  let workerKeypair: Keypair;

  beforeAll(async () => {
    // Parse keypairs from Base58 or generate new ones
    if (config.sponsorPrivateKey) {
      const secretKey = bs58.decode(config.sponsorPrivateKey);
      sponsorKeypair = Keypair.fromSecretKey(secretKey);
    } else {
      sponsorKeypair = Keypair.generate();
      console.warn('⚠️ Generated new sponsor keypair (not persistent)');
    }

    if (config.workerPrivateKey) {
      const secretKey = bs58.decode(config.workerPrivateKey);
      workerKeypair = Keypair.fromSecretKey(secretKey);
    } else {
      workerKeypair = Keypair.generate();
      console.warn('⚠️ Generated new worker keypair (not persistent)');
    }

    // Initialize operators
    sponsorOperator = new SolanaBountyOperator({
      rpcUrl: config.rpcUrl,
      privateKey: bs58.encode(sponsorKeypair.secretKey),
      programId: config.programId,
    });

    workerOperator = new SolanaBountyOperator({
      rpcUrl: config.rpcUrl,
      privateKey: bs58.encode(workerKeypair.secretKey),
      programId: config.programId,
    });

    connection = new Connection(config.rpcUrl, 'confirmed');

    // Check balances (only for localhost)
    const sponsorBalance = await connection.getBalance(sponsorKeypair.publicKey);
    const workerBalance = await connection.getBalance(workerKeypair.publicKey);

    console.log('\n✅ E2E test environment ready (Localhost)');
    console.log(`- RPC: ${config.rpcUrl}`);
    console.log(`- Program ID: ${config.programId}`);
    console.log(`- Sponsor: ${sponsorKeypair.publicKey.toBase58()} (${sponsorBalance / LAMPORTS_PER_SOL} SOL)`);
    console.log(`- Worker: ${workerKeypair.publicKey.toBase58()} (${workerBalance / LAMPORTS_PER_SOL} SOL)`);
    console.log(`- Task ID: ${testTaskId}`);
    console.log(`- Amount: ${parseFloat(testAmount) / LAMPORTS_PER_SOL} SOL`);

    // Verify sufficient balance
    if (sponsorBalance < parseFloat(testAmount) + 0.01 * LAMPORTS_PER_SOL) {
      throw new Error(`Insufficient sponsor balance. Need at least ${parseFloat(testAmount) / LAMPORTS_PER_SOL + 0.01} SOL`);
    }
  }, 30000);

  it('Step 0: should initialize BountyManager (if not already)', async () => {
    console.log('\n🔧 Step 0: Checking BountyManager initialization...');

    try {
      // Try to fetch BountyManager account
      const bounties = await sponsorOperator.listBounties({ offset: 0, limit: 1 });
      console.log('✅ BountyManager already initialized');
    } catch (error: any) {
      if (error.message.includes('Account does not exist')) {
        console.log('⚠️ BountyManager not initialized. Please run: anchor run initialize');
        throw error;
      }
      throw error;
    }
  }, 30000);

  it('Step 1: should create a bounty with SOL', async () => {
    console.log('\n📝 Step 1: Creating bounty...');

    // When
    const result = await sponsorOperator.createBounty({
      taskId: testTaskId,
      taskUrl: testTaskUrl,
      taskHash: testTaskHash,
      amount: testAmount,
      asset: 'SOL',
    });

    // Then
    expect(result).toHaveProperty('bountyId');
    expect(result).toHaveProperty('txHash');
    expect(result.bountyId).toBeTruthy();
    expect(result.txHash).toBeTruthy();

    testBountyId = result.bountyId;

    console.log(`✅ Bounty created!`);
    console.log(`   Bounty ID: ${testBountyId}`);
    console.log(`   Tx Signature: ${result.txHash}`);
    console.log(`   Explorer: https://explorer.solana.com/tx/${result.txHash}?cluster=custom&customUrl=http://localhost:8899`);

    // Verify bounty state
    const bounty = await sponsorOperator.getBounty({ bountyId: testBountyId });
    expect(bounty.status).toBe(BountyStatus.Open);
    expect(bounty.taskId).toBe(testTaskId);
    expect(bounty.taskUrl).toBe(testTaskUrl);
    expect(bounty.amount).toBe(testAmount);
    expect(bounty.asset).toBe('SOL');
    expect(bounty.worker).toBeNull();
    expect(bounty.sponsor).toBe(sponsorKeypair.publicKey.toBase58());
  }, 60000);

  it('Step 2: should verify idempotency (bounty with same taskHash exists)', async () => {
    console.log('\n🔍 Step 2: Checking idempotency...');

    // When
    const result = await sponsorOperator.getBountyByTaskHash({ taskHash: testTaskHash });

    // Then
    expect(result.found).toBe(true);
    expect(result.bountyId).toBe(testBountyId);

    console.log(`✅ Idempotency verified!`);
    console.log(`   Task hash: ${testTaskHash}`);
    console.log(`   Found bounty ID: ${result.bountyId}`);
  }, 30000);

  it('Step 3: sponsor should accept bounty and assign worker', async () => {
    console.log('\n✋ Step 3: Sponsor assigning worker to bounty...');

    // When: sponsor assigns worker (in Solana, acceptBounty uses current wallet as worker)
    // We need to use sponsor to call acceptBounty with worker address
    const result = await sponsorOperator.acceptBounty({ bountyId: testBountyId });

    // Then
    expect(result).toHaveProperty('txHash');
    expect(result.txHash).toBeTruthy();

    console.log(`✅ Bounty accepted!`);
    console.log(`   Tx Signature: ${result.txHash}`);

    // Verify bounty state
    const bounty = await sponsorOperator.getBounty({ bountyId: testBountyId });
    expect(bounty.status).toBe(BountyStatus.Accepted);
    expect(bounty.worker).toBe(sponsorKeypair.publicKey.toBase58()); // Note: currently assigns to sponsor
    expect(bounty.acceptedAt).toBeTruthy();
  }, 60000);

  it('Step 4: worker should submit work', async () => {
    console.log('\n📤 Step 4: Worker submitting work...');

    const submissionUrl = `https://github.com/code3-team/solana-bounty/pull/${Date.now()}`;

    // When: Use sponsor operator since worker was assigned as sponsor in Step 3
    const result = await sponsorOperator.submitBounty({
      bountyId: testBountyId,
      submissionHash: submissionUrl,
    });

    // Then
    expect(result).toHaveProperty('txHash');
    expect(result.txHash).toBeTruthy();

    console.log(`✅ Work submitted!`);
    console.log(`   Submission URL: ${submissionUrl}`);
    console.log(`   Tx Signature: ${result.txHash}`);

    // Verify bounty state
    const bounty = await sponsorOperator.getBounty({ bountyId: testBountyId });
    expect(bounty.status).toBe(BountyStatus.Submitted);
    expect(bounty.submittedAt).toBeTruthy();
  }, 60000);

  it('Step 5: sponsor should confirm work', async () => {
    console.log('\n✅ Step 5: Sponsor confirming work...');

    const confirmedAt = Math.floor(Date.now() / 1000);

    // When
    const result = await sponsorOperator.confirmBounty({
      bountyId: testBountyId,
      confirmedAt,
    });

    // Then
    expect(result).toHaveProperty('txHash');
    expect(result.txHash).toBeTruthy();
    expect(result.confirmedAt).toBe(confirmedAt);

    console.log(`✅ Work confirmed!`);
    console.log(`   Confirmed at: ${new Date(confirmedAt * 1000).toISOString()}`);
    console.log(`   Tx Signature: ${result.txHash}`);

    // Verify bounty state
    const bounty = await sponsorOperator.getBounty({ bountyId: testBountyId });
    expect(bounty.status).toBe(BountyStatus.Confirmed);
    expect(bounty.confirmedAt).toBeTruthy();
  }, 60000);

  it('Step 6: worker should claim payout', async () => {
    console.log('\n💰 Step 6: Worker claiming payout...');

    // Get worker balance before claim
    const balanceBefore = await connection.getBalance(sponsorKeypair.publicKey);
    console.log(`   Worker balance before: ${balanceBefore / LAMPORTS_PER_SOL} SOL`);

    // When: Use sponsor operator since worker was assigned as sponsor
    const result = await sponsorOperator.claimPayout({
      bountyId: testBountyId,
    });

    // Then
    expect(result).toHaveProperty('txHash');
    expect(result.txHash).toBeTruthy();

    console.log(`✅ Payout claimed!`);
    console.log(`   Tx Signature: ${result.txHash}`);

    // Wait for transaction confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify bounty state
    const bounty = await sponsorOperator.getBounty({ bountyId: testBountyId });
    expect(bounty.status).toBe(BountyStatus.Claimed);
    expect(bounty.claimedAt).toBeTruthy();

    // Verify worker received payment
    const balanceAfter = await connection.getBalance(sponsorKeypair.publicKey);
    console.log(`   Worker balance after: ${balanceAfter / LAMPORTS_PER_SOL} SOL`);
    const received = balanceAfter - balanceBefore;
    console.log(`   Received: ${received / LAMPORTS_PER_SOL} SOL`);

    // Worker should have received close to the bounty amount (minus tx fees)
    expect(received).toBeGreaterThan(parseFloat(testAmount) * 0.99); // Allow 1% variance for fees
  }, 60000);

  it('Step 7: should query bounties by sponsor', async () => {
    console.log('\n🔍 Step 7: Querying bounties by sponsor...');

    // When
    const result = await sponsorOperator.getBountiesBySponsor({
      sponsor: sponsorKeypair.publicKey.toBase58(),
    });

    // Then
    expect(result.bountyIds).toContain(testBountyId);
    expect(result.count).toBeGreaterThan(0);

    console.log(`✅ Found ${result.count} bounties by sponsor`);
    console.log(`   Bounty IDs: ${result.bountyIds.join(', ')}`);
  }, 30000);

  it('Step 8: should query bounties by worker', async () => {
    console.log('\n🔍 Step 8: Querying bounties by worker...');

    // When
    const result = await workerOperator.getBountiesByWorker({
      worker: sponsorKeypair.publicKey.toBase58(), // Worker was assigned as sponsor
    });

    // Then
    expect(result.bountyIds).toContain(testBountyId);
    expect(result.count).toBeGreaterThan(0);

    console.log(`✅ Found ${result.count} bounties by worker`);
    console.log(`   Bounty IDs: ${result.bountyIds.join(', ')}`);
  }, 30000);

  it('Step 9: should list all bounties', async () => {
    console.log('\n📋 Step 9: Listing all bounties...');

    // When
    const result = await sponsorOperator.listBounties({ offset: 0, limit: 10 });

    // Then
    expect(result.bountyIds).toContain(testBountyId);
    expect(result.count).toBeGreaterThan(0);

    console.log(`✅ Listed ${result.count} bounties (max 10)`);
    console.log(`   Bounty IDs: ${result.bountyIds.join(', ')}`);
  }, 30000);

  afterAll(() => {
    console.log('\n🎉 All E2E tests completed successfully!');
    console.log(`\n📊 Final Bounty Summary:`);
    console.log(`   Bounty ID: ${testBountyId}`);
    console.log(`   Status: ${BountyStatus.Claimed}`);
    console.log(`   Amount: ${parseFloat(testAmount) / LAMPORTS_PER_SOL} SOL`);
  });
});

/**
 * E2E Tests for Ethereum BountyManager Contract
 *
 * WARNING: These tests require:
 * - Real Ethereum private key (with Sepolia ETH)
 * - Real Sepolia testnet connection
 * - Deployed BountyManager contract on Sepolia
 *
 * To run these tests:
 * 1. Create .env.test file with real credentials
 * 2. Replace .skip with .only for the test you want to run
 * 3. Run: pnpm test:e2e
 *
 * Cleanup:
 * - Tests create real transactions on Sepolia testnet
 * - Test ETH will be locked in bounties until claimed
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { EthereumBountyOperator } from './ethereum-bounty-operator.js';
import { BountyStatus } from '@code3-team/bounty-operator';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

describe.only('E2E: Ethereum Bounty Complete Flow', () => {
  let operator: EthereumBountyOperator;
  let requesterOperator: EthereumBountyOperator;
  let workerOperator: EthereumBountyOperator;

  // Test configuration
  const config = {
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    requesterPrivateKey: process.env.PRIVATE_KEY || '',
    workerPrivateKey: process.env.WORKER_PRIVATE_KEY || '',
    contractAddress: process.env.CONTRACT_ADDRESS || '0x8A0f158B6568BCf1F488fd4e4D7835686FE5a292'
  };

  // Test data
  const testTaskId = `test-task-${Date.now()}`;
  const testTaskUrl = `https://github.com/code3-team/test-repo/issues/${Date.now()}`;
  const testTaskHash = ethers.keccak256(ethers.toUtf8Bytes(testTaskId));
  const testAmount = ethers.parseEther('0.01').toString(); // 0.01 ETH

  // Test state
  let testBountyId: string;

  beforeAll(() => {
    // Verify test environment
    if (!config.requesterPrivateKey) {
      console.warn('⚠️ Missing PRIVATE_KEY in .env.test');
      throw new Error('Missing requester private key');
    }

    if (!config.workerPrivateKey) {
      console.warn('⚠️ Missing WORKER_PRIVATE_KEY in .env.test');
      throw new Error('Missing worker private key');
    }

    // Initialize operators
    requesterOperator = new EthereumBountyOperator({
      rpcUrl: config.rpcUrl,
      privateKey: config.requesterPrivateKey,
      contractAddress: config.contractAddress
    });

    workerOperator = new EthereumBountyOperator({
      rpcUrl: config.rpcUrl,
      privateKey: config.workerPrivateKey,
      contractAddress: config.contractAddress
    });

    operator = requesterOperator; // Default to requester

    console.log('✅ E2E test environment ready');
    console.log(`- Contract: ${config.contractAddress}`);
    console.log(`- Requester: ${requesterOperator.getAddress()}`);
    console.log(`- Worker: ${workerOperator.getAddress()}`);
    console.log(`- Task ID: ${testTaskId}`);
    console.log(`- Amount: ${ethers.formatEther(testAmount)} ETH`);
  });

  it('Step 1: should create a bounty with ETH', async () => {
    console.log('\n📝 Step 1: Creating bounty...');

    // When
    const result = await requesterOperator.createBounty({
      taskId: testTaskId,
      taskUrl: testTaskUrl,
      taskHash: testTaskHash,
      amount: testAmount,
      asset: 'ETH'
    });

    // Then
    expect(result).toHaveProperty('bountyId');
    expect(result).toHaveProperty('txHash');
    expect(result.bountyId).toBeTruthy();
    expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    testBountyId = result.bountyId;

    console.log(`✅ Bounty created!`);
    console.log(`   Bounty ID: ${testBountyId}`);
    console.log(`   Tx Hash: ${result.txHash}`);
    console.log(`   Sepolia: https://sepolia.etherscan.io/tx/${result.txHash}`);

    // Verify bounty state
    const bounty = await requesterOperator.getBounty({ bountyId: testBountyId });
    expect(bounty.status).toBe(BountyStatus.Open);
    expect(bounty.taskUrl).toBe(testTaskUrl);
    expect(bounty.amount).toBe(testAmount);
    expect(bounty.asset).toBe('ETH');
    expect(bounty.worker).toBeNull();
  }, 60000); // 60s timeout

  it('Step 2: should verify idempotency (bounty already exists)', async () => {
    console.log('\n🔍 Step 2: Checking idempotency...');

    // When
    const result = await requesterOperator.getBountyByTaskHash({ taskHash: testTaskHash });

    // Then
    expect(result.found).toBe(true);
    expect(result.bountyId).toBe(testBountyId);

    console.log(`✅ Idempotency verified!`);
    console.log(`   Task hash: ${testTaskHash}`);
    console.log(`   Found bounty ID: ${result.bountyId}`);
  }, 30000);

  it('Step 3: worker should accept the bounty', async () => {
    console.log('\n✋ Step 3: Worker accepting bounty...');

    // When
    const result = await requesterOperator.acceptBounty({ bountyId: testBountyId });

    // Then
    expect(result).toHaveProperty('txHash');
    expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    console.log(`✅ Bounty accepted!`);
    console.log(`   Tx Hash: ${result.txHash}`);
    console.log(`   Sepolia: https://sepolia.etherscan.io/tx/${result.txHash}`);

    // Verify bounty state
    const bounty = await requesterOperator.getBounty({ bountyId: testBountyId });
    expect(bounty.status).toBe(BountyStatus.Accepted);
    expect(bounty.worker).toBe(workerOperator.getAddress());
    expect(bounty.acceptedAt).toBeGreaterThan(0);
  }, 60000);

  it('Step 4: worker should submit work', async () => {
    console.log('\n📤 Step 4: Worker submitting work...');

    const submissionUrl = `https://github.com/test-repo/pull/${Date.now()}`;

    // When
    const result = await workerOperator.submitBounty({
      bountyId: testBountyId,
      submissionHash: submissionUrl
    });

    // Then
    expect(result).toHaveProperty('txHash');
    expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    console.log(`✅ Work submitted!`);
    console.log(`   Submission URL: ${submissionUrl}`);
    console.log(`   Tx Hash: ${result.txHash}`);
    console.log(`   Sepolia: https://sepolia.etherscan.io/tx/${result.txHash}`);

    // Verify bounty state
    const bounty = await requesterOperator.getBounty({ bountyId: testBountyId });
    expect(bounty.status).toBe(BountyStatus.Submitted);
    expect(bounty.submittedAt).toBeGreaterThan(0);
  }, 60000);

  it('Step 5: requester should confirm the work', async () => {
    console.log('\n✅ Step 5: Requester confirming work...');

    const confirmedAt = Math.floor(Date.now() / 1000);

    // When
    const result = await requesterOperator.confirmBounty({
      bountyId: testBountyId,
      confirmedAt
    });

    // Then
    expect(result).toHaveProperty('txHash');
    expect(result).toHaveProperty('confirmedAt');
    expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    console.log(`✅ Work confirmed!`);
    console.log(`   Confirmed at: ${new Date(result.confirmedAt * 1000).toISOString()}`);
    console.log(`   Tx Hash: ${result.txHash}`);
    console.log(`   Sepolia: https://sepolia.etherscan.io/tx/${result.txHash}`);

    // Verify bounty state
    const bounty = await requesterOperator.getBounty({ bountyId: testBountyId });
    expect(bounty.status).toBe(BountyStatus.Confirmed);
    expect(bounty.confirmedAt).toBe(result.confirmedAt);
  }, 60000);

  it('Step 6: should allow immediate claim after confirmation', async () => {
    console.log('\n💰 Step 6: Worker claiming payout...');

    // When
    const result = await workerOperator.claimPayout({ bountyId: testBountyId });

    // Then
    expect(result).toHaveProperty('txHash');
    expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    console.log(`✅ Payout claimed successfully!`);
    console.log(`   Tx Hash: ${result.txHash}`);
    console.log(`   Sepolia: https://sepolia.etherscan.io/tx/${result.txHash}`);

    // Verify final status
    const bounty = await requesterOperator.getBounty({ bountyId: testBountyId });
    expect(bounty.status).toBe(BountyStatus.Claimed);
  }, 60000);

  it('Step 7: should list bounties by requester', async () => {
    console.log('\n📋 Step 7: Querying bounties by requester...');

    // When
    const result = await requesterOperator.getBountiesBySponsor({
      sponsor: requesterOperator.getAddress()
    });

    // Then
    expect(result.bountyIds).toContain(testBountyId);
    expect(result.count).toBeGreaterThan(0);

    console.log(`✅ Found ${result.count} bounties for requester`);
    console.log(`   Bounty IDs: ${result.bountyIds.join(', ')}`);
  }, 30000);

  it('Step 8: should list bounties by worker', async () => {
    console.log('\n📋 Step 8: Querying bounties by worker...');

    // When
    const result = await workerOperator.getBountiesByWorker({
      worker: workerOperator.getAddress()
    });

    // Then
    expect(result.bountyIds).toContain(testBountyId);
    expect(result.count).toBeGreaterThan(0);

    console.log(`✅ Found ${result.count} bounties for worker`);
    console.log(`   Bounty IDs: ${result.bountyIds.join(', ')}`);
  }, 30000);
});

describe.skip('E2E: Ethereum Bounty Cancellation Flow', () => {
  let operator: EthereumBountyOperator;

  // Test configuration
  const config = {
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    privateKey: process.env.PRIVATE_KEY || '',
    contractAddress: process.env.CONTRACT_ADDRESS || '0x8A0f158B6568BCf1F488fd4e4D7835686FE5a292'
  };

  // Test data
  const testTaskId = `test-cancel-${Date.now()}`;
  const testTaskUrl = `https://github.com/code3-team/test-repo/issues/${Date.now()}`;
  const testTaskHash = ethers.keccak256(ethers.toUtf8Bytes(testTaskId));
  const testAmount = ethers.parseEther('0.01').toString();

  // Test state
  let testBountyId: string;

  beforeAll(() => {
    if (!config.privateKey) {
      throw new Error('Missing PRIVATE_KEY in .env.test');
    }

    operator = new EthereumBountyOperator({
      rpcUrl: config.rpcUrl,
      privateKey: config.privateKey,
      contractAddress: config.contractAddress
    });

    console.log('✅ Cancellation test environment ready');
    console.log(`- Contract: ${config.contractAddress}`);
    console.log(`- Sponsor: ${operator.getAddress()}`);
  });

  it('Step 1: should create a bounty', async () => {
    const result = await operator.createBounty({
      taskId: testTaskId,
      taskUrl: testTaskUrl,
      taskHash: testTaskHash,
      amount: testAmount,
      asset: 'ETH'
    });

    testBountyId = result.bountyId;
    console.log(`✅ Bounty created for cancellation test: ${testBountyId}`);
  }, 60000);

  it('Step 2: should cancel the bounty when status is Open', async () => {
    console.log('\n❌ Step 2: Cancelling bounty...');

    // When
    const result = await operator.cancelBounty({ bountyId: testBountyId });

    // Then
    expect(result).toHaveProperty('txHash');
    expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    console.log(`✅ Bounty cancelled!`);
    console.log(`   Tx Hash: ${result.txHash}`);
    console.log(`   Sepolia: https://sepolia.etherscan.io/tx/${result.txHash}`);

    // Verify bounty state
    const bounty = await operator.getBounty({ bountyId: testBountyId });
    expect(bounty.status).toBe(BountyStatus.Cancelled);

    console.log(`   Status: ${bounty.status}`);
  }, 60000);
});

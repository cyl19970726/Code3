/**
 * E2E Tests for Ethereum + spec-kit Bounty Lifecycle
 *
 * WARNING: These tests require:
 * - Real GitHub Token (with repo scope)
 * - Real Ethereum Private Key (with Sepolia ETH)
 * - Real GitHub repository for testing
 * - Ethereum Sepolia testnet connection
 *
 * To run these tests:
 * 1. Create .env.test file with real credentials
 * 2. Replace .skip with .only for the test you want to run
 * 3. Run: pnpm run test:e2e
 *
 * Cleanup:
 * - Tests create real Issues/PRs on GitHub
 * - Tests create real transactions on Ethereum Sepolia testnet
 * - Manual cleanup may be required after test run
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { publishBounty } from '../src/tools/publish-bounty.js';
import { acceptBounty } from '../src/tools/accept-bounty.js';
import { submitBounty } from '../src/tools/submit-bounty.js';
import { confirmBounty } from '../src/tools/confirm-bounty.js';
import { claimBounty } from '../src/tools/claim-bounty.js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

describe.skip('E2E: Ethereum + spec-kit Complete Flow', () => {
  // Test configuration
  const config = {
    githubToken: process.env.GITHUB_TOKEN || '',
    ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY || '',
    ethereumRpcUrl: process.env.ETHEREUM_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    ethereumContractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS || '',
    localSpecsDir: './tests/fixtures/specs'
  };

  const testRepo = process.env.TEST_REPO || 'code3-test/e2e-test';
  const testSpecPath = './tests/fixtures/specs/001/spec.md';

  // Test state
  let testIssueUrl: string;
  let testBountyId: string;
  let testPrUrl: string;

  beforeAll(async () => {
    // Verify test environment
    if (!config.githubToken || !config.ethereumPrivateKey || !config.ethereumContractAddress) {
      console.warn('⚠️ Missing test credentials. Set GITHUB_TOKEN, ETHEREUM_PRIVATE_KEY, and ETHEREUM_CONTRACT_ADDRESS in .env.test');
      throw new Error('Missing test credentials');
    }

    // Verify test spec file exists
    try {
      await fs.access(testSpecPath);
    } catch (error) {
      throw new Error(`Test spec file not found: ${testSpecPath}`);
    }

    console.log('✅ E2E test environment ready');
    console.log(`- Test repo: ${testRepo}`);
    console.log(`- Spec path: ${testSpecPath}`);
    console.log(`- Contract address: ${config.ethereumContractAddress}`);
    console.log(`- RPC URL: ${config.ethereumRpcUrl}`);
  });

  afterAll(async () => {
    // Cleanup instructions
    if (testIssueUrl) {
      console.log('\n🧹 Cleanup required:');
      console.log(`- Close GitHub Issue: ${testIssueUrl}`);
    }
    if (testPrUrl) {
      console.log(`- Close GitHub PR: ${testPrUrl}`);
    }
  });

  it('Step 1: should publish bounty successfully', async () => {
    // Given
    const args = {
      specPath: testSpecPath,
      repo: testRepo,
      amount: '10000000000000000', // 0.01 ETH
      asset: 'ETH',
      chain: 'ethereum' as const
      // moduleAddress is optional, will use config.ethereumContractAddress
    };

    // When
    const result = await publishBounty(args, config);

    // Then
    console.log('Publish result:', result.content[0].text);
    expect(result.content[0].text).toContain('✅ Bounty published');
    expect(result.content[0].text).toContain('Issue:');
    expect(result.content[0].text).toContain('Bounty ID:');
    expect(result.content[0].text).toContain('Tx Hash:');

    // Extract Issue URL and Bounty ID for next tests
    const text = result.content[0].text;
    const issueMatch = text.match(/Issue: (https:\/\/github\.com\/[^\s]+)/);
    const bountyIdMatch = text.match(/Bounty ID: ([^\s]+)/);

    expect(issueMatch).toBeTruthy();
    expect(bountyIdMatch).toBeTruthy();

    testIssueUrl = issueMatch![1];
    testBountyId = bountyIdMatch![1];

    console.log(`✅ Published bounty: ${testBountyId}`);
    console.log(`   Issue URL: ${testIssueUrl}`);
  }, 60000); // 60 second timeout for blockchain transaction

  it('Step 2: should accept bounty successfully', async () => {
    // Given
    if (!testIssueUrl) {
      throw new Error('Test depends on Step 1: testIssueUrl not set');
    }

    const args = {
      issueUrl: testIssueUrl,
      chain: 'ethereum' as const
      // moduleAddress is optional
    };

    // When
    const result = await acceptBounty(args, config);

    // Then
    console.log('Accept result:', result.content[0].text);
    expect(result.content[0].text).toContain('✅ Bounty accepted');
    expect(result.content[0].text).toContain('Local path:');
    expect(result.content[0].text).toContain('Tx Hash:');

    // Verify local file was downloaded
    const text = result.content[0].text;
    const pathMatch = text.match(/Local path: ([^\s]+)/);
    expect(pathMatch).toBeTruthy();

    const localPath = pathMatch![1];
    const fileExists = await fs.access(localPath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    console.log(`✅ Accepted bounty, downloaded to: ${localPath}`);
  }, 60000);

  it('Step 3: should submit work successfully', async () => {
    // Given
    if (!testIssueUrl) {
      throw new Error('Test depends on Step 1: testIssueUrl not set');
    }

    const args = {
      issueUrl: testIssueUrl,
      branchName: 'e2e-test-submission',
      summary: 'E2E test: Implemented user profile API',
      filesChanged: ['src/profile-api.ts', 'tests/profile-api.test.ts'],
      testing: 'All tests passed',
      chain: 'ethereum' as const
    };

    // When
    const result = await submitBounty(args, config);

    // Then
    console.log('Submit result:', result.content[0].text);
    expect(result.content[0].text).toContain('✅ Work submitted');
    expect(result.content[0].text).toContain('PR:');
    expect(result.content[0].text).toContain('Tx Hash:');

    // Extract PR URL
    const text = result.content[0].text;
    const prMatch = text.match(/PR: (https:\/\/github\.com\/[^\s]+)/);
    expect(prMatch).toBeTruthy();

    testPrUrl = prMatch![1];

    console.log(`✅ Submitted work, created PR: ${testPrUrl}`);
  }, 60000);

  it('Step 4: should confirm bounty successfully (User confirms Worker submission)', async () => {
    // Given
    if (!testIssueUrl) {
      throw new Error('Test depends on Step 1: testIssueUrl not set');
    }

    const args = {
      issueUrl: testIssueUrl,
      chain: 'ethereum' as const
    };

    // When
    const result = await confirmBounty(args, config);

    // Then
    console.log('Confirm result:', result.content[0].text);
    expect(result.content[0].text).toContain('✅ Bounty confirmed');
    expect(result.content[0].text).toContain('Tx Hash:');
    expect(result.content[0].text).toContain('Confirmed At:');
    expect(result.content[0].text).toContain('Cooling Period Ends:');

    console.log('✅ Bounty confirmed, cooling period started');
  }, 60000);

  it.skip('Step 5: should claim payout after cooling period (MANUAL TEST)', async () => {
    // This test is skipped by default because:
    // 1. Requires 7-day cooling period
    // 2. Requires manual PR merge
    // 3. Can only be run after confirm flow is completed

    if (!testIssueUrl) {
      throw new Error('Test depends on Step 1: testIssueUrl not set');
    }

    const args = {
      issueUrl: testIssueUrl,
      chain: 'ethereum' as const
    };

    // When
    const result = await claimBounty(args, config);

    // Then
    console.log('Claim result:', result.content[0].text);
    expect(result.content[0].text).toContain('✅ Payout claimed');
    expect(result.content[0].text).toContain('Amount:');
    expect(result.content[0].text).toContain('Tx Hash:');

    console.log('✅ Claimed payout successfully');
  }, 60000);
});

describe.skip('E2E: Ethereum Idempotency Tests', () => {
  const config = {
    githubToken: process.env.GITHUB_TOKEN || '',
    ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY || '',
    ethereumRpcUrl: process.env.ETHEREUM_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    ethereumContractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS || '',
    localSpecsDir: './tests/fixtures/specs'
  };

  const testRepo = process.env.TEST_REPO || 'code3-test/e2e-test';

  it('should return existing bounty on duplicate publish', async () => {
    // Given
    const args = {
      specPath: './tests/fixtures/specs/001/spec.md',
      repo: testRepo,
      amount: '10000000000000000', // 0.01 ETH
      asset: 'ETH',
      chain: 'ethereum' as const
    };

    // When - First publish
    console.log('First publish...');
    const result1 = await publishBounty(args, config);
    expect(result1.content[0].text).toContain('✅ Bounty published');

    const text1 = result1.content[0].text;
    const bountyId1Match = text1.match(/Bounty ID: ([^\s]+)/);
    const bountyId1 = bountyId1Match ? bountyId1Match[1] : null;

    // When - Second publish (should be idempotent)
    console.log('Second publish (idempotency test)...');
    const result2 = await publishBounty(args, config);

    // Then - Should return existing bounty
    console.log('Second publish result:', result2.content[0].text);
    expect(result2.content[0].text).toContain('already exists');

    const text2 = result2.content[0].text;
    const bountyId2Match = text2.match(/Bounty ID: ([^\s]+)/);
    const bountyId2 = bountyId2Match ? bountyId2Match[1] : null;

    // Bounty ID should be the same
    expect(bountyId1).toBe(bountyId2);

    console.log('✅ Idempotency verified: Bounty ID remains', bountyId1);
  }, 120000); // 120 second timeout for 2 transactions
});

describe.skip('E2E: Ethereum Contract Verification', () => {
  const config = {
    githubToken: process.env.GITHUB_TOKEN || '',
    ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY || '',
    ethereumRpcUrl: process.env.ETHEREUM_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    ethereumContractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS || '',
    localSpecsDir: './tests/fixtures/specs'
  };

  it('should verify contract is deployed and has correct ABI', async () => {
    // This test verifies the contract exists and can be interacted with
    const { EthereumBountyOperator } = await import('@code3-team/bounty-operator-ethereum');

    const operator = new EthereumBountyOperator({
      rpcUrl: config.ethereumRpcUrl,
      privateKey: config.ethereumPrivateKey,
      contractAddress: config.ethereumContractAddress
    });

    // Verify we can get cooling period (read operation)
    const coolingPeriod = await operator.getCoolingPeriod();
    console.log(`✅ Contract verified. Cooling period: ${coolingPeriod} seconds (${coolingPeriod / 60 / 60 / 24} days)`);

    expect(coolingPeriod).toBeGreaterThan(0);
    expect(coolingPeriod).toBe(7 * 24 * 60 * 60); // 7 days in seconds
  }, 30000);

  it('should verify wallet has sufficient balance', async () => {
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(config.ethereumRpcUrl);
    const wallet = new ethers.Wallet(config.ethereumPrivateKey, provider);

    const balance = await provider.getBalance(wallet.address);
    const balanceEth = Number(ethers.formatEther(balance));

    console.log(`✅ Wallet address: ${wallet.address}`);
    console.log(`   Balance: ${balanceEth} ETH`);

    expect(balanceEth).toBeGreaterThan(0.01); // At least 0.01 ETH for testing
  }, 30000);
});

/**
 * Manual E2E Test Instructions for Ethereum
 *
 * To run a full E2E test manually:
 *
 * 1. Setup:
 *    - Create a test GitHub repository
 *    - Create .env.test with:
 *      ```
 *      GITHUB_TOKEN=ghp_...
 *      ETHEREUM_PRIVATE_KEY=0x...
 *      ETHEREUM_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
 *      ETHEREUM_CONTRACT_ADDRESS=0x28FE83352f2451c54d9050761DF1d7F8945a8fc4
 *      TEST_REPO=your-username/test-repo
 *      ```
 *    - Ensure you have Sepolia ETH (get from https://sepoliafaucet.com/)
 *
 * 2. Run contract verification:
 *    ```bash
 *    pnpm test:e2e -- -t "should verify contract"
 *    ```
 *
 * 3. Run publish test:
 *    ```bash
 *    pnpm test:e2e -- -t "Step 1"
 *    ```
 *
 * 4. Run accept test:
 *    ```bash
 *    pnpm test:e2e -- -t "Step 2"
 *    ```
 *
 * 5. Create a feature branch and commit changes:
 *    ```bash
 *    git checkout -b e2e-test-submission
 *    # Make some changes
 *    git push origin e2e-test-submission
 *    ```
 *
 * 6. Run submit test:
 *    ```bash
 *    pnpm test:e2e -- -t "Step 3"
 *    ```
 *
 * 7. Run confirm test (User confirms Worker's submission):
 *    ```bash
 *    pnpm test:e2e -- -t "Step 4"
 *    ```
 *
 * 8. Wait 7 days for cooling period
 *
 * 9. Run claim test:
 *    ```bash
 *    pnpm test:e2e -- -t "Step 5"
 *    ```
 *
 * 10. Cleanup:
 *     - Close test Issue
 *     - Delete test branch
 */

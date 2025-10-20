/**
 * E2E Tests for Ethereum + spec-kit Bounty Lifecycle
 *
 * Setup:
 * 1. Copy .env.test.example to .env.test
 * 2. Fill in your credentials:
 *    - GITHUB_TOKEN: GitHub Personal Access Token
 *    - TEST_REPO: Your test repository (owner/repo)
 *    - ETHEREUM_PRIVATE_KEY: Your Ethereum private key
 * 3. System configs (RPC URL, Contract Address) are in src/chain-config.ts
 *
 * To run:
 * - Replace .skip with .only for the test you want to run
 * - Run: pnpm test:e2e
 *
 * Cleanup:
 * - Tests create real Issues/PRs on GitHub
 * - Tests create real transactions on Sepolia testnet
 * - Manual cleanup required after test run
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { publishBounty } from '../src/tools/publish-bounty.js';
import { acceptBounty } from '../src/tools/accept-bounty.js';
import { submitBounty } from '../src/tools/submit-bounty.js';
import { confirmBounty } from '../src/tools/confirm-bounty.js';
import { claimBounty } from '../src/tools/claim-bounty.js';
import { getEthereumConfig } from '../src/chain-config.js';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

describe.only('E2E: Ethereum + spec-kit Complete Flow', () => {
  // Get system configuration
  const chainConfig = getEthereumConfig();

  const testRepo = process.env.TEST_REPO || '';

  // Test configuration (from .env.test)
  const config = {
    githubToken: process.env.GITHUB_TOKEN || '',
    ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY || '',
    ethereumRpcUrl: chainConfig.rpcUrl,
    ethereumContractAddress: chainConfig.contractAddress,
    localSpecsDir: './tests/fixtures/specs',
    repo: testRepo
  };
  const testSpecPath = './tests/fixtures/specs/001/spec.md';

  // Test state
  let testIssueUrl: string;
  let testBountyId: string;
  let testPrUrl: string;

  beforeAll(async () => {
    // Verify required environment variables
    const missingVars: string[] = [];
    if (!config.githubToken) missingVars.push('GITHUB_TOKEN');
    if (!config.ethereumPrivateKey) missingVars.push('ETHEREUM_PRIVATE_KEY');
    if (!testRepo) missingVars.push('TEST_REPO');

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables in .env.test:');
      for (const v of missingVars) {
        console.error(`   - ${v}`);
      }
      console.error('\n📝 Copy .env.test.example to .env.test and fill in your credentials');
      throw new Error('Missing: ' + missingVars.join(', '));
    }

    // Verify test spec file exists
    try {
      await fs.access(testSpecPath);
    } catch (error) {
      throw new Error(`Test spec file not found: ${testSpecPath}`);
    }

    console.log('✅ E2E test environment ready');
    console.log(`   Test repo: ${testRepo}`);
    console.log(`   Spec path: ${testSpecPath}`);
    console.log(`   Chain: Ethereum ${chainConfig.network}`);
    console.log(`   Contract: ${chainConfig.contractAddress}`);
    console.log(`   RPC: ${chainConfig.rpcUrl}`);
  });

  afterAll(async () => {
    if (testIssueUrl || testPrUrl) {
      console.log('\n🧹 Manual cleanup required:');
      if (testIssueUrl) console.log(`   - Close GitHub Issue: ${testIssueUrl}`);
      if (testPrUrl) console.log(`   - Close GitHub PR: ${testPrUrl}`);
      console.log(`   - Delete test branch from ${testRepo}`);
    }
  });

  it('Step 1: should publish bounty successfully', async () => {
    const args = {
      specPath: testSpecPath,
      repo: testRepo,
      amount: '10000000000000000', // 0.01 ETH
      asset: 'ETH',
      chain: 'ethereum' as const
    };

    const result = await publishBounty(args, config);
    const text = result.content[0].text;

    console.log('📄 Publish result:', text);

    // Handle both new publish and idempotent (existing) bounty
    const isNew = text.includes('✅ Bounty published');
    const isExisting = text.includes('✅ Bounty already exists');
    expect(isNew || isExisting).toBe(true);

    expect(text).toContain('Issue:');
    expect(text).toContain('Bounty ID:');

    if (isNew) {
      expect(text).toContain('Tx Hash:');
    }

    const issueMatch = text.match(/Issue: (https:\/\/github\.com\/[^\s]+)/);
    const bountyIdMatch = text.match(/Bounty ID: ([^\s]+)/);

    expect(issueMatch).toBeTruthy();
    expect(bountyIdMatch).toBeTruthy();

    testIssueUrl = issueMatch![1];
    testBountyId = bountyIdMatch![1];

    console.log(`✅ ${isNew ? 'Published' : 'Found existing'} bounty: ${testBountyId}`);
    console.log(`   Issue URL: ${testIssueUrl}`);
  }, 60000);

  it('Step 2: should accept bounty successfully', async () => {
    if (!testIssueUrl) {
      throw new Error('Test depends on Step 1: testIssueUrl not set');
    }

    const args = {
      issueUrl: testIssueUrl,
      chain: 'ethereum' as const
    };

    const result = await acceptBounty(args, config);
    const text = result.content[0].text;

    console.log('📄 Accept result:', text);
    expect(text).toContain('✅ Bounty accepted');
    expect(text).toContain('Local path:');
    expect(text).toContain('Tx Hash:');

    const pathMatch = text.match(/Local path: ([^\s]+)/);
    expect(pathMatch).toBeTruthy();

    const localPath = pathMatch![1];
    const fileExists = await fs.access(localPath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    console.log(`✅ Accepted bounty, spec downloaded to: ${localPath}`);
  }, 60000);

  it('Step 3: should submit work successfully', async () => {
    if (!testIssueUrl) {
      throw new Error('Test depends on Step 1: testIssueUrl not set');
    }

    const args = {
      issueUrl: testIssueUrl,
      branchName: `e2e-test-${Date.now()}`,
      summary: 'E2E test: Implemented user profile API',
      filesChanged: ['src/profile-api.ts', 'tests/profile-api.test.ts'],
      testing: 'All tests passed',
      chain: 'ethereum' as const
    };

    const result = await submitBounty(args, config);
    const text = result.content[0].text;

    console.log('📄 Submit result:', text);
    expect(text).toContain('✅ Work submitted');
    expect(text).toContain('PR:');
    expect(text).toContain('Tx Hash:');

    const prMatch = text.match(/PR: (https:\/\/github\.com\/[^\s]+)/);
    expect(prMatch).toBeTruthy();

    testPrUrl = prMatch![1];
    console.log(`✅ Submitted work, created PR: ${testPrUrl}`);
  }, 60000);

  it('Step 4: should confirm bounty successfully', async () => {
    if (!testIssueUrl) {
      throw new Error('Test depends on Step 1: testIssueUrl not set');
    }

    const args = {
      issueUrl: testIssueUrl,
      chain: 'ethereum' as const
    };

    const result = await confirmBounty(args, config);
    const text = result.content[0].text;

    console.log('📄 Confirm result:', text);
    expect(text).toContain('✅ Bounty confirmed');
    expect(text).toContain('Tx Hash:');
    expect(text).toContain('Confirmed At:');

    // No longer expect cooling period
    expect(text).not.toContain('Cooling Period');

    console.log('✅ Bounty confirmed, worker can claim immediately');
  }, 60000);

  it('Step 5: should claim payout immediately after confirmation', async () => {
    if (!testIssueUrl) {
      throw new Error('Test depends on Step 1: testIssueUrl not set');
    }

    const args = {
      issueUrl: testIssueUrl,
      chain: 'ethereum' as const
    };

    const result = await claimBounty(args, config);
    const text = result.content[0].text;

    console.log('📄 Claim result:', text);
    expect(text).toContain('✅ Payout claimed');
    expect(text).toContain('Amount:');
    expect(text).toContain('Tx Hash:');

    console.log('✅ Claimed payout successfully');
  }, 60000);
});

describe.skip('E2E: Ethereum Idempotency Tests', () => {
  const chainConfig = getEthereumConfig();

  const config = {
    githubToken: process.env.GITHUB_TOKEN || '',
    ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY || '',
    ethereumRpcUrl: chainConfig.rpcUrl,
    ethereumContractAddress: chainConfig.contractAddress,
    localSpecsDir: './tests/fixtures/specs'
  };

  const testRepo = process.env.TEST_REPO || '';

  it('should return existing bounty on duplicate publish', async () => {
    const args = {
      specPath: './tests/fixtures/specs/001/spec.md',
      repo: testRepo,
      amount: '10000000000000000',
      asset: 'ETH',
      chain: 'ethereum' as const
    };

    console.log('📝 First publish...');
    const result1 = await publishBounty(args, config);
    const text1 = result1.content[0].text;
    expect(text1).toContain('✅ Bounty published');

    const bountyId1Match = text1.match(/Bounty ID: ([^\s]+)/);
    const bountyId1 = bountyId1Match?.[1];

    console.log('📝 Second publish (idempotency test)...');
    const result2 = await publishBounty(args, config);
    const text2 = result2.content[0].text;

    console.log('📄 Second publish result:', text2);
    expect(text2).toContain('already exists');

    const bountyId2Match = text2.match(/Bounty ID: ([^\s]+)/);
    const bountyId2 = bountyId2Match?.[1];

    expect(bountyId1).toBe(bountyId2);
    console.log(`✅ Idempotency verified: Bounty ID remains ${bountyId1}`);
  }, 120000);
});

describe.skip('E2E: Ethereum Environment Verification', () => {
  const chainConfig = getEthereumConfig();

  const config = {
    githubToken: process.env.GITHUB_TOKEN || '',
    ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY || '',
    ethereumRpcUrl: chainConfig.rpcUrl,
    ethereumContractAddress: chainConfig.contractAddress,
    localSpecsDir: './tests/fixtures/specs'
  };

  it('should verify contract is deployed and accessible', async () => {
    const { EthereumBountyOperator } = await import('@code3-team/bounty-operator-ethereum');

    const operator = new EthereumBountyOperator({
      rpcUrl: config.ethereumRpcUrl,
      privateKey: config.ethereumPrivateKey,
      contractAddress: config.ethereumContractAddress
    });

    const result = await operator.listBounties();
    console.log(`✅ Contract verified at ${chainConfig.contractAddress}`);
    console.log(`   Total bounties: ${result.count}`);

    expect(result).toHaveProperty('bountyIds');
    expect(result).toHaveProperty('count');
  }, 30000);

  it('should verify wallet has sufficient balance', async () => {
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(config.ethereumRpcUrl);
    const wallet = new ethers.Wallet(config.ethereumPrivateKey, provider);

    const balance = await provider.getBalance(wallet.address);
    const balanceEth = Number(ethers.formatEther(balance));

    console.log(`✅ Wallet address: ${wallet.address}`);
    console.log(`   Balance: ${balanceEth} ETH`);

    expect(balanceEth).toBeGreaterThan(0.01);
  }, 30000);

  it('should verify test repository is accessible', async () => {
    const testRepo = process.env.TEST_REPO || '';

    if (!testRepo) {
      throw new Error('TEST_REPO not set in .env.test');
    }

    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: config.githubToken });

    const [owner, repo] = testRepo.split('/');
    const { data } = await octokit.repos.get({ owner, repo });

    console.log(`✅ Test repository accessible: ${data.full_name}`);
    console.log(`   Permissions: ${data.permissions?.admin ? 'admin' : data.permissions?.push ? 'write' : 'read'}`);

    expect(data.permissions?.push).toBe(true);
  }, 30000);
});

/**
 * E2E Tests for Solana + spec-kit Bounty Lifecycle
 *
 * Setup:
 * 1. Copy .env.test.example to .env.test
 * 2. Fill in your credentials:
 *    - GITHUB_TOKEN: GitHub Personal Access Token
 *    - TEST_REPO: Your test repository (owner/repo)
 *    - SOLANA_PRIVATE_KEY: Your Solana private key (Base58 format)
 * 3. System configs (RPC URL, Program ID) are in src/chain-config.ts
 * 4. Make sure solana-test-validator is running on localhost:8899
 *
 * To run:
 * - Start local validator: solana-test-validator --reset
 * - Replace .skip with .only for the test you want to run
 * - Run: pnpm test:e2e
 *
 * Cleanup:
 * - Tests create real Issues/PRs on GitHub
 * - Tests create real transactions on Solana localhost
 * - Manual cleanup required after test run
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { publishBounty } from '../src/tools/publish-bounty.js';
import { acceptBounty } from '../src/tools/accept-bounty.js';
import { getSolanaConfig } from '../src/chain-config.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables
dotenv.config({ path: '.env.test' });

describe.only('E2E: Solana + spec-kit (Publish & Accept)', () => {
  // Get system configuration
  const chainConfig = getSolanaConfig();

  const testRepo = process.env.TEST_REPO || '';

  // Test configuration (from .env.test)
  const config = {
    githubToken: process.env.GITHUB_TOKEN || '',
    solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY || '',
    localSpecsDir: './tests/fixtures/specs',
    repo: testRepo
  };
  const testSpecPath = './tests/fixtures/specs/001/spec.md';

  // Test state
  let testIssueUrl: string;
  let testBountyId: string;
  let testLocalSpecPath: string;

  beforeAll(async () => {
    // Verify required environment variables
    const missingVars: string[] = [];
    if (!config.githubToken) missingVars.push('GITHUB_TOKEN');
    if (!config.solanaPrivateKey) missingVars.push('SOLANA_PRIVATE_KEY');
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

    // Verify Solana validator is running
    try {
      const response = await fetch(chainConfig.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth'
        })
      });
      const data = await response.json();
      if (data.error) {
        throw new Error('Solana validator not healthy');
      }
    } catch (error) {
      console.error('❌ Solana validator is not running on ' + chainConfig.rpcUrl);
      console.error('   Start it with: solana-test-validator --reset');
      throw error;
    }

    // Initialize BountyManager if needed
    try {
      const { Connection, PublicKey, Keypair, SystemProgram } = await import('@solana/web3.js');
      const { AnchorProvider, Wallet, Program } = await import('@coral-xyz/anchor');
      const bs58 = await import('bs58');

      // Load IDL from file
      const idlPath = path.join(__dirname, '../../../bounty-operator/solana/target/idl/bounty_manager.json');
      const idlContent = await fs.readFile(idlPath, 'utf-8');
      const idl = JSON.parse(idlContent);

      const connection = new Connection(chainConfig.rpcUrl, 'confirmed');
      const keypair = Keypair.fromSecretKey(bs58.default.decode(config.solanaPrivateKey));
      const wallet = new Wallet(keypair);
      const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

      const programId = new PublicKey(chainConfig.contractAddress);
      const program = new Program(idl, provider);

      // Derive BountyManager PDA
      const [bountyManagerPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('bounty_manager')],
        programId
      );

      // Check if BountyManager already exists
      try {
        await program.account.bountyManager.fetch(bountyManagerPDA);
        console.log('✅ BountyManager already initialized');
      } catch (error: any) {
        // BountyManager doesn't exist, initialize it
        console.log('🔧 Initializing BountyManager...');

        const tx = await program.methods
          .initialize()
          .accounts({
            bountyManager: bountyManagerPDA,
            authority: wallet.publicKey,
            systemProgram: SystemProgram.programId
          })
          .rpc();

        console.log('✅ BountyManager initialized');
        console.log(`   Tx Hash: ${tx}`);
        console.log(`   BountyManager PDA: ${bountyManagerPDA.toBase58()}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to initialize BountyManager:', error.message);
      throw error;
    }

    console.log('✅ E2E test environment ready');
    console.log(`   Test repo: ${testRepo}`);
    console.log(`   Spec path: ${testSpecPath}`);
    console.log(`   Chain: Solana ${chainConfig.network}`);
    console.log(`   Program ID: ${chainConfig.contractAddress}`);
    console.log(`   RPC: ${chainConfig.rpcUrl}`);
  });

  afterAll(async () => {
    if (testIssueUrl) {
      console.log('\n🧹 Manual cleanup required:');
      if (testIssueUrl) console.log(`   - Close GitHub Issue: ${testIssueUrl}`);
      console.log(`   - Delete test branch from ${testRepo}`);
    }
    if (testLocalSpecPath) {
      console.log(`   - Clean up local spec file: ${testLocalSpecPath}`);
    }
  });

  it('Step 1: should publish bounty successfully', async () => {
    const args = {
      specPath: testSpecPath,
      repo: testRepo,
      amount: '5000000', // 0.005 SOL
      asset: 'SOL',
      chain: 'solana' as const,
      branch: 'main'
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
    expect(text).toContain('Chain: solana (localhost)');

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
    console.log(`   Amount: 0.005 SOL`);
  }, 60000);

  it('Step 2: should accept bounty successfully', async () => {
    if (!testIssueUrl) {
      throw new Error('Test depends on Step 1: testIssueUrl not set');
    }

    const args = {
      issueUrl: testIssueUrl,
      chain: 'solana' as const
    };

    const result = await acceptBounty(args, config);
    const text = result.content[0].text;

    console.log('📄 Accept result:', text);
    expect(text).toContain('✅ Bounty accepted successfully!');
    expect(text).toContain('Bounty ID:');
    expect(text).toContain('Tx Hash:');
    expect(text).toContain('Chain: solana (localhost)');

    // Check for repository setup instructions
    expect(text).toContain('Repository Setup Instructions:');
    expect(text).toContain('git clone');
    expect(text).toContain('worker-bounty-');

    const bountyIdMatch = text.match(/Bounty ID: ([^\s]+)/);
    expect(bountyIdMatch).toBeTruthy();
    expect(bountyIdMatch![1]).toBe(testBountyId);

    // Extract worker branch name
    const branchMatch = text.match(/worker-bounty-([^\s]+)/);
    expect(branchMatch).toBeTruthy();
    const workerBranch = `worker-bounty-${branchMatch![1]}`;

    console.log(`✅ Accepted bounty: ${testBountyId}`);
    console.log(`   Worker branch: ${workerBranch}`);
    console.log(`   Next steps: Clone repo, checkout ${workerBranch}, implement feature, submit PR`);
  }, 60000);
});

describe.skip('E2E: Solana Idempotency Tests', () => {
  const chainConfig = getSolanaConfig();

  const config = {
    githubToken: process.env.GITHUB_TOKEN || '',
    solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY || '',
    localSpecsDir: './tests/fixtures/specs',
    repo: process.env.TEST_REPO || ''
  };

  it('should return existing bounty on duplicate publish', async () => {
    const args = {
      specPath: './tests/fixtures/specs/001/spec.md',
      repo: config.repo,
      amount: '5000000', // 0.005 SOL
      asset: 'SOL',
      chain: 'solana' as const
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

describe.skip('E2E: Solana Environment Verification', () => {
  const chainConfig = getSolanaConfig();

  const config = {
    githubToken: process.env.GITHUB_TOKEN || '',
    solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY || '',
    localSpecsDir: './tests/fixtures/specs'
  };

  it('should verify Solana validator is running', async () => {
    const response = await fetch(chainConfig.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion'
      })
    });

    const data = await response.json();
    console.log(`✅ Solana validator running`);
    console.log(`   Solana core version: ${data.result?.['solana-core']}`);
    console.log(`   Feature set: ${data.result?.['feature-set']}`);

    expect(data.result).toBeTruthy();
  }, 10000);

  it('should verify program is deployed and accessible', async () => {
    const { SolanaBountyOperator } = await import('@code3-team/bounty-operator-solana');

    const operator = new SolanaBountyOperator({
      rpcUrl: chainConfig.rpcUrl,
      privateKey: config.solanaPrivateKey,
      programId: chainConfig.contractAddress
    });

    const result = await operator.listBounties();
    console.log(`✅ Program verified at ${chainConfig.contractAddress}`);
    console.log(`   Total bounties: ${result.count}`);

    expect(result).toHaveProperty('bountyIds');
    expect(result).toHaveProperty('count');
  }, 30000);

  it('should verify wallet has sufficient balance', async () => {
    const { Connection, PublicKey, Keypair } = await import('@solana/web3.js');
    const bs58 = await import('bs58');

    const connection = new Connection(chainConfig.rpcUrl, 'confirmed');
    const keypair = Keypair.fromSecretKey(bs58.default.decode(config.solanaPrivateKey));

    const balance = await connection.getBalance(keypair.publicKey);
    const balanceSol = balance / 1_000_000_000;

    console.log(`✅ Wallet address: ${keypair.publicKey.toBase58()}`);
    console.log(`   Balance: ${balanceSol} SOL`);

    expect(balanceSol).toBeGreaterThan(0.01);
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

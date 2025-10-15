/**
 * E2E Tests for Aptos + spec-kit Bounty Lifecycle
 *
 * WARNING: These tests require:
 * - Real GitHub Token (with repo scope)
 * - Real Aptos Private Key (with testnet APT)
 * - Real GitHub repository for testing
 * - Aptos testnet connection
 *
 * To run these tests:
 * 1. Create .env.test file with real credentials
 * 2. Replace .skip with .only for the test you want to run
 * 3. Run: pnpm run test:e2e
 *
 * Cleanup:
 * - Tests create real Issues/PRs on GitHub
 * - Tests create real transactions on Aptos testnet
 * - Manual cleanup may be required after test run
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { publishBounty } from '../src/tools/publish-bounty.js';
import { acceptBounty } from '../src/tools/accept-bounty.js';
import { submitBounty } from '../src/tools/submit-bounty.js';
import { claimBounty } from '../src/tools/claim-bounty.js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

describe.skip('E2E: Aptos + spec-kit Complete Flow', () => {
  // Test configuration
  const config = {
    githubToken: process.env.GITHUB_TOKEN || '',
    aptosPrivateKey: process.env.APTOS_PRIVATE_KEY || '',
    localSpecsDir: './tests/fixtures/specs'
  };

  const testRepo = process.env.TEST_REPO || 'code3-test/e2e-test';
  const testModuleAddress = process.env.APTOS_MODULE_ADDRESS || '0x1';
  const testSpecPath = './tests/fixtures/specs/001/spec.md';

  // Test state
  let testIssueUrl: string;
  let testBountyId: string;
  let testPrUrl: string;

  beforeAll(async () => {
    // Verify test environment
    if (!config.githubToken || !config.aptosPrivateKey) {
      console.warn('⚠️ Missing test credentials. Set GITHUB_TOKEN and APTOS_PRIVATE_KEY in .env.test');
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
    console.log(`- Module address: ${testModuleAddress}`);
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
      amount: '100000000', // 1 APT
      asset: 'APT',
      chain: 'aptos' as const,
      moduleAddress: testModuleAddress
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
  }, 30000); // 30 second timeout for blockchain transaction

  it('Step 2: should accept bounty successfully', async () => {
    // Given
    if (!testIssueUrl) {
      throw new Error('Test depends on Step 1: testIssueUrl not set');
    }

    const args = {
      issueUrl: testIssueUrl,
      chain: 'aptos' as const,
      moduleAddress: testModuleAddress
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
  }, 30000);

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
      chain: 'aptos' as const,
      moduleAddress: testModuleAddress
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
  }, 30000);

  it.skip('Step 4: should claim payout after cooling period (MANUAL TEST)', async () => {
    // This test is skipped by default because:
    // 1. Requires 7-day cooling period
    // 2. Requires manual PR merge
    // 3. Can only be run after confirm flow is completed

    if (!testIssueUrl) {
      throw new Error('Test depends on Step 1: testIssueUrl not set');
    }

    const args = {
      issueUrl: testIssueUrl,
      chain: 'aptos' as const,
      moduleAddress: testModuleAddress
    };

    // When
    const result = await claimBounty(args, config);

    // Then
    console.log('Claim result:', result.content[0].text);
    expect(result.content[0].text).toContain('✅ Payout claimed');
    expect(result.content[0].text).toContain('Amount:');
    expect(result.content[0].text).toContain('Tx Hash:');

    console.log('✅ Claimed payout successfully');
  }, 30000);
});

describe.skip('E2E: Idempotency Tests', () => {
  const config = {
    githubToken: process.env.GITHUB_TOKEN || '',
    aptosPrivateKey: process.env.APTOS_PRIVATE_KEY || '',
    localSpecsDir: './tests/fixtures/specs'
  };

  const testRepo = process.env.TEST_REPO || 'code3-test/e2e-test';
  const testModuleAddress = process.env.APTOS_MODULE_ADDRESS || '0x1';

  it('should return existing bounty on duplicate publish', async () => {
    // Given
    const args = {
      specPath: './tests/fixtures/specs/001/spec.md',
      repo: testRepo,
      amount: '100000000',
      asset: 'APT',
      chain: 'aptos' as const,
      moduleAddress: testModuleAddress
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
  }, 60000); // 60 second timeout for 2 transactions
});

describe.skip('E2E: Error Handling', () => {
  const config = {
    githubToken: process.env.GITHUB_TOKEN || '',
    aptosPrivateKey: process.env.APTOS_PRIVATE_KEY || '',
    localSpecsDir: './tests/fixtures/specs'
  };

  const testRepo = process.env.TEST_REPO || 'code3-test/e2e-test';
  const testModuleAddress = process.env.APTOS_MODULE_ADDRESS || '0x1';

  it('should fail with clear error for non-existent spec file', async () => {
    // Given
    const args = {
      specPath: './tests/fixtures/specs/999/non-existent.md',
      repo: testRepo,
      amount: '100000000',
      asset: 'APT',
      chain: 'aptos' as const,
      moduleAddress: testModuleAddress
    };

    // When
    const result = await publishBounty(args, config);

    // Then
    console.log('Error result:', result.content[0].text);
    expect(result.content[0].text).toContain('❌ Failed');
    expect(result.content[0].text).toMatch(/no such file|ENOENT/);
  });

  it('should fail with clear error for invalid Issue URL', async () => {
    // Given
    const args = {
      issueUrl: 'https://github.com/invalid/repo/issues/99999',
      chain: 'aptos' as const,
      moduleAddress: testModuleAddress
    };

    // When
    const result = await acceptBounty(args, config);

    // Then
    console.log('Error result:', result.content[0].text);
    expect(result.content[0].text).toContain('❌ Failed');
  });

  it('should fail when claiming before cooling period', async () => {
    // This test requires a recently submitted bounty
    // For now, we just verify the error message structure

    // Given
    const args = {
      issueUrl: 'https://github.com/test/repo/issues/1',
      chain: 'aptos' as const,
      moduleAddress: testModuleAddress
    };

    // When
    const result = await claimBounty(args, config);

    // Then
    console.log('Error result:', result.content[0].text);
    expect(result.content[0].text).toContain('❌ Failed');
  });
});

// Helper function to wait for cooling period (for manual testing)
export async function waitForCoolingPeriod(durationMs: number): Promise<void> {
  console.log(`⏳ Waiting for cooling period: ${durationMs / 1000 / 60 / 60 / 24} days...`);
  console.log('(This is a placeholder - in real tests, you would skip this)');
  // In real scenario, don't actually wait 7 days in test
  // Instead, test this manually or with mock time
}

/**
 * Manual E2E Test Instructions
 *
 * To run a full E2E test manually:
 *
 * 1. Setup:
 *    - Create a test GitHub repository
 *    - Create .env.test with real credentials
 *    - Ensure you have testnet APT
 *
 * 2. Run publish test:
 *    ```bash
 *    pnpm test:e2e -- -t "Step 1"
 *    ```
 *
 * 3. Run accept test:
 *    ```bash
 *    pnpm test:e2e -- -t "Step 2"
 *    ```
 *
 * 4. Create a feature branch and commit changes:
 *    ```bash
 *    git checkout -b e2e-test-submission
 *    # Make some changes
 *    git push origin e2e-test-submission
 *    ```
 *
 * 5. Run submit test:
 *    ```bash
 *    pnpm test:e2e -- -t "Step 3"
 *    ```
 *
 * 6. Manually merge the PR on GitHub
 *
 * 7. Wait 7 days for cooling period
 *
 * 8. Run claim test:
 *    ```bash
 *    pnpm test:e2e -- -t "Step 4"
 *    ```
 *
 * 9. Cleanup:
 *    - Close test Issue
 *    - Delete test branch
 */

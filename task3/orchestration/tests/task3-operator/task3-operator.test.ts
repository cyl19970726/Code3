import { describe, it, expect, beforeEach } from 'vitest';
import type { BountyOperator } from '@code3-team/bounty-operator';
import type { DataOperator } from '@code3-team/data-operator';
import { Task3Operator } from '../../src/task3-operator';

/**
 * Task3Operator Unit Tests
 *
 * Tests all 5 flows:
 * - publishFlow
 * - acceptFlow
 * - submitFlow
 * - confirmFlow
 * - claimFlow
 */

// Mock BountyOperator
class MockBountyOperator implements BountyOperator {
  private bounties = new Map<string, any>();
  private taskHashMap = new Map<string, string>();
  private bountyCounter = 1;

  async createBounty(params: any) {
    const bountyId = `bounty-${this.bountyCounter++}`;
    this.bounties.set(bountyId, {
      bountyId,
      taskHash: params.taskHash,
      status: 'Open',
      amount: params.amount,
      asset: params.asset,
      worker: null,
      acceptedAt: null,
      confirmedAt: null
    });
    this.taskHashMap.set(params.taskHash, bountyId);
    return { bountyId, txHash: 'tx-create' };
  }

  async getBountyByTaskHash(params: any) {
    const bountyId = this.taskHashMap.get(params.taskHash);
    return { found: !!bountyId, bountyId: bountyId || null };
  }

  async getBounty(params: any) {
    const bounty = this.bounties.get(params.bountyId);
    if (!bounty) throw new Error('Bounty not found');
    return bounty;
  }

  async acceptBounty(params: any) {
    const bounty = this.bounties.get(params.bountyId);
    if (bounty) {
      bounty.status = 'Accepted';
      bounty.worker = params.worker;
      bounty.acceptedAt = Math.floor(Date.now() / 1000);
    }
    return { txHash: 'tx-accept' };
  }

  async submitBounty(params: any) {
    const bounty = this.bounties.get(params.bountyId);
    if (bounty) {
      bounty.status = 'Submitted';
    }
    return { txHash: 'tx-submit' };
  }

  async confirmBounty(params: any) {
    const bounty = this.bounties.get(params.bountyId);
    const confirmedAt = Math.floor(Date.now() / 1000);
    if (bounty) {
      bounty.status = 'Confirmed';
      bounty.confirmedAt = confirmedAt;
    }
    return { txHash: 'tx-confirm', confirmedAt };
  }

  async claimPayout(params: any) {
    const bounty = this.bounties.get(params.bountyId);
    if (bounty) {
      bounty.status = 'Completed';
    }
    return { txHash: 'tx-claim' };
  }

  async cancelBounty(params: any) {
    return { txHash: 'tx-cancel' };
  }

  async listBounties() {
    return { bountyIds: [], count: 0 };
  }

  async getBountiesBySponsor(params: any) {
    return { bountyIds: [], count: 0 };
  }

  async getBountiesByWorker(params: any) {
    return { bountyIds: [], count: 0 };
  }
}

// Mock DataOperator
class MockDataOperator implements DataOperator {
  private tasks = new Map<string, any>();
  private taskCounter = 1;

  async uploadTaskData(params: any) {
    const taskUrl = `https://github.com/test/repo/issues/${this.taskCounter++}`;
    const taskId = `test/repo#${this.taskCounter}`;
    const enrichedMetadata = {
      ...params.metadata,
      taskId,
      dataLayer: { ...params.metadata.dataLayer, url: taskUrl }
    };
    this.tasks.set(taskUrl, {
      taskData: params.taskData,
      metadata: enrichedMetadata
    });
    return { taskUrl, taskId };
  }

  async downloadTaskData(params: any) {
    const task = this.tasks.get(params.taskUrl);
    if (!task) throw new Error('Task not found');
    return { taskData: task.taskData, localPath: '/tmp/test' };
  }

  async uploadSubmission(params: any) {
    const task = this.tasks.get(params.taskUrl);
    if (!task) throw new Error('Task not found');
    task.submissionData = params.submissionData;
    return { success: true, submissionUrl: params.submissionData.prUrl };
  }

  async getTaskMetadata(params: any) {
    const task = this.tasks.get(params.taskUrl);
    if (!task) throw new Error('Task not found');
    return task.metadata;
  }

  async updateTaskMetadata(params: any) {
    const task = this.tasks.get(params.taskUrl);
    if (!task) throw new Error('Task not found');
    task.metadata = {
      ...task.metadata,
      ...params.metadata,
      chain: { ...task.metadata.chain, ...(params.metadata.chain || {}) },
      bounty: { ...task.metadata.bounty, ...(params.metadata.bounty || {}) }
    };
    return { success: true };
  }
}

describe('Task3Operator - publishFlow', () => {
  let operator: Task3Operator;
  let bountyOperator: MockBountyOperator;
  let dataOperator: MockDataOperator;

  beforeEach(() => {
    operator = new Task3Operator();
    bountyOperator = new MockBountyOperator();
    dataOperator = new MockDataOperator();
  });

  it('should create new bounty when taskHash is new', async () => {
    const result = await operator.publishFlow({
      dataOperator,
      bountyOperator,
      taskData: { title: 'New Task' },
      metadata: {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: '',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null },
        dataLayer: { type: 'github', url: '' }
      },
      amount: '100',
      asset: 'APT'
    });

    expect(result.isNew).toBe(true);
    expect(result.taskUrl).toBeTruthy();
    expect(result.bountyId).toBeTruthy();
    expect(result.txHash).toBe('tx-create');
  });

  it('should return existing bounty for duplicate taskHash (idempotency)', async () => {
    const params = {
      dataOperator,
      bountyOperator,
      taskData: { title: 'Idempotent Task' },
      metadata: {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: '',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null },
        dataLayer: { type: 'github', url: '' }
      },
      amount: '100',
      asset: 'APT'
    };

    const result1 = await operator.publishFlow(params);

    // Second call with same taskData
    const params2 = {
      ...params,
      metadata: { ...params.metadata, dataLayer: { ...params.metadata.dataLayer, url: result1.taskUrl } }
    };
    const result2 = await operator.publishFlow(params2);

    expect(result2.isNew).toBe(false);
    expect(result2.bountyId).toBe(result1.bountyId);
    expect(result2.txHash).toBeNull();
  });

  it('should compute taskHash from taskData', async () => {
    const result = await operator.publishFlow({
      dataOperator,
      bountyOperator,
      taskData: { title: 'Hash Test', body: 'Content' },
      metadata: {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: '',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null },
        dataLayer: { type: 'github', url: '' }
      },
      amount: '100',
      asset: 'APT'
    });

    const metadata = await dataOperator.getTaskMetadata({ taskUrl: result.taskUrl });
    expect(metadata.taskHash).toHaveLength(64); // SHA-256 hex
  });
});

describe('Task3Operator - acceptFlow', () => {
  let operator: Task3Operator;
  let bountyOperator: MockBountyOperator;
  let dataOperator: MockDataOperator;

  beforeEach(() => {
    operator = new Task3Operator();
    bountyOperator = new MockBountyOperator();
    dataOperator = new MockDataOperator();
  });

  it('should accept an Open bounty', async () => {
    // Setup: Publish a bounty first
    const publishResult = await operator.publishFlow({
      dataOperator,
      bountyOperator,
      taskData: { title: 'Accept Test' },
      metadata: {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: '',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null },
        dataLayer: { type: 'github', url: '' }
      },
      amount: '100',
      asset: 'APT'
    });

    const result = await operator.acceptFlow({
      dataOperator,
      bountyOperator,
      taskUrl: publishResult.taskUrl
    });

    expect(result.txHash).toBe('tx-accept');
    expect(result.taskData).toBeTruthy();
    expect(result.localPath).toBeTruthy();
    expect(result.bountyId).toBe(publishResult.bountyId);

    // Verify bounty status updated
    const bounty = await bountyOperator.getBounty({ bountyId: publishResult.bountyId });
    expect(bounty.status).toBe('Accepted');
    expect(bounty.acceptedAt).toBeGreaterThan(0);
  });

  it('should retrieve bountyId from metadata', async () => {
    const publishResult = await operator.publishFlow({
      dataOperator,
      bountyOperator,
      taskData: { title: 'BountyId Test' },
      metadata: {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: '',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null },
        dataLayer: { type: 'github', url: '' }
      },
      amount: '100',
      asset: 'APT'
    });

    await operator.acceptFlow({
      dataOperator,
      bountyOperator,
      taskUrl: publishResult.taskUrl
    });

    const metadata = await dataOperator.getTaskMetadata({ taskUrl: publishResult.taskUrl });
    expect(metadata.chain.bountyId).toBe(publishResult.bountyId);
  });
});

describe('Task3Operator - submitFlow', () => {
  let operator: Task3Operator;
  let bountyOperator: MockBountyOperator;
  let dataOperator: MockDataOperator;

  beforeEach(() => {
    operator = new Task3Operator();
    bountyOperator = new MockBountyOperator();
    dataOperator = new MockDataOperator();
  });

  it('should submit work for Accepted bounty', async () => {
    // Setup: Publish and accept
    const publishResult = await operator.publishFlow({
      dataOperator,
      bountyOperator,
      taskData: { title: 'Submit Test' },
      metadata: {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: '',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null },
        dataLayer: { type: 'github', url: '' }
      },
      amount: '100',
      asset: 'APT'
    });

    await operator.acceptFlow({
      dataOperator,
      bountyOperator,
      taskUrl: publishResult.taskUrl
    });

    const result = await operator.submitFlow({
      dataOperator,
      bountyOperator,
      taskUrl: publishResult.taskUrl,
      submissionData: { prUrl: 'https://github.com/test/repo/pull/1' }
    });

    expect(result.txHash).toBe('tx-submit');

    // Verify bounty status updated
    const bounty = await bountyOperator.getBounty({ bountyId: publishResult.bountyId });
    expect(bounty.status).toBe('Submitted');
  });

  it('should update dataLayer metadata with submission data', async () => {
    const publishResult = await operator.publishFlow({
      dataOperator,
      bountyOperator,
      taskData: { title: 'Submission Data Test' },
      metadata: {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: '',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null },
        dataLayer: { type: 'github', url: '' }
      },
      amount: '100',
      asset: 'APT'
    });

    await operator.acceptFlow({
      dataOperator,
      bountyOperator,
      taskUrl: publishResult.taskUrl
    });

    const prUrl = 'https://github.com/test/repo/pull/123';
    await operator.submitFlow({
      dataOperator,
      bountyOperator,
      taskUrl: publishResult.taskUrl,
      submissionData: { prUrl }
    });

    const metadata = await dataOperator.getTaskMetadata({ taskUrl: publishResult.taskUrl });
    expect(metadata.dataLayer.submissionUrl).toBe(prUrl);
  });
});

describe('Task3Operator - confirmFlow', () => {
  let operator: Task3Operator;
  let bountyOperator: MockBountyOperator;
  let dataOperator: MockDataOperator;

  beforeEach(() => {
    operator = new Task3Operator();
    bountyOperator = new MockBountyOperator();
    dataOperator = new MockDataOperator();
  });

  it('should confirm Submitted work and start cooling period', async () => {
    // Setup: Publish, accept, submit
    const publishResult = await operator.publishFlow({
      dataOperator,
      bountyOperator,
      taskData: { title: 'Confirm Test' },
      metadata: {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: '',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null },
        dataLayer: { type: 'github', url: '' }
      },
      amount: '100',
      asset: 'APT'
    });

    await operator.acceptFlow({
      dataOperator,
      bountyOperator,
      taskUrl: publishResult.taskUrl
    });

    await operator.submitFlow({
      dataOperator,
      bountyOperator,
      taskUrl: publishResult.taskUrl,
      submissionData: { prUrl: 'https://github.com/test/repo/pull/1' }
    });

    const result = await operator.confirmFlow({
      dataOperator,
      bountyOperator,
      taskUrl: publishResult.taskUrl
    });

    expect(result.txHash).toBe('tx-confirm');
    expect(result.confirmedAt).toBeGreaterThan(0);

    // Verify bounty status updated
    const bounty = await bountyOperator.getBounty({ bountyId: publishResult.bountyId });
    expect(bounty.status).toBe('Confirmed');
  });

  it('should update metadata with confirmedAt', async () => {
    const publishResult = await operator.publishFlow({
      dataOperator,
      bountyOperator,
      taskData: { title: 'Confirm Metadata Test' },
      metadata: {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: '',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null },
        dataLayer: { type: 'github', url: '' }
      },
      amount: '100',
      asset: 'APT'
    });

    await operator.acceptFlow({ dataOperator, bountyOperator, taskUrl: publishResult.taskUrl });
    await operator.submitFlow({
      dataOperator,
      bountyOperator,
      taskUrl: publishResult.taskUrl,
      submissionData: { prUrl: 'https://github.com/test/repo/pull/1' }
    });

    const confirmResult = await operator.confirmFlow({
      dataOperator,
      bountyOperator,
      taskUrl: publishResult.taskUrl
    });

    const metadata = await dataOperator.getTaskMetadata({ taskUrl: publishResult.taskUrl });
    expect(metadata.bounty.confirmedAt).toBe(confirmResult.confirmedAt);
  });
});

describe('Task3Operator - claimFlow', () => {
  let operator: Task3Operator;
  let bountyOperator: MockBountyOperator;
  let dataOperator: MockDataOperator;

  beforeEach(() => {
    operator = new Task3Operator();
    bountyOperator = new MockBountyOperator();
    dataOperator = new MockDataOperator();
  });

  it('should claim payout after confirmation', async () => {
    // Setup: Full flow
    const publishResult = await operator.publishFlow({
      dataOperator,
      bountyOperator,
      taskData: { title: 'Claim Test' },
      metadata: {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: '',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null },
        dataLayer: { type: 'github', url: '' }
      },
      amount: '100',
      asset: 'APT'
    });

    await operator.acceptFlow({ dataOperator, bountyOperator, taskUrl: publishResult.taskUrl });
    await operator.submitFlow({
      dataOperator,
      bountyOperator,
      taskUrl: publishResult.taskUrl,
      submissionData: { prUrl: 'https://github.com/test/repo/pull/1' }
    });
    await operator.confirmFlow({ dataOperator, bountyOperator, taskUrl: publishResult.taskUrl });

    // Simulate cooling period ended
    const bounty = await bountyOperator.getBounty({ bountyId: publishResult.bountyId });
    bounty.coolingUntil = Math.floor(Date.now() / 1000) - 1;

    const result = await operator.claimFlow({
      dataOperator,
      bountyOperator,
      taskUrl: publishResult.taskUrl
    });

    expect(result.txHash).toBe('tx-claim');
    expect(result.amount).toBe('100');
    expect(result.asset).toBe('APT');

    // Verify bounty status updated
    const finalBounty = await bountyOperator.getBounty({ bountyId: publishResult.bountyId });
    expect(finalBounty.status).toBe('Completed');
  });
});

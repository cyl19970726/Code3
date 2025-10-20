/**
 * Integration Tests for Task3Operator
 *
 * Tests the complete flow with mocked operators.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Task3Operator } from '../src/task3-operator.js';
import type { BountyOperator } from '@code3-team/bounty-operator';
import type { DataOperator, TaskMetadata } from '@code3-team/data-operator';

// Mock implementations
class MockBountyOperator implements BountyOperator {
  private bounties = new Map<string, any>();
  private taskHashMap = new Map<string, string>();

  async createBounty(params: any) {
    const bountyId = `bounty-${Date.now()}`;
    const bounty = {
      bountyId,
      taskId: params.taskId,
      taskHash: params.taskHash,
      status: 'Open',
      worker: null,
      amount: params.amount,
      asset: params.asset,
      createdAt: Date.now(),
      acceptedAt: null,
      submittedAt: null,
      confirmedAt: null,
      claimedAt: null
    };
    this.bounties.set(bountyId, bounty);
    this.taskHashMap.set(params.taskHash, bountyId);
    return { bountyId, txHash: 'mock-tx-hash' };
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
      bounty.acceptedAt = Date.now();
    }
    return { txHash: 'mock-tx-hash' };
  }

  async submitBounty(params: any) {
    const bounty = this.bounties.get(params.bountyId);
    if (bounty) {
      bounty.status = 'Submitted';
      bounty.submittedAt = Date.now();
    }
    return { txHash: 'mock-tx-hash' };
  }

  async confirmBounty(params: any) {
    const bounty = this.bounties.get(params.bountyId);
    const confirmedAt = Math.floor(Date.now() / 1000); // Seconds
    if (bounty) {
      bounty.status = 'Confirmed';
      bounty.confirmedAt = confirmedAt;
    }
    return {
      txHash: 'mock-tx-hash',
      confirmedAt
    };
  }

  async claimPayout(params: any) {
    const bounty = this.bounties.get(params.bountyId);
    if (bounty) {
      bounty.status = 'Claimed';
      bounty.claimedAt = Date.now();
    }
    return { txHash: 'mock-tx-hash' };
  }

  async cancelBounty() {
    return { txHash: 'mock-tx-hash' };
  }

  async listBounties() {
    return { bountyIds: Array.from(this.bounties.keys()), count: this.bounties.size };
  }

  async getBountiesBySponsor() {
    return { bountyIds: [], count: 0 };
  }

  async getBountiesByWorker() {
    return { bountyIds: [], count: 0 };
  }
}

class MockDataOperator implements DataOperator {
  private tasks = new Map<string, any>();
  private taskCounter = 1;

  async uploadTaskData(params: any) {
    const taskUrl = `https://github.com/owner/repo/issues/${this.taskCounter++}`;
    const taskId = `owner/repo#${this.taskCounter}`;
    const finalMetadata = {
      ...params.metadata,
      taskId,
      taskHash: params.metadata.taskHash, // Preserve taskHash
      dataLayer: { ...params.metadata.dataLayer, url: taskUrl }
    };
    this.tasks.set(taskUrl, {
      taskData: params.taskData,
      metadata: finalMetadata
    });
    return { taskUrl, taskId };
  }

  async downloadTaskData(params: any) {
    const task = this.tasks.get(params.taskUrl);
    if (!task) throw new Error('Task not found');
    return {
      taskData: task.taskData,
      localPath: '/tmp/task.md',
      metadata: task.metadata
    };
  }

  async uploadSubmission() {
    return { submissionUrl: `https://github.com/owner/repo/pull/${Date.now()}` };
  }

  async getTaskMetadata(params: any) {
    const task = this.tasks.get(params.taskUrl);
    if (!task) throw new Error('Task not found');
    return task.metadata;
  }

  async updateTaskMetadata(params: any) {
    const task = this.tasks.get(params.taskUrl);
    if (!task) throw new Error('Task not found');
    // Deep merge for nested objects like 'chain' and 'bounty'
    task.metadata = {
      ...task.metadata,
      ...params.metadata,
      chain: {
        ...task.metadata.chain,
        ...(params.metadata.chain || {})
      },
      bounty: {
        ...task.metadata.bounty,
        ...(params.metadata.bounty || {})
      }
    };
    return { success: true };
  }
}

class TestTask3Operator extends Task3Operator {}

describe('Task3Operator Integration Tests', () => {
  let operator: TestTask3Operator;
  let bountyOperator: MockBountyOperator;
  let dataOperator: MockDataOperator;

  beforeEach(() => {
    operator = new TestTask3Operator();
    bountyOperator = new MockBountyOperator();
    dataOperator = new MockDataOperator();
  });

  describe('publishFlow', () => {
    it('should create a new bounty', async () => {
      const result = await operator.publishFlow({
        dataOperator,
        bountyOperator,
        taskData: { title: 'Test Task' },
        metadata: {
          schema: 'code3/v2',
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

      expect(result.taskUrl).toBeTruthy();
      expect(result.bountyId).toBeTruthy();
      expect(result.txHash).toBeTruthy();
      expect(result.isNew).toBe(true);
    });

    it('should return existing bounty for same taskData (idempotency)', async () => {
      const params = {
        dataOperator,
        bountyOperator,
        taskData: { title: 'Test Task' },
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

      // Second call with same taskData but now with taskUrl in metadata
      const params2 = {
        ...params,
        metadata: {
          ...params.metadata,
          dataLayer: { ...params.metadata.dataLayer, url: result1.taskUrl }
        }
      };
      const result2 = await operator.publishFlow(params2);

      expect(result2.isNew).toBe(false);
      expect(result2.bountyId).toBe(result1.bountyId);
      expect(result2.txHash).toBeNull();
    });
  });

  describe('Complete Flow', () => {
    it('should complete full bounty lifecycle', async () => {
      // 1. Publish
      const publishResult = await operator.publishFlow({
        dataOperator,
        bountyOperator,
        taskData: { title: 'Full Flow Test' },
        metadata: {
          schema: 'code3/v2',
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

      expect(publishResult.isNew).toBe(true);
      const taskUrl = publishResult.taskUrl;

      // 2. Accept
      const acceptResult = await operator.acceptFlow({
        dataOperator,
        bountyOperator,
        taskUrl
      });

      expect(acceptResult.bountyId).toBe(publishResult.bountyId);
      expect(acceptResult.txHash).toBeTruthy();

      // 3. Submit
      const submitResult = await operator.submitFlow({
        dataOperator,
        bountyOperator,
        taskUrl,
        submissionData: { prUrl: 'https://github.com/owner/repo/pull/1' }
      });

      expect(submitResult.submissionUrl).toBeTruthy();
      expect(submitResult.txHash).toBeTruthy();

      // 4. Confirm
      const confirmResult = await operator.confirmFlow({
        dataOperator,
        bountyOperator,
        taskUrl
      });

      expect(confirmResult.txHash).toBeTruthy();

      // 5. Claim (after confirmation)
      const claimResult = await operator.claimFlow({
        dataOperator,
        bountyOperator,
        taskUrl
      });

      expect(claimResult.txHash).toBeTruthy();
    });
  });
});

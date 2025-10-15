import { describe, it, expect, beforeEach } from 'vitest';
import type { BountyOperator } from '@code3-team/bounty-operator';

/**
 * BountyOperator Interface Unit Tests
 *
 * Tests all 11 methods defined in BountyOperator interface:
 * - createBounty
 * - getBountyByTaskHash
 * - getBounty
 * - acceptBounty
 * - submitBounty
 * - confirmBounty
 * - claimPayout
 * - cancelBounty
 * - listBounties
 * - getBountiesBySponsor
 * - getBountiesByWorker
 */

// Mock implementation for testing
class MockBountyOperator implements BountyOperator {
  private bounties = new Map<string, any>();
  private taskHashMap = new Map<string, string>();
  private bountyCounter = 1;

  async createBounty(params: any) {
    const bountyId = `bounty-${this.bountyCounter++}`;
    const bounty = {
      bountyId,
      taskHash: params.taskHash,
      sponsor: params.sponsor,
      amount: params.amount,
      asset: params.asset,
      status: 'Open',
      worker: null,
      acceptedAt: null,
      submittedAt: null,
      confirmedAt: null,
      coolingUntil: null
    };
    this.bounties.set(bountyId, bounty);
    this.taskHashMap.set(params.taskHash, bountyId);
    return { bountyId, txHash: 'mock-create-tx' };
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
    if (!bounty) throw new Error('Bounty not found');
    if (bounty.status !== 'Open') {
      throw new Error(`Cannot accept bounty with status ${bounty.status}`);
    }
    bounty.status = 'Accepted';
    bounty.worker = params.worker;
    bounty.acceptedAt = Math.floor(Date.now() / 1000);
    return { txHash: 'mock-accept-tx' };
  }

  async submitBounty(params: any) {
    const bounty = this.bounties.get(params.bountyId);
    if (!bounty) throw new Error('Bounty not found');
    if (bounty.status !== 'Accepted') {
      throw new Error(`Cannot submit bounty with status ${bounty.status}`);
    }
    bounty.status = 'Submitted';
    bounty.submittedAt = Math.floor(Date.now() / 1000);
    return { txHash: 'mock-submit-tx' };
  }

  async confirmBounty(params: any) {
    const bounty = this.bounties.get(params.bountyId);
    if (!bounty) throw new Error('Bounty not found');
    if (bounty.status !== 'Submitted') {
      throw new Error(`Cannot confirm bounty with status ${bounty.status}`);
    }
    const confirmedAt = Math.floor(Date.now() / 1000);
    const coolingUntil = confirmedAt + 7 * 24 * 60 * 60; // 7 days
    bounty.status = 'Confirmed';
    bounty.confirmedAt = confirmedAt;
    bounty.coolingUntil = coolingUntil;
    return { txHash: 'mock-confirm-tx', confirmedAt, coolingUntil };
  }

  async claimPayout(params: any) {
    const bounty = this.bounties.get(params.bountyId);
    if (!bounty) throw new Error('Bounty not found');
    if (bounty.status !== 'Confirmed') {
      throw new Error(`Cannot claim bounty with status ${bounty.status}`);
    }
    const now = Math.floor(Date.now() / 1000);
    if (bounty.coolingUntil && now < bounty.coolingUntil) {
      throw new Error('Cooling period not ended');
    }
    bounty.status = 'Completed';
    return { txHash: 'mock-claim-tx' };
  }

  async cancelBounty(params: any) {
    const bounty = this.bounties.get(params.bountyId);
    if (!bounty) throw new Error('Bounty not found');
    bounty.status = 'Cancelled';
    return { txHash: 'mock-cancel-tx' };
  }

  async listBounties() {
    return {
      bountyIds: Array.from(this.bounties.keys()),
      count: this.bounties.size
    };
  }

  async getBountiesBySponsor(params: any) {
    const bountyIds = Array.from(this.bounties.values())
      .filter(b => b.sponsor === params.sponsor)
      .map(b => b.bountyId);
    return { bountyIds, count: bountyIds.length };
  }

  async getBountiesByWorker(params: any) {
    const bountyIds = Array.from(this.bounties.values())
      .filter(b => b.worker === params.worker)
      .map(b => b.bountyId);
    return { bountyIds, count: bountyIds.length };
  }
}

describe('BountyOperator Interface Tests', () => {
  let operator: MockBountyOperator;

  beforeEach(() => {
    operator = new MockBountyOperator();
  });

  describe('createBounty', () => {
    it('should create a new bounty', async () => {
      const result = await operator.createBounty({
        taskHash: 'hash-123',
        sponsor: '0xSponsor',
        amount: '100',
        asset: 'APT'
      });

      expect(result.bountyId).toBeTruthy();
      expect(result.txHash).toBe('mock-create-tx');

      const bounty = await operator.getBounty({ bountyId: result.bountyId });
      expect(bounty.status).toBe('Open');
      expect(bounty.amount).toBe('100');
      expect(bounty.asset).toBe('APT');
    });
  });

  describe('getBountyByTaskHash', () => {
    it('should find bounty by taskHash', async () => {
      const createResult = await operator.createBounty({
        taskHash: 'hash-456',
        sponsor: '0xSponsor',
        amount: '200',
        asset: 'APT'
      });

      const result = await operator.getBountyByTaskHash({ taskHash: 'hash-456' });
      expect(result.found).toBe(true);
      expect(result.bountyId).toBe(createResult.bountyId);
    });

    it('should return not found for non-existent taskHash', async () => {
      const result = await operator.getBountyByTaskHash({ taskHash: 'non-existent' });
      expect(result.found).toBe(false);
      expect(result.bountyId).toBeNull();
    });
  });

  describe('getBounty', () => {
    it('should retrieve bounty details', async () => {
      const createResult = await operator.createBounty({
        taskHash: 'hash-789',
        sponsor: '0xSponsor',
        amount: '300',
        asset: 'APT'
      });

      const bounty = await operator.getBounty({ bountyId: createResult.bountyId });
      expect(bounty.bountyId).toBe(createResult.bountyId);
      expect(bounty.taskHash).toBe('hash-789');
      expect(bounty.status).toBe('Open');
    });

    it('should throw error for non-existent bounty', async () => {
      await expect(operator.getBounty({ bountyId: 'non-existent' }))
        .rejects.toThrow('Bounty not found');
    });
  });

  describe('acceptBounty', () => {
    it('should accept an Open bounty', async () => {
      const createResult = await operator.createBounty({
        taskHash: 'hash-accept',
        sponsor: '0xSponsor',
        amount: '100',
        asset: 'APT'
      });

      const result = await operator.acceptBounty({
        bountyId: createResult.bountyId,
        worker: '0xWorker'
      });

      expect(result.txHash).toBe('mock-accept-tx');

      const bounty = await operator.getBounty({ bountyId: createResult.bountyId });
      expect(bounty.status).toBe('Accepted');
      expect(bounty.worker).toBe('0xWorker');
      expect(bounty.acceptedAt).toBeGreaterThan(0);
    });

    it('should reject accepting non-Open bounty', async () => {
      const createResult = await operator.createBounty({
        taskHash: 'hash-accept-2',
        sponsor: '0xSponsor',
        amount: '100',
        asset: 'APT'
      });

      await operator.acceptBounty({ bountyId: createResult.bountyId, worker: '0xWorker1' });

      await expect(
        operator.acceptBounty({ bountyId: createResult.bountyId, worker: '0xWorker2' })
      ).rejects.toThrow('Cannot accept bounty with status Accepted');
    });
  });

  describe('submitBounty', () => {
    it('should submit an Accepted bounty', async () => {
      const createResult = await operator.createBounty({
        taskHash: 'hash-submit',
        sponsor: '0xSponsor',
        amount: '100',
        asset: 'APT'
      });

      await operator.acceptBounty({ bountyId: createResult.bountyId, worker: '0xWorker' });

      const result = await operator.submitBounty({ bountyId: createResult.bountyId });
      expect(result.txHash).toBe('mock-submit-tx');

      const bounty = await operator.getBounty({ bountyId: createResult.bountyId });
      expect(bounty.status).toBe('Submitted');
      expect(bounty.submittedAt).toBeGreaterThan(0);
    });

    it('should reject submitting non-Accepted bounty', async () => {
      const createResult = await operator.createBounty({
        taskHash: 'hash-submit-2',
        sponsor: '0xSponsor',
        amount: '100',
        asset: 'APT'
      });

      await expect(operator.submitBounty({ bountyId: createResult.bountyId }))
        .rejects.toThrow('Cannot submit bounty with status Open');
    });
  });

  describe('confirmBounty', () => {
    it('should confirm a Submitted bounty and start cooling period', async () => {
      const createResult = await operator.createBounty({
        taskHash: 'hash-confirm',
        sponsor: '0xSponsor',
        amount: '100',
        asset: 'APT'
      });

      await operator.acceptBounty({ bountyId: createResult.bountyId, worker: '0xWorker' });
      await operator.submitBounty({ bountyId: createResult.bountyId });

      const result = await operator.confirmBounty({ bountyId: createResult.bountyId });
      expect(result.txHash).toBe('mock-confirm-tx');
      expect(result.confirmedAt).toBeGreaterThan(0);
      expect(result.coolingUntil).toBeGreaterThan(result.confirmedAt);

      const bounty = await operator.getBounty({ bountyId: createResult.bountyId });
      expect(bounty.status).toBe('Confirmed');
      expect(bounty.coolingUntil).toBe(result.coolingUntil);
    });

    it('should reject confirming non-Submitted bounty', async () => {
      const createResult = await operator.createBounty({
        taskHash: 'hash-confirm-2',
        sponsor: '0xSponsor',
        amount: '100',
        asset: 'APT'
      });

      await expect(operator.confirmBounty({ bountyId: createResult.bountyId }))
        .rejects.toThrow('Cannot confirm bounty with status Open');
    });
  });

  describe('claimPayout', () => {
    it('should claim payout after cooling period', async () => {
      const createResult = await operator.createBounty({
        taskHash: 'hash-claim',
        sponsor: '0xSponsor',
        amount: '100',
        asset: 'APT'
      });

      await operator.acceptBounty({ bountyId: createResult.bountyId, worker: '0xWorker' });
      await operator.submitBounty({ bountyId: createResult.bountyId });
      await operator.confirmBounty({ bountyId: createResult.bountyId });

      // Simulate cooling period ended
      const bounty = await operator.getBounty({ bountyId: createResult.bountyId });
      bounty.coolingUntil = Math.floor(Date.now() / 1000) - 1;

      const result = await operator.claimPayout({ bountyId: createResult.bountyId });
      expect(result.txHash).toBe('mock-claim-tx');

      const updatedBounty = await operator.getBounty({ bountyId: createResult.bountyId });
      expect(updatedBounty.status).toBe('Completed');
    });

    it('should reject claiming before cooling period ends', async () => {
      const createResult = await operator.createBounty({
        taskHash: 'hash-claim-2',
        sponsor: '0xSponsor',
        amount: '100',
        asset: 'APT'
      });

      await operator.acceptBounty({ bountyId: createResult.bountyId, worker: '0xWorker' });
      await operator.submitBounty({ bountyId: createResult.bountyId });
      await operator.confirmBounty({ bountyId: createResult.bountyId });

      await expect(operator.claimPayout({ bountyId: createResult.bountyId }))
        .rejects.toThrow('Cooling period not ended');
    });

    it('should reject claiming non-Confirmed bounty', async () => {
      const createResult = await operator.createBounty({
        taskHash: 'hash-claim-3',
        sponsor: '0xSponsor',
        amount: '100',
        asset: 'APT'
      });

      await expect(operator.claimPayout({ bountyId: createResult.bountyId }))
        .rejects.toThrow('Cannot claim bounty with status Open');
    });
  });

  describe('cancelBounty', () => {
    it('should cancel a bounty', async () => {
      const createResult = await operator.createBounty({
        taskHash: 'hash-cancel',
        sponsor: '0xSponsor',
        amount: '100',
        asset: 'APT'
      });

      const result = await operator.cancelBounty({ bountyId: createResult.bountyId });
      expect(result.txHash).toBe('mock-cancel-tx');

      const bounty = await operator.getBounty({ bountyId: createResult.bountyId });
      expect(bounty.status).toBe('Cancelled');
    });
  });

  describe('listBounties', () => {
    it('should list all bounties', async () => {
      await operator.createBounty({ taskHash: 'hash-1', sponsor: '0xS1', amount: '100', asset: 'APT' });
      await operator.createBounty({ taskHash: 'hash-2', sponsor: '0xS2', amount: '200', asset: 'APT' });
      await operator.createBounty({ taskHash: 'hash-3', sponsor: '0xS3', amount: '300', asset: 'APT' });

      const result = await operator.listBounties();
      expect(result.count).toBe(3);
      expect(result.bountyIds.length).toBe(3);
    });

    it('should return empty list when no bounties', async () => {
      const result = await operator.listBounties();
      expect(result.count).toBe(0);
      expect(result.bountyIds.length).toBe(0);
    });
  });

  describe('getBountiesBySponsor', () => {
    it('should filter bounties by sponsor', async () => {
      await operator.createBounty({ taskHash: 'h1', sponsor: '0xSponsorA', amount: '100', asset: 'APT' });
      await operator.createBounty({ taskHash: 'h2', sponsor: '0xSponsorB', amount: '200', asset: 'APT' });
      await operator.createBounty({ taskHash: 'h3', sponsor: '0xSponsorA', amount: '300', asset: 'APT' });

      const result = await operator.getBountiesBySponsor({ sponsor: '0xSponsorA' });
      expect(result.count).toBe(2);
      expect(result.bountyIds.length).toBe(2);
    });
  });

  describe('getBountiesByWorker', () => {
    it('should filter bounties by worker', async () => {
      const b1 = await operator.createBounty({ taskHash: 'w1', sponsor: '0xS', amount: '100', asset: 'APT' });
      const b2 = await operator.createBounty({ taskHash: 'w2', sponsor: '0xS', amount: '200', asset: 'APT' });
      const b3 = await operator.createBounty({ taskHash: 'w3', sponsor: '0xS', amount: '300', asset: 'APT' });

      await operator.acceptBounty({ bountyId: b1.bountyId, worker: '0xWorkerX' });
      await operator.acceptBounty({ bountyId: b3.bountyId, worker: '0xWorkerX' });

      const result = await operator.getBountiesByWorker({ worker: '0xWorkerX' });
      expect(result.count).toBe(2);
      expect(result.bountyIds).toContain(b1.bountyId);
      expect(result.bountyIds).toContain(b3.bountyId);
      expect(result.bountyIds).not.toContain(b2.bountyId);
    });
  });
});

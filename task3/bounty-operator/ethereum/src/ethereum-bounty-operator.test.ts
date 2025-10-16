import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EthereumBountyOperator } from './ethereum-bounty-operator.js';
import { BountyStatus } from '@code3-team/bounty-operator';

// Mock ethers
vi.mock('ethers', () => {
  const mockProvider = {
    getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
    getBlockNumber: vi.fn().mockResolvedValue(12345)
  };

  const mockWallet = {
    address: '0x1234567890123456789012345678901234567890',
    connect: vi.fn()
  };

  const mockContract = {
    createBounty: vi.fn(),
    acceptBounty: vi.fn(),
    submitBounty: vi.fn(),
    confirmBounty: vi.fn(),
    claimBounty: vi.fn(),
    cancelBounty: vi.fn(),
    getBounty: vi.fn(),
    getBountyByTaskHash: vi.fn(),
    listBounties: vi.fn(),
    getBountiesByRequester: vi.fn(),
    getBountiesByWorker: vi.fn(),
    COOLING_PERIOD: vi.fn().mockResolvedValue(BigInt(604800)),
    interface: {
      parseLog: vi.fn()
    }
  };

  return {
    ethers: {
      ZeroAddress: '0x0000000000000000000000000000000000000000',
      keccak256: vi.fn((data: string) => `0x${data.slice(0, 64).padEnd(64, '0')}`),
      toUtf8Bytes: vi.fn((str: string) => str)
    },
    JsonRpcProvider: vi.fn(() => mockProvider),
    Wallet: vi.fn(() => mockWallet),
    Contract: vi.fn(() => mockContract)
  };
});

describe('EthereumBountyOperator', () => {
  let operator: EthereumBountyOperator;

  beforeEach(() => {
    operator = new EthereumBountyOperator({
      rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/test',
      privateKey: '0x' + '1'.repeat(64),
      contractAddress: '0xc18C3F54778D2B1527c1081Ed15F030170C42B82'
    });
  });

  describe('Constructor', () => {
    it('should create an instance with valid config', () => {
      expect(operator).toBeInstanceOf(EthereumBountyOperator);
    });

    it('should expose helper methods', () => {
      expect(typeof operator.getAddress).toBe('function');
      expect(typeof operator.getContractAddress).toBe('function');
      expect(typeof operator.getCoolingPeriod).toBe('function');
    });
  });

  describe('Write Operations', () => {
    it('createBounty: should create a bounty with ETH', async () => {
      const mockTx = {
        wait: vi.fn().mockResolvedValue({
          hash: '0xabc123',
          logs: [
            {
              parseLog: vi.fn()
            }
          ]
        })
      };

      // Mock contract createBounty
      const mockContract = (operator as any).contract;
      mockContract.createBounty.mockResolvedValue(mockTx);
      mockContract.interface.parseLog.mockReturnValue({
        name: 'BountyCreated',
        args: {
          bountyId: BigInt(1),
          taskId: 'test-task',
          taskHash: '0x123',
          requester: '0x123',
          amount: BigInt(1000000000000000000),
          asset: '0x0000000000000000000000000000000000000000'
        }
      });

      const result = await operator.createBounty({
        taskId: 'test-task-001',
        taskHash: '0x123abc',
        amount: '1000000000000000000',
        asset: 'ETH'
      });

      expect(result).toHaveProperty('bountyId');
      expect(result).toHaveProperty('txHash');
    });

    it('acceptBounty: should accept a bounty', async () => {
      const mockTx = {
        wait: vi.fn().mockResolvedValue({
          hash: '0xdef456'
        })
      };

      const mockContract = (operator as any).contract;
      mockContract.acceptBounty.mockResolvedValue(mockTx);

      const result = await operator.acceptBounty({ bountyId: '1' });

      expect(result).toHaveProperty('txHash');
      expect(result.txHash).toBe('0xdef456');
    });

    it('submitBounty: should submit work', async () => {
      const mockTx = {
        wait: vi.fn().mockResolvedValue({
          hash: '0xghi789'
        })
      };

      const mockContract = (operator as any).contract;
      mockContract.submitBounty.mockResolvedValue(mockTx);

      const result = await operator.submitBounty({
        bountyId: '1',
        submissionHash: 'https://github.com/pr/123'
      });

      expect(result).toHaveProperty('txHash');
      expect(result.txHash).toBe('0xghi789');
    });

    it('confirmBounty: should confirm work and return cooling period', async () => {
      const mockContract = (operator as any).contract;

      const mockTx = {
        wait: vi.fn().mockResolvedValue({
          hash: '0xjkl012',
          logs: [{}] // Need at least one log
        })
      };

      mockContract.confirmBounty.mockResolvedValue(mockTx);
      mockContract.interface.parseLog.mockReturnValue({
        name: 'BountyConfirmed',
        args: {
          bountyId: BigInt(1),
          confirmedAt: BigInt(1697000000),
          coolingUntil: BigInt(1697604800)
        }
      });

      const result = await operator.confirmBounty({
        bountyId: '1',
        confirmedAt: 1697000000
      });

      expect(result).toHaveProperty('txHash');
      expect(result).toHaveProperty('confirmedAt');
      expect(result).toHaveProperty('coolingUntil');
    });

    it('claimPayout: should claim the payout', async () => {
      const mockTx = {
        wait: vi.fn().mockResolvedValue({
          hash: '0xmno345'
        })
      };

      const mockContract = (operator as any).contract;
      mockContract.claimBounty.mockResolvedValue(mockTx);

      const result = await operator.claimPayout({ bountyId: '1' });

      expect(result).toHaveProperty('txHash');
      expect(result.txHash).toBe('0xmno345');
    });

    it('cancelBounty: should cancel the bounty', async () => {
      const mockTx = {
        wait: vi.fn().mockResolvedValue({
          hash: '0xpqr678'
        })
      };

      const mockContract = (operator as any).contract;
      mockContract.cancelBounty.mockResolvedValue(mockTx);

      const result = await operator.cancelBounty({ bountyId: '1' });

      expect(result).toHaveProperty('txHash');
      expect(result.txHash).toBe('0xpqr678');
    });
  });

  describe('Read Operations', () => {
    it('getBounty: should get bounty details', async () => {
      const mockBountyData = {
        bountyId: BigInt(1),
        taskId: 'test-task-001',
        taskHash: '0x123abc',
        requester: '0x1234567890123456789012345678901234567890',
        worker: '0x0987654321098765432109876543210987654321',
        amount: BigInt('1000000000000000000'),
        asset: '0x0000000000000000000000000000000000000000',
        status: 1, // Accepted
        createdAt: BigInt(1697000000),
        acceptedAt: BigInt(1697001000),
        submittedAt: BigInt(0),
        submissionUrl: '',
        confirmedAt: BigInt(0),
        coolingUntil: BigInt(0),
        claimedAt: BigInt(0)
      };

      const mockContract = (operator as any).contract;
      mockContract.getBounty.mockResolvedValue(mockBountyData);

      const result = await operator.getBounty({ bountyId: '1' });

      expect(result.bountyId).toBe('1');
      expect(result.taskId).toBe('test-task-001');
      expect(result.status).toBe(BountyStatus.Accepted);
      expect(result.sponsor).toBe('0x1234567890123456789012345678901234567890');
      expect(result.worker).toBe('0x0987654321098765432109876543210987654321');
      expect(result.amount).toBe('1000000000000000000');
      expect(result.asset).toBe('ETH');
    });

    it('getBountyByTaskHash: should find bounty by task hash', async () => {
      const mockContract = (operator as any).contract;
      mockContract.getBountyByTaskHash.mockResolvedValue([true, BigInt(1)]);

      const result = await operator.getBountyByTaskHash({ taskHash: '0x123abc' });

      expect(result.found).toBe(true);
      expect(result.bountyId).toBe('1');
    });

    it('getBountyByTaskHash: should return null if not found', async () => {
      const mockContract = (operator as any).contract;
      mockContract.getBountyByTaskHash.mockResolvedValue([false, BigInt(0)]);

      const result = await operator.getBountyByTaskHash({ taskHash: '0xnonexistent' });

      expect(result.found).toBe(false);
      expect(result.bountyId).toBeNull();
    });

    it('listBounties: should list bounty IDs', async () => {
      const mockContract = (operator as any).contract;
      mockContract.listBounties.mockResolvedValue([BigInt(1), BigInt(2), BigInt(3)]);

      const result = await operator.listBounties({ offset: 0, limit: 10 });

      expect(result.bountyIds).toEqual(['1', '2', '3']);
      expect(result.count).toBe(3);
    });

    it('getBountiesBySponsor: should get bounties by sponsor', async () => {
      const mockContract = (operator as any).contract;
      mockContract.getBountiesByRequester.mockResolvedValue([BigInt(1), BigInt(2)]);

      const result = await operator.getBountiesBySponsor({
        sponsor: '0x1234567890123456789012345678901234567890'
      });

      expect(result.bountyIds).toEqual(['1', '2']);
      expect(result.count).toBe(2);
    });

    it('getBountiesByWorker: should get bounties by worker', async () => {
      const mockContract = (operator as any).contract;
      mockContract.getBountiesByWorker.mockResolvedValue([BigInt(3), BigInt(4)]);

      const result = await operator.getBountiesByWorker({
        worker: '0x0987654321098765432109876543210987654321'
      });

      expect(result.bountyIds).toEqual(['3', '4']);
      expect(result.count).toBe(2);
    });
  });

  describe('Helper Methods', () => {
    it('getCoolingPeriod: should return cooling period', async () => {
      const mockContract = (operator as any).contract;
      mockContract.COOLING_PERIOD.mockResolvedValue(BigInt(604800));

      const period = await operator.getCoolingPeriod();

      expect(period).toBe(604800); // 7 days
    });

    it('getAddress: should return wallet address', () => {
      const address = operator.getAddress();
      expect(address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('getContractAddress: should return contract address', () => {
      const address = operator.getContractAddress();
      expect(address).toBe('0xc18C3F54778D2B1527c1081Ed15F030170C42B82');
    });
  });
});

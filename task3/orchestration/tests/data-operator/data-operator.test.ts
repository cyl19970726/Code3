import { describe, it, expect, beforeEach } from 'vitest';
import type { DataOperator } from '@code3-team/data-operator';

/**
 * DataOperator Interface Unit Tests
 *
 * Tests all 4 methods defined in DataOperator interface:
 * - uploadTaskData
 * - downloadTaskData
 * - getTaskMetadata
 * - updateTaskMetadata
 */

// Mock implementation for testing
class MockDataOperator implements DataOperator {
  private tasks = new Map<string, any>();
  private taskCounter = 1;

  async uploadTaskData(params: any) {
    const taskUrl = `https://github.com/test/repo/issues/${this.taskCounter}`;
    const taskId = `test/repo#${this.taskCounter}`;
    this.taskCounter++;

    const enrichedMetadata = {
      ...params.metadata,
      taskId,
      dataLayer: {
        ...params.metadata.dataLayer,
        url: taskUrl
      }
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
    return task.taskData;
  }

  async getTaskMetadata(params: any) {
    const task = this.tasks.get(params.taskUrl);
    if (!task) throw new Error('Task not found');
    return task.metadata;
  }

  async updateTaskMetadata(params: any) {
    const task = this.tasks.get(params.taskUrl);
    if (!task) throw new Error('Task not found');

    // Deep merge for nested objects
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
      },
      dataLayer: {
        ...task.metadata.dataLayer,
        ...(params.metadata.dataLayer || {})
      }
    };

    return { success: true };
  }
}

describe('DataOperator Interface Tests', () => {
  let operator: MockDataOperator;

  beforeEach(() => {
    operator = new MockDataOperator();
  });

  describe('uploadTaskData', () => {
    it('should upload task data and metadata', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        requirements: ['Req 1', 'Req 2']
      };

      const metadata = {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: 'hash-123',
        chain: {
          name: 'aptos',
          network: 'testnet',
          bountyId: '',
          contractAddress: '0x123'
        },
        workflow: {
          name: 'spec-kit',
          version: '1.0.0',
          adapter: 'spec-kit-mcp-adapter'
        },
        bounty: {
          asset: 'APT',
          amount: '100',
          confirmedAt: null,
          coolingUntil: null
        },
        dataLayer: {
          type: 'github',
          url: ''
        }
      };

      const result = await operator.uploadTaskData({ taskData, metadata });

      expect(result.taskUrl).toMatch(/https:\/\/github.com\/test\/repo\/issues\/\d+/);
      expect(result.taskId).toMatch(/test\/repo#\d+/);

      // Verify data was stored
      const retrievedData = await operator.downloadTaskData({ taskUrl: result.taskUrl });
      expect(retrievedData).toEqual(taskData);
    });

    it('should enrich metadata with taskId and dataLayer.url', async () => {
      const taskData = { title: 'Test' };
      const metadata = {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: 'hash-456',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null, coolingUntil: null },
        dataLayer: { type: 'github', url: '' }
      };

      const result = await operator.uploadTaskData({ taskData, metadata });
      const retrievedMetadata = await operator.getTaskMetadata({ taskUrl: result.taskUrl });

      expect(retrievedMetadata.taskId).toBe(result.taskId);
      expect(retrievedMetadata.dataLayer.url).toBe(result.taskUrl);
    });
  });

  describe('downloadTaskData', () => {
    it('should download task data by taskUrl', async () => {
      const taskData = {
        title: 'Download Test',
        body: 'Test body content'
      };

      const metadata = {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: 'hash-download',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null, coolingUntil: null },
        dataLayer: { type: 'github', url: '' }
      };

      const uploadResult = await operator.uploadTaskData({ taskData, metadata });
      const downloadedData = await operator.downloadTaskData({ taskUrl: uploadResult.taskUrl });

      expect(downloadedData).toEqual(taskData);
    });

    it('should throw error for non-existent task', async () => {
      await expect(operator.downloadTaskData({ taskUrl: 'https://github.com/test/repo/issues/999' }))
        .rejects.toThrow('Task not found');
    });
  });

  describe('getTaskMetadata', () => {
    it('should retrieve task metadata by taskUrl', async () => {
      const taskData = { title: 'Metadata Test' };
      const metadata = {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: 'hash-metadata',
        chain: {
          name: 'aptos',
          network: 'testnet',
          bountyId: 'bounty-123',
          contractAddress: '0x123'
        },
        workflow: {
          name: 'spec-kit',
          version: '1.0.0',
          adapter: 'spec-kit-mcp-adapter'
        },
        bounty: {
          asset: 'APT',
          amount: '250',
          confirmedAt: null,
          coolingUntil: null
        },
        dataLayer: {
          type: 'github',
          url: ''
        }
      };

      const uploadResult = await operator.uploadTaskData({ taskData, metadata });
      const retrievedMetadata = await operator.getTaskMetadata({ taskUrl: uploadResult.taskUrl });

      expect(retrievedMetadata.taskHash).toBe('hash-metadata');
      expect(retrievedMetadata.chain.bountyId).toBe('bounty-123');
      expect(retrievedMetadata.bounty.amount).toBe('250');
      expect(retrievedMetadata.schema).toBe('code3/v2');
    });

    it('should throw error for non-existent task', async () => {
      await expect(operator.getTaskMetadata({ taskUrl: 'https://github.com/test/repo/issues/999' }))
        .rejects.toThrow('Task not found');
    });
  });

  describe('updateTaskMetadata', () => {
    it('should update metadata with partial updates', async () => {
      const taskData = { title: 'Update Test' };
      const metadata = {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: 'hash-update',
        chain: {
          name: 'aptos',
          network: 'testnet',
          bountyId: '',
          contractAddress: '0x123'
        },
        workflow: {
          name: 'spec-kit',
          version: '1.0.0',
          adapter: 'spec-kit-mcp-adapter'
        },
        bounty: {
          asset: 'APT',
          amount: '100',
          confirmedAt: null,
          coolingUntil: null
        },
        dataLayer: {
          type: 'github',
          url: ''
        }
      };

      const uploadResult = await operator.uploadTaskData({ taskData, metadata });

      // Update bountyId in chain
      await operator.updateTaskMetadata({
        taskUrl: uploadResult.taskUrl,
        metadata: {
          chain: {
            bountyId: 'bounty-456'
          }
        }
      });

      const updatedMetadata = await operator.getTaskMetadata({ taskUrl: uploadResult.taskUrl });
      expect(updatedMetadata.chain.bountyId).toBe('bounty-456');
      expect(updatedMetadata.chain.name).toBe('aptos'); // Other fields preserved
      expect(updatedMetadata.taskHash).toBe('hash-update'); // Top-level fields preserved
    });

    it('should support multiple sequential updates', async () => {
      const taskData = { title: 'Sequential Updates' };
      const metadata = {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: 'hash-sequential',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null, coolingUntil: null },
        dataLayer: { type: 'github', url: '' }
      };

      const uploadResult = await operator.uploadTaskData({ taskData, metadata });

      // Update 1: Set bountyId
      await operator.updateTaskMetadata({
        taskUrl: uploadResult.taskUrl,
        metadata: { chain: { bountyId: 'bounty-789' } }
      });

      // Update 2: Set confirmedAt
      await operator.updateTaskMetadata({
        taskUrl: uploadResult.taskUrl,
        metadata: { bounty: { confirmedAt: 1234567890 } }
      });

      // Update 3: Set coolingUntil
      await operator.updateTaskMetadata({
        taskUrl: uploadResult.taskUrl,
        metadata: { bounty: { coolingUntil: 1234567890 + 604800 } }
      });

      const finalMetadata = await operator.getTaskMetadata({ taskUrl: uploadResult.taskUrl });
      expect(finalMetadata.chain.bountyId).toBe('bounty-789');
      expect(finalMetadata.bounty.confirmedAt).toBe(1234567890);
      expect(finalMetadata.bounty.coolingUntil).toBe(1234567890 + 604800);
    });

    it('should support deep merge for nested objects', async () => {
      const taskData = { title: 'Deep Merge Test' };
      const metadata = {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: 'hash-deep',
        chain: {
          name: 'aptos',
          network: 'testnet',
          bountyId: 'bounty-original',
          contractAddress: '0x123'
        },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: {
          asset: 'APT',
          amount: '100',
          confirmedAt: 111,
          coolingUntil: 222
        },
        dataLayer: { type: 'github', url: '' }
      };

      const uploadResult = await operator.uploadTaskData({ taskData, metadata });

      // Partial update should merge, not replace
      await operator.updateTaskMetadata({
        taskUrl: uploadResult.taskUrl,
        metadata: {
          chain: {
            bountyId: 'bounty-updated'
            // name, network, contractAddress should be preserved
          },
          bounty: {
            confirmedAt: 999
            // asset, amount, coolingUntil should be preserved
          }
        }
      });

      const finalMetadata = await operator.getTaskMetadata({ taskUrl: uploadResult.taskUrl });
      expect(finalMetadata.chain.bountyId).toBe('bounty-updated');
      expect(finalMetadata.chain.name).toBe('aptos');
      expect(finalMetadata.chain.network).toBe('testnet');
      expect(finalMetadata.bounty.confirmedAt).toBe(999);
      expect(finalMetadata.bounty.amount).toBe('100');
      expect(finalMetadata.bounty.coolingUntil).toBe(222);
    });

    it('should throw error for non-existent task', async () => {
      await expect(
        operator.updateTaskMetadata({
          taskUrl: 'https://github.com/test/repo/issues/999',
          metadata: { chain: { bountyId: 'test' } }
        })
      ).rejects.toThrow('Task not found');
    });

    it('should return success true on successful update', async () => {
      const taskData = { title: 'Success Test' };
      const metadata = {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: 'hash-success',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null, coolingUntil: null },
        dataLayer: { type: 'github', url: '' }
      };

      const uploadResult = await operator.uploadTaskData({ taskData, metadata });
      const updateResult = await operator.updateTaskMetadata({
        taskUrl: uploadResult.taskUrl,
        metadata: { chain: { bountyId: 'test' } }
      });

      expect(updateResult.success).toBe(true);
    });
  });

  describe('Metadata Schema Validation', () => {
    it('should handle code3/v2 schema correctly', async () => {
      const taskData = { title: 'Schema Test' };
      const metadata = {
        schema: 'code3/v2' as const,
        taskId: '',
        taskHash: 'hash-schema',
        chain: { name: 'aptos', network: 'testnet', bountyId: '', contractAddress: '0x123' },
        workflow: { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' },
        bounty: { asset: 'APT', amount: '100', confirmedAt: null, coolingUntil: null },
        dataLayer: { type: 'github', url: '' }
      };

      const uploadResult = await operator.uploadTaskData({ taskData, metadata });
      const retrievedMetadata = await operator.getTaskMetadata({ taskUrl: uploadResult.taskUrl });

      expect(retrievedMetadata.schema).toBe('code3/v2');
    });
  });
});

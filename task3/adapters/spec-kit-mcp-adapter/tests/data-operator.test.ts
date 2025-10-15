/**
 * Unit Tests for SpecKitDataOperator
 *
 * Testing strategy:
 * - Mock GitHubDataLayer to avoid real GitHub API calls
 * - Test all 5 DataOperator methods
 * - Verify correct parameter passing and return values
 * - Verify file system operations (where applicable)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpecKitDataOperator } from '../src/data-operator.js';
import { GitHubDataLayer } from '@code3-team/data-layers-github';
import { TaskMetadata } from '@code3-team/data-operator';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Mock GitHubDataLayer
vi.mock('@code3-team/data-layers-github', () => ({
  GitHubDataLayer: vi.fn()
}));

// Mock fs module for file system operations
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn()
  }
}));

describe('SpecKitDataOperator', () => {
  let dataOperator: SpecKitDataOperator;
  let mockGitHubDataLayer: any;

  const testConfig = {
    githubToken: 'test-token-123',
    repo: 'test-owner/test-repo',
    localSpecsDir: '/tmp/test-specs'
  };

  const testMetadata: TaskMetadata = {
    schema: 'code3/v2' as const,
    taskId: '',
    taskHash: '',
    chain: {
      name: 'aptos',
      network: 'testnet',
      bountyId: '',
      contractAddress: '0xtest123'
    },
    workflow: {
      name: 'spec-kit',
      version: '1.0.0',
      adapter: 'spec-kit-mcp-adapter'
    },
    bounty: {
      asset: 'APT',
      amount: '100000000',
      confirmedAt: null,
      coolingUntil: null
    },
    dataLayer: {
      type: 'github',
      url: ''
    }
  };

  beforeEach(() => {
    // Create mock GitHubDataLayer instance
    mockGitHubDataLayer = {
      createIssue: vi.fn().mockResolvedValue({
        issueUrl: 'https://github.com/test-owner/test-repo/issues/1',
        issueId: 'test-owner/test-repo#1'
      }),
      getIssue: vi.fn().mockResolvedValue({
        issueNumber: 1,
        content: '# Test Spec\n\nTest content',
        metadata: testMetadata
      }),
      createPR: vi.fn().mockResolvedValue({
        prUrl: 'https://github.com/test-owner/test-repo/pull/2'
      }),
      updateIssue: vi.fn().mockResolvedValue(undefined)
    };

    // Mock GitHubDataLayer constructor to return mock instance
    (GitHubDataLayer as any).mockImplementation(() => mockGitHubDataLayer);

    // Mock fs operations
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    // Create SpecKitDataOperator instance
    dataOperator = new SpecKitDataOperator(testConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadTaskData', () => {
    it('should create GitHub Issue with correct title and body', async () => {
      // Given
      const specContent = '# User Authentication\n\nImplement user authentication feature';
      const params = {
        taskData: { content: specContent },
        metadata: testMetadata
      };

      // When
      const result = await dataOperator.uploadTaskData(params);

      // Then
      expect(result.taskUrl).toBe('https://github.com/test-owner/test-repo/issues/1');
      expect(result.taskId).toBe('test-owner/test-repo#1');

      expect(mockGitHubDataLayer.createIssue).toHaveBeenCalledWith({
        title: '[spec-kit] User Authentication',
        body: specContent,
        labels: ['bounty', 'spec-kit', 'aptos']
      });
    });

    it('should extract title from first line of spec.md', async () => {
      // Given
      const params = {
        taskData: { content: '# My Cool Feature\n\nDescription here' },
        metadata: testMetadata
      };

      // When
      await dataOperator.uploadTaskData(params);

      // Then
      expect(mockGitHubDataLayer.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '[spec-kit] My Cool Feature'
        })
      );
    });

    it('should use default workflow metadata if not provided', async () => {
      // Given
      const metadataWithoutWorkflow = { ...testMetadata };
      delete (metadataWithoutWorkflow as any).workflow;

      const params = {
        taskData: { content: '# Test\n\nContent' },
        metadata: metadataWithoutWorkflow
      };

      // When
      await dataOperator.uploadTaskData(params);

      // Then - GitHubDataLayer.createIssue should be called (workflow added internally)
      expect(mockGitHubDataLayer.createIssue).toHaveBeenCalled();
    });

    it('should include chain name in labels', async () => {
      // Given
      const params = {
        taskData: { content: '# Test\n\nContent' },
        metadata: { ...testMetadata, chain: { ...testMetadata.chain, name: 'ethereum' } }
      };

      // When
      await dataOperator.uploadTaskData(params);

      // Then
      expect(mockGitHubDataLayer.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: ['bounty', 'spec-kit', 'ethereum']
        })
      );
    });
  });

  describe('downloadTaskData', () => {
    it('should download Issue content and write to local file', async () => {
      // Given
      const taskUrl = 'https://github.com/test-owner/test-repo/issues/1';
      const params = { taskUrl };

      // When
      const result = await dataOperator.downloadTaskData(params);

      // Then
      expect(mockGitHubDataLayer.getIssue).toHaveBeenCalledWith({ issueUrl: taskUrl });
      expect(result.taskData.content).toBe('# Test Spec\n\nTest content');
      expect(result.localPath).toBe('/tmp/test-specs/001/spec.md');
      expect(result.metadata).toEqual(testMetadata);
    });

    it('should create local directory if not exists', async () => {
      // Given
      const params = { taskUrl: 'https://github.com/test-owner/test-repo/issues/1' };

      // When
      await dataOperator.downloadTaskData(params);

      // Then
      expect(fs.mkdir).toHaveBeenCalledWith('/tmp/test-specs/001', { recursive: true });
    });

    it('should write spec.md file to local directory', async () => {
      // Given
      const params = { taskUrl: 'https://github.com/test-owner/test-repo/issues/1' };

      // When
      await dataOperator.downloadTaskData(params);

      // Then
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/tmp/test-specs/001/spec.md',
        '# Test Spec\n\nTest content',
        'utf-8'
      );
    });

    it('should format spec ID with leading zeros', async () => {
      // Given
      mockGitHubDataLayer.getIssue.mockResolvedValue({
        issueNumber: 42,
        content: '# Test',
        metadata: testMetadata
      });

      const params = { taskUrl: 'https://github.com/test-owner/test-repo/issues/42' };

      // When
      const result = await dataOperator.downloadTaskData(params);

      // Then
      expect(result.localPath).toBe('/tmp/test-specs/042/spec.md');
    });
  });

  describe('uploadSubmission', () => {
    it('should create PR with "Closes #<issue_number>" in body', async () => {
      // Given
      const params = {
        taskUrl: 'https://github.com/test-owner/test-repo/issues/1',
        submissionData: {
          branchName: 'feat/user-authentication',
          summary: 'Implemented user authentication',
          filesChanged: ['src/auth.ts', 'tests/auth.test.ts'],
          testing: 'All tests passed'
        }
      };

      // When
      const result = await dataOperator.uploadSubmission(params);

      // Then
      expect(result.submissionUrl).toBe('https://github.com/test-owner/test-repo/pull/2');
      expect(mockGitHubDataLayer.createPR).toHaveBeenCalledWith({
        title: '[spec-kit] Submission for #1',
        body: expect.stringContaining('Closes #1'),
        head: 'feat/user-authentication',
        base: 'main'
      });
    });

    it('should include submission summary in PR body', async () => {
      // Given
      const params = {
        taskUrl: 'https://github.com/test-owner/test-repo/issues/1',
        submissionData: {
          branchName: 'test-branch',
          summary: 'My custom summary'
        }
      };

      // When
      await dataOperator.uploadSubmission(params);

      // Then
      expect(mockGitHubDataLayer.createPR).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('My custom summary')
        })
      );
    });

    it('should include files changed in PR body', async () => {
      // Given
      const params = {
        taskUrl: 'https://github.com/test-owner/test-repo/issues/1',
        submissionData: {
          branchName: 'test-branch',
          filesChanged: ['file1.ts', 'file2.ts']
        }
      };

      // When
      await dataOperator.uploadSubmission(params);

      // Then
      const callArgs = mockGitHubDataLayer.createPR.mock.calls[0][0];
      expect(callArgs.body).toContain('file1.ts');
      expect(callArgs.body).toContain('file2.ts');
    });

    it('should use default values if optional fields not provided', async () => {
      // Given
      const params = {
        taskUrl: 'https://github.com/test-owner/test-repo/issues/1',
        submissionData: {
          branchName: 'test-branch'
        }
      };

      // When
      await dataOperator.uploadSubmission(params);

      // Then
      const callArgs = mockGitHubDataLayer.createPR.mock.calls[0][0];
      expect(callArgs.body).toContain('Implementation completed as specified');
      expect(callArgs.body).toContain('See commit history');
      expect(callArgs.body).toContain('All tests passed');
    });
  });

  describe('getTaskMetadata', () => {
    it('should retrieve task metadata from GitHub Issue', async () => {
      // Given
      const params = { taskUrl: 'https://github.com/test-owner/test-repo/issues/1' };

      // When
      const result = await dataOperator.getTaskMetadata(params);

      // Then
      expect(mockGitHubDataLayer.getIssue).toHaveBeenCalledWith({
        issueUrl: 'https://github.com/test-owner/test-repo/issues/1'
      });
      expect(result).toEqual(testMetadata);
    });

    it('should return metadata with correct structure', async () => {
      // Given
      const params = { taskUrl: 'https://github.com/test-owner/test-repo/issues/1' };

      // When
      const result = await dataOperator.getTaskMetadata(params);

      // Then
      expect(result).toHaveProperty('schema', 'code3/v2');
      expect(result).toHaveProperty('chain');
      expect(result).toHaveProperty('workflow');
      expect(result).toHaveProperty('bounty');
      expect(result).toHaveProperty('dataLayer');
    });
  });

  describe('updateTaskMetadata', () => {
    it('should update task metadata via GitHubDataLayer', async () => {
      // Given
      const newMetadata: Partial<TaskMetadata> = {
        bounty: {
          asset: 'APT',
          amount: '100000000',
          confirmedAt: '2025-10-13T12:00:00Z',
          coolingUntil: '2025-10-20T12:00:00Z'
        }
      };

      const params = {
        taskUrl: 'https://github.com/test-owner/test-repo/issues/1',
        metadata: newMetadata
      };

      // When
      const result = await dataOperator.updateTaskMetadata(params);

      // Then
      expect(mockGitHubDataLayer.updateIssue).toHaveBeenCalledWith({
        issueUrl: 'https://github.com/test-owner/test-repo/issues/1',
        metadata: newMetadata
      });
      expect(result.success).toBe(true);
    });

    it('should handle partial metadata updates', async () => {
      // Given
      const partialMetadata = {
        chain: {
          name: 'aptos',
          network: 'testnet',
          bountyId: 'bounty-123',
          contractAddress: '0xtest123'
        }
      };

      const params = {
        taskUrl: 'https://github.com/test-owner/test-repo/issues/1',
        metadata: partialMetadata
      };

      // When
      await dataOperator.updateTaskMetadata(params);

      // Then
      expect(mockGitHubDataLayer.updateIssue).toHaveBeenCalledWith({
        issueUrl: 'https://github.com/test-owner/test-repo/issues/1',
        metadata: partialMetadata
      });
    });

    it('should return success result', async () => {
      // Given
      const params = {
        taskUrl: 'https://github.com/test-owner/test-repo/issues/1',
        metadata: { dataLayer: { type: 'github', url: 'https://github.com/...' } }
      };

      // When
      const result = await dataOperator.updateTaskMetadata(params);

      // Then
      expect(result).toEqual({ success: true });
    });
  });

  describe('constructor', () => {
    it('should initialize GitHubDataLayer with correct parameters', () => {
      // When
      new SpecKitDataOperator(testConfig);

      // Then
      expect(GitHubDataLayer).toHaveBeenCalledWith({
        token: 'test-token-123',
        owner: 'test-owner',
        repo: 'test-repo'
      });
    });

    it('should set local specs directory', () => {
      // Given/When
      const operator = new SpecKitDataOperator(testConfig);

      // Then - Verify by checking behavior in downloadTaskData
      expect(operator).toBeDefined();
    });

    it('should split repo parameter correctly', () => {
      // Given
      const config = {
        githubToken: 'token',
        repo: 'my-org/my-repo',
        localSpecsDir: '/tmp'
      };

      // When
      new SpecKitDataOperator(config);

      // Then
      expect(GitHubDataLayer).toHaveBeenCalledWith({
        token: 'token',
        owner: 'my-org',
        repo: 'my-repo'
      });
    });
  });
});

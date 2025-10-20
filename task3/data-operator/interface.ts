/**
 * DataOperator Interface
 *
 * Unified interface for task data operations (data layer agnostic).
 * Each workflow adapter implements this interface.
 *
 * Design Principles:
 * - Interface is data-layer agnostic (no GitHub/IPFS/Arweave specific concepts)
 * - Core methods (uploadTaskData, downloadTaskData, uploadSubmission) are implemented by adapters
 * - GitHubDataLayer is a shared component that can be used by multiple adapters
 */

import type {
  UploadTaskDataParams,
  UploadTaskDataResult,
  DownloadTaskDataParams,
  DownloadTaskDataResult,
  UploadSubmissionParams,
  UploadSubmissionResult,
  GetTaskMetadataParams,
  TaskMetadata,
  UpdateTaskMetadataParams,
  UpdateTaskMetadataResult
} from './types.js';

export interface DataOperator {
  // ========== Core Operations (implemented by adapter) ==========

  /**
   * Upload task data to data layer
   * @param params.taskData - Task data (workflow-specific format)
   * @param params.metadata - Task metadata (chain, workflow, bountyId, etc.)
   * @returns taskUrl - Task data URL (GitHub Issue URL / IPFS CID / Arweave TX ID, etc.)
   *
   * Implementation examples:
   * - spec-kit-mcp-adapter + GitHubDataLayer: Read specs/00x/spec.md, upload to GitHub Issue
   * - observer-adapter + IPFSDataOperator: Read .agent-context/plan/xxx.md, upload to IPFS
   */
  uploadTaskData(params: UploadTaskDataParams): Promise<UploadTaskDataResult>;

  /**
   * Download task data from data layer
   * @param params.taskUrl - Task data URL
   * @returns taskData (workflow-specific format), localPath
   *
   * Implementation examples:
   * - spec-kit-mcp-adapter + GitHubDataLayer: Download from GitHub Issue, write to specs/00x/spec.md
   * - observer-adapter + IPFSDataOperator: Download from IPFS, write to .agent-context/plan/todo/xxx.md
   */
  downloadTaskData(params: DownloadTaskDataParams): Promise<DownloadTaskDataResult>;

  /**
   * Upload submission content to data layer
   * @param params.taskUrl - Associated task URL
   * @param params.submissionData - Submission content (workflow-specific format)
   * @returns submissionUrl - Submission content URL
   *
   * Implementation examples:
   * - spec-kit-mcp-adapter + GitHubDataLayer: Create GitHub PR
   * - observer-adapter + IPFSDataOperator: Upload execution result to IPFS
   */
  uploadSubmission(params: UploadSubmissionParams): Promise<UploadSubmissionResult>;

  /**
   * Get task metadata
   * @param params.taskUrl - Task URL
   * @returns metadata - Task metadata (bountyId, chain, workflow, etc.)
   */
  getTaskMetadata(params: GetTaskMetadataParams): Promise<TaskMetadata>;

  /**
   * Update task metadata
   * @param params.taskUrl - Task URL
   * @param params.metadata - Updated metadata (partial)
   * @returns success
   */
  updateTaskMetadata(params: UpdateTaskMetadataParams): Promise<UpdateTaskMetadataResult>;
}

/**
 * DataOperator Type Definitions
 *
 * All types used by the DataOperator interface.
 */

// ========== Core Operation Parameters ==========

export interface UploadTaskDataParams {
  taskData: any; // Workflow-specific format
  metadata: TaskMetadata; // Task metadata
}

export interface UploadTaskDataResult {
  taskUrl: string; // Task data URL (GitHub Issue URL / IPFS CID / Arweave TX ID, etc.)
  taskId: string; // Task ID (e.g., "owner/repo#123" or IPFS CID)
}

export interface DownloadTaskDataParams {
  taskUrl: string; // Task data URL
}

export interface DownloadTaskDataResult {
  taskData: any; // Workflow-specific format
  localPath: string;
  metadata: TaskMetadata;
}

export interface UploadSubmissionParams {
  taskUrl: string; // Associated task URL
  submissionData: any; // Workflow-specific format
}

export interface UploadSubmissionResult {
  submissionUrl: string; // Submission content URL (GitHub PR URL / IPFS CID, etc.)
}

export interface GetTaskMetadataParams {
  taskUrl: string;
}

export interface UpdateTaskMetadataParams {
  taskUrl: string;
  metadata: Partial<TaskMetadata>; // Partial update
}

export interface UpdateTaskMetadataResult {
  success: boolean;
}

// ========== TaskMetadata ==========

/**
 * TaskMetadata: Task metadata (data-layer agnostic)
 */
export interface TaskMetadata {
  schema: 'code3/v2';
  taskId: string; // Task ID (e.g., "owner/repo#123" or IPFS CID)
  taskHash: string; // Task content hash (for idempotency)
  chain: {
    name: string; // aptos/ethereum/sui
    network: string; // testnet/mainnet
    bountyId: string;
    contractAddress: string;
  };
  workflow: {
    name: string; // spec-kit/observer/...
    version: string;
    adapter: string; // spec-kit-mcp-adapter/observer-adapter
  };
  bounty: {
    asset: string;
    amount: string;
    confirmedAt: number | null; // Requester confirmation timestamp
    coolingUntil: number | null; // Cooling period end timestamp
  };
  dataLayer: {
    type: string; // github/ipfs/arweave/s3
    url: string; // Data layer URL
    submissionUrl?: string; // Submission URL (PR URL, IPFS CID, etc.) - set after submission
  };
}

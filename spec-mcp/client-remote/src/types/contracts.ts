/**
 * Code3 Spec-MCP Client-Remote Types
 *
 * Based on Code3/docs/14-data-model.md
 * Schema version: code3/v1
 */

/**
 * Error codes - unified with client-local
 */
export enum ErrorCode {
  NOT_FOUND = 'E_NOT_FOUND',
  EXISTS = 'E_EXISTS',
  PRECONDITION = 'E_PRECONDITION',
  GH_RATE_LIMIT = 'E_GH_RATE_LIMIT',
  CHAIN_TX_FAILED = 'E_CHAIN_TX_FAILED',
  IDEMPOTENT_REJECTED = 'E_IDEMPOTENT_REJECTED',
  INTERNAL = 'E_INTERNAL',
}

/**
 * Issue Metadata (code3/v1 schema)
 * Based on 14-data-model.md section 1.2
 */
export interface IssueMetadata {
  schema: 'code3/v1';
  repo: string;
  issue_number: number;
  issue_hash: string;
  feature_id: string;
  task_id: string;
  bounty: {
    network: 'testnet' | 'mainnet';
    asset: 'USDT';
    amount: string;
    bounty_id: string | null;
    merged_at: string | null;
    cooling_until: string | null;
  };
  spec_refs: string[];
  labels: string[];
}

/**
 * Input for spec_mcp.specify (remote variant)
 * Identical to client-local for consistency
 */
export interface SpecifyInput {
  feature_description: string;
  feature_id?: string | null;
  allow_overwrite?: boolean;
}

/**
 * Output for spec_mcp.specify (remote variant)
 */
export interface SpecifyOutput {
  success: boolean;
  feature_id: string;
  paths: {
    spec: string;
    dir: string;
  };
  error?: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Input for spec_mcp.publish_issue_with_metadata
 * Based on 07-mcp-tools-spec.md
 */
export interface PublishIssueInput {
  repo: string;  // "owner/repo"
  feature_id: string;
  spec_path: string;
  amount: string;
  asset: 'USDT';
  network: 'testnet' | 'mainnet';
  labels?: string[];
  assignees?: string[];
}

/**
 * Output for spec_mcp.publish_issue_with_metadata
 */
export interface PublishIssueOutput {
  success: boolean;
  issue: {
    url: string;
    number: number;
    issue_hash: string;
  };
  bounty: {
    bounty_id: string;
  };
  error?: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Input for spec_mcp.remote_plan
 */
export interface RemotePlanInput {
  issue_url: string;
  feature_id: string;
}

/**
 * Output for spec_mcp.remote_plan
 */
export interface RemotePlanOutput {
  success: boolean;
  artifacts: {
    [key: string]: string;  // filename -> content
  };
  posted: boolean;  // whether artifacts were posted to Issue
  error?: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Input for spec_mcp.remote_tasks
 */
export interface RemoteTasksInput {
  issue_url: string;
  feature_id: string;
}

/**
 * Output for spec_mcp.remote_tasks
 */
export interface RemoteTasksOutput {
  success: boolean;
  artifacts: {
    'tasks.md': string;
  };
  posted: boolean;
  error?: {
    code: ErrorCode;
    message: string;
  };
}
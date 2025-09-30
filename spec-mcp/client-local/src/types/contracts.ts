/**
 * Code3 Spec-MCP Client-Local Types
 *
 * Based on Code3/docs/07-mcp-tools-spec.md
 * Schema version: code3/v1
 */

/**
 * Error codes as specified in 07-mcp-tools-spec.md
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
 * Input for spec_mcp.specify tool
 */
export interface SpecifyInput {
  feature_description: string;
  feature_id?: string | null;
  allow_overwrite?: boolean;
}

/**
 * Output for spec_mcp.specify tool
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
 * Input for spec_mcp.plan tool
 */
export interface PlanInput {
  feature_id: string;
  tech_constraints?: string | null;
  allow_overwrite?: boolean;
}

/**
 * Output for spec_mcp.plan tool
 */
export interface PlanOutput {
  success: boolean;
  paths: {
    plan: string;
    research: string;
    data_model: string;
    contracts: string;
    quickstart: string;
  };
  error?: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Input for spec_mcp.tasks tool
 */
export interface TasksInput {
  feature_id: string;
  allow_overwrite?: boolean;
}

/**
 * Output for spec_mcp.tasks tool
 */
export interface TasksOutput {
  success: boolean;
  path: string;
  error?: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Feature metadata extracted from spec-kit scripts
 */
export interface FeatureMetadata {
  feature_id: string;
  feature_num: number;
  slug: string;
  branch_name?: string;
  dir_path: string;
}
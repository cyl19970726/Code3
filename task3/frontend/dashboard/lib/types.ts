/**
 * Bounty Status Enum
 * Maps to Move contract status values (0-6)
 */
export enum BountyStatus {
  Open = 0,
  Accepted = 1,
  Submitted = 2,
  Confirmed = 3,
  Claimed = 4,
  Cancelled = 5,
}

/**
 * Bounty Interface
 * Unified data model for bounties from both Aptos and Ethereum
 */
export interface Bounty {
  // Core fields
  bountyId: string;
  taskId: string; // Format: "owner/repo#issue_number"
  taskUrl: string; // GitHub Issue URL

  // Financial
  amount: string;
  asset: string; // "APT", "USDT", "ETH", etc.

  // Status
  status: BountyStatus;
  chain: 'aptos' | 'ethereum';

  // Addresses
  sponsor: string;
  worker: string | null;

  // Metadata
  title: string;
  description?: string;

  // Timestamps (Unix timestamp in milliseconds)
  createdAt: number;
  acceptedAt?: number;
  submittedAt?: number;
  confirmedAt?: number;
  claimedAt?: number;

  // Cooling period
  coolingUntil?: number; // Unix timestamp in milliseconds

  // PR info
  prUrl?: string;
}

/**
 * GitHub Issue Metadata (code3/v1 schema)
 */
export interface IssueMetadata {
  schema: 'code3/v1';
  repo: string;
  issue_number: number;
  issue_hash: string;
  feature_id: string;
  task_id: string;
  bounty: {
    network: string;
    asset: string;
    amount: string;
    bounty_id: string;
    merged_at: number | null;
    cooling_until: number | null;
  };
  spec_refs: string[];
  labels: string[];
}

/**
 * API Response for bounties list
 */
export interface BountiesResponse {
  bounties: Bounty[];
  total: number;
}

/**
 * API Query Parameters
 */
export interface BountyQuery {
  chain?: 'all' | 'aptos' | 'ethereum';
  status?: BountyStatus;
  sponsor?: string;
  worker?: string;
  limit?: number;
  offset?: number;
}

/**
 * BountyOperator Type Definitions
 *
 * All types used by the BountyOperator interface.
 */

// ========== Core Types ==========

/**
 * Bounty: Complete bounty information
 */
export interface Bounty {
  bountyId: string;
  taskId: string;
  taskHash: string; // Task content hash (for idempotency)
  sponsor: string; // Sponsor address
  worker: string | null; // Worker address (null if not accepted)
  amount: string; // Bounty amount in smallest unit
  asset: string; // Asset symbol
  status: BountyStatus;
  createdAt: number; // Unix timestamp
  acceptedAt: number | null;
  submittedAt: number | null; // Worker submitted work
  confirmedAt: number | null; // Requester confirmed work
  claimedAt: number | null;
}

/**
 * BountyStatus: Bounty status enum
 */
export enum BountyStatus {
  Open = 'Open', // Published, waiting for worker
  Accepted = 'Accepted', // Accepted by worker, work in progress
  Submitted = 'Submitted', // Worker submitted work
  Confirmed = 'Confirmed', // Requester confirmed, ready for claim
  Claimed = 'Claimed', // Worker claimed the payout
  Cancelled = 'Cancelled' // Sponsor cancelled (only when Open)
}

// ========== Write Operation Parameters ==========

export interface CreateBountyParams {
  taskId: string;
  taskHash: string;
  amount: string;
  asset: string;
}

export interface CreateBountyResult {
  bountyId: string;
  txHash: string;
}

export interface AcceptBountyParams {
  bountyId: string;
}

export interface AcceptBountyResult {
  txHash: string;
}

export interface SubmitBountyParams {
  bountyId: string;
  submissionHash?: string; // Optional, for verification
}

export interface SubmitBountyResult {
  txHash: string;
}

export interface ConfirmBountyParams {
  bountyId: string;
  confirmedAt: number; // Unix timestamp
}

export interface ConfirmBountyResult {
  txHash: string;
  confirmedAt: number;
}

export interface ClaimPayoutParams {
  bountyId: string;
}

export interface ClaimPayoutResult {
  txHash: string;
}

export interface CancelBountyParams {
  bountyId: string;
}

export interface CancelBountyResult {
  txHash: string;
}

// ========== Read Operation Parameters ==========

export interface GetBountyParams {
  bountyId: string;
}

export interface GetBountyByTaskHashParams {
  taskHash: string;
}

export interface GetBountyByTaskHashResult {
  bountyId: string | null;
  found: boolean;
}

export interface ListBountiesParams {
  offset?: number;
  limit?: number;
}

export interface ListBountiesResult {
  bountyIds: string[];
  count: number;
}

export interface GetBountiesBySponsorParams {
  sponsor: string;
}

export interface GetBountiesBySponsorResult {
  bountyIds: string[];
  count: number;
}

export interface GetBountiesByWorkerParams {
  worker: string;
}

export interface GetBountiesByWorkerResult {
  bountyIds: string[];
  count: number;
}

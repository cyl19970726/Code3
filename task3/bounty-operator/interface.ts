/**
 * BountyOperator Interface
 *
 * Unified interface for on-chain bounty operations across different blockchains.
 * Each blockchain (Aptos, Ethereum, Sui) implements this interface.
 *
 * Status Machine: Open → Accepted → Submitted → Confirmed → Claimed
 */

import type {
  CreateBountyParams,
  CreateBountyResult,
  AcceptBountyParams,
  AcceptBountyResult,
  SubmitBountyParams,
  SubmitBountyResult,
  ConfirmBountyParams,
  ConfirmBountyResult,
  ClaimPayoutParams,
  ClaimPayoutResult,
  CancelBountyParams,
  CancelBountyResult,
  GetBountyParams,
  Bounty,
  GetBountyByTaskHashParams,
  GetBountyByTaskHashResult,
  ListBountiesParams,
  ListBountiesResult,
  GetBountiesBySponsorParams,
  GetBountiesBySponsorResult,
  GetBountiesByWorkerParams,
  GetBountiesByWorkerResult
} from './types.js';

export interface BountyOperator {
  // ========== Write Operations (6 methods) ==========

  /**
   * Create a new bounty on-chain
   * @param params.taskId - Task identifier (e.g., "owner/repo#123")
   * @param params.taskHash - Task content hash (for idempotency)
   * @param params.amount - Bounty amount in smallest unit (e.g., octas for APT)
   * @param params.asset - Asset symbol (e.g., "APT", "ETH", "USDT")
   * @returns bountyId and transaction hash
   */
  createBounty(params: CreateBountyParams): Promise<CreateBountyResult>;

  /**
   * Accept a bounty (worker accepts the task)
   * @param params.bountyId - Bounty ID
   * @returns transaction hash
   */
  acceptBounty(params: AcceptBountyParams): Promise<AcceptBountyResult>;

  /**
   * Submit work (worker submits the result)
   * @param params.bountyId - Bounty ID
   * @param params.submissionHash - Submission content hash (optional)
   * @returns transaction hash
   */
  submitBounty(params: SubmitBountyParams): Promise<SubmitBountyResult>;

  /**
   * Confirm work (requester confirms the submission)
   * @param params.bountyId - Bounty ID
   * @param params.confirmedAt - Confirmation timestamp
   * @returns transaction hash and cooling period end time
   */
  confirmBounty(params: ConfirmBountyParams): Promise<ConfirmBountyResult>;

  /**
   * Claim payout (worker claims the reward after cooling period)
   * @param params.bountyId - Bounty ID
   * @returns transaction hash
   */
  claimPayout(params: ClaimPayoutParams): Promise<ClaimPayoutResult>;

  /**
   * Cancel bounty (only sponsor, only when status is Open)
   * @param params.bountyId - Bounty ID
   * @returns transaction hash
   */
  cancelBounty(params: CancelBountyParams): Promise<CancelBountyResult>;

  // ========== Read Operations (5 methods) ==========

  /**
   * Get bounty details by ID
   * @param params.bountyId - Bounty ID
   * @returns Complete bounty information
   */
  getBounty(params: GetBountyParams): Promise<Bounty>;

  /**
   * Get bounty ID by task hash (for idempotency check)
   * @param params.taskHash - Task content hash
   * @returns bountyId (or null if not found), found flag
   */
  getBountyByTaskHash(params: GetBountyByTaskHashParams): Promise<GetBountyByTaskHashResult>;

  /**
   * List all bounty IDs (with optional pagination)
   * @param params - Optional pagination parameters
   * @returns Array of bounty IDs and total count
   */
  listBounties(params?: ListBountiesParams): Promise<ListBountiesResult>;

  /**
   * Get bounties by sponsor address
   * @param params.sponsor - Sponsor address
   * @returns Array of bounty IDs and total count
   */
  getBountiesBySponsor(params: GetBountiesBySponsorParams): Promise<GetBountiesBySponsorResult>;

  /**
   * Get bounties by worker address
   * @param params.worker - Worker address
   * @returns Array of bounty IDs and total count
   */
  getBountiesByWorker(params: GetBountiesByWorkerParams): Promise<GetBountiesByWorkerResult>;
}

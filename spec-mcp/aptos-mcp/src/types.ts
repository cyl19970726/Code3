/// Type definitions for Aptos Chain MCP

import { Network } from "@aptos-labs/ts-sdk";

export interface AptosConfig {
  network: Network;
  nodeUrl?: string;
  privateKey?: string;
  contractAddress: string;
}

export interface BountyInfo {
  id: string;
  sponsor: string;
  winner: string | null;
  repo_url: string;
  issue_hash: string;
  pr_url: string | null;
  asset: string;
  amount: string;
  status: BountyStatus;
  merged_at: number | null;
  cooling_until: number | null;
  created_at: number;
}

export enum BountyStatus {
  Open = 0,
  Started = 1,
  PRSubmitted = 2,
  Merged = 3,
  CoolingDown = 4,
  Paid = 5,
  Cancelled = 6,
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  vm_status?: string;
  gas_used?: string;
}

export interface CreateBountyInput {
  repo_url: string;
  issue_hash: string;
  asset: string;
  amount: string;
}

export interface CreateBountyOutput {
  bounty_id: string;
  tx_hash: string;
  repo_url: string;
  issue_hash: string;
  amount: string;
  status: "Open";
}

export interface AcceptBountyInput {
  bounty_id: string;
}

export interface AcceptBountyOutput {
  bounty_id: string;
  tx_hash: string;
  winner: string;
  status: "Started";
}

export interface SubmitPRInput {
  bounty_id: string;
  pr_url: string;
  pr_digest: string;
}

export interface SubmitPROutput {
  bounty_id: string;
  tx_hash: string;
  pr_url: string;
  status: "PRSubmitted";
}

export interface MarkMergedInput {
  bounty_id: string;
  pr_url: string;
}

export interface MarkMergedOutput {
  bounty_id: string;
  tx_hash: string;
  merged_at: number;
  cooling_until: number;
  status: "CoolingDown";
}

export interface ClaimPayoutInput {
  bounty_id: string;
}

export interface ClaimPayoutOutput {
  bounty_id: string;
  tx_hash: string;
  amount: string;
  winner: string;
  status: "Paid";
}

export interface CancelBountyInput {
  bounty_id: string;
}

export interface CancelBountyOutput {
  bounty_id: string;
  tx_hash: string;
  refund_amount: string;
  sponsor: string;
  status: "Cancelled";
}

// ============ Read Operations ============

export interface GetBountyInput {
  bounty_id: string;
}

export interface GetBountyOutput {
  bounty: BountyInfo | null;
}

export interface GetBountyByIssueHashInput {
  issue_hash: string;
}

export interface GetBountyByIssueHashOutput {
  bounty_id: string; // "0" if not found
  found: boolean;
}

export interface ListBountiesInput {
  // Optional filters (for future expansion)
}

export interface ListBountiesOutput {
  bounty_ids: string[];
  count: number;
}

export interface GetBountiesBySponsorInput {
  sponsor: string; // Aptos address
}

export interface GetBountiesBySponsorOutput {
  bounty_ids: string[];
  count: number;
}

export interface GetBountiesByWinnerInput {
  winner: string; // Aptos address
}

export interface GetBountiesByWinnerOutput {
  bounty_ids: string[];
  count: number;
}

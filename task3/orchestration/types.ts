/**
 * Task3Operator Flow Type Definitions
 *
 * All parameter and result types for the 5 flows.
 */

import type { BountyOperator } from '../bounty-operator/index.js';
import type { DataOperator, TaskMetadata } from '../data-operator/index.js';

// ========== Flow Parameters ==========

export interface PublishFlowParams {
  dataOperator: DataOperator;
  bountyOperator: BountyOperator;
  taskData: any; // Workflow-specific format
  metadata: Partial<TaskMetadata>; // Metadata template (will be enriched)
  amount: string;
  asset: string;
}

export interface PublishFlowResult {
  taskUrl: string;
  bountyId: string;
  txHash: string | null; // null if bounty already exists (idempotent)
  isNew: boolean; // false if bounty already exists
}

export interface AcceptFlowParams {
  dataOperator: DataOperator;
  bountyOperator: BountyOperator;
  taskUrl: string;
}

export interface AcceptFlowResult {
  taskData: any; // Workflow-specific format
  localPath: string;
  bountyId: string;
  txHash: string;
}

export interface SubmitFlowParams {
  dataOperator: DataOperator;
  bountyOperator: BountyOperator;
  taskUrl: string;
  submissionData: any; // Workflow-specific format
}

export interface SubmitFlowResult {
  submissionUrl: string;
  txHash: string;
}

export interface ConfirmFlowParams {
  dataOperator: DataOperator;
  bountyOperator: BountyOperator;
  taskUrl: string;
}

export interface ConfirmFlowResult {
  txHash: string;
  confirmedAt: number;
  coolingUntil: number;
}

export interface ClaimFlowParams {
  dataOperator: DataOperator;
  bountyOperator: BountyOperator;
  taskUrl: string;
}

export interface ClaimFlowResult {
  txHash: string;
  amount: string;
  asset: string;
}

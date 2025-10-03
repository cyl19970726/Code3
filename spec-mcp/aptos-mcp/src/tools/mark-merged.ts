/// MCP Tool: mark_merged
/// Sponsor marks a PR as merged and starts cooling period

import { AptosClient } from "../aptos/client.js";
import {
  validateBountyId,
  validateGitHubPRUrl,
  validateRequiredFields,
} from "../utils/validation.js";
import { AptosChainError, ErrorCode } from "../utils/errors.js";
import type { MarkMergedInput, MarkMergedOutput } from "../types.js";

/**
 * Mark Merged Tool
 *
 * GIVEN a bounty_id and pr_url
 * WHEN the sponsor calls mark_merged
 * THEN:
 *   1. Validate inputs
 *   2. Verify bounty is in PRSubmitted status
 *   3. Verify caller is the sponsor
 *   4. Submit transaction to mark PR as merged
 *   5. Return merged_at and cooling_until timestamps
 */
export async function markMergedTool(
  client: AptosClient,
  input: MarkMergedInput
): Promise<MarkMergedOutput> {
  // 1. Validate required fields
  validateRequiredFields(input, ["bounty_id", "pr_url"]);

  const { bounty_id, pr_url } = input;

  // 2. Validate each field
  validateBountyId(bounty_id);
  validateGitHubPRUrl(pr_url);

  // 3. Verify bounty exists and is in PRSubmitted status
  const bounty = await client.getBounty(bounty_id);
  if (!bounty) {
    throw new AptosChainError(
      ErrorCode.BOUNTY_NOT_FOUND,
      `Bounty #${bounty_id} not found`,
      { bounty_id }
    );
  }

  if (bounty.status !== 2) {
    // 2 = PRSubmitted
    throw new AptosChainError(
      ErrorCode.INVALID_STATUS,
      `Bounty #${bounty_id} is not in PRSubmitted status (current status: ${bounty.status})`,
      { bounty_id, current_status: bounty.status }
    );
  }

  // 4. Verify caller is the sponsor
  const caller = client.getAccountAddress();
  if (!caller) {
    throw new AptosChainError(
      ErrorCode.PRIVATE_KEY_MISSING,
      "Cannot determine caller address (no account initialized)"
    );
  }

  if (caller !== bounty.sponsor) {
    throw new AptosChainError(
      ErrorCode.NOT_SPONSOR,
      `Only the sponsor can mark PR as merged for bounty #${bounty_id}`,
      { bounty_id, caller, sponsor: bounty.sponsor }
    );
  }

  // 5. Verify PR URL matches
  if (pr_url !== bounty.pr_url) {
    throw new AptosChainError(
      ErrorCode.INVALID_INPUT,
      `PR URL mismatch for bounty #${bounty_id}`,
      { bounty_id, provided_pr_url: pr_url, expected_pr_url: bounty.pr_url }
    );
  }

  // 6. Submit transaction
  const txResult = await client.markMerged(bounty_id, pr_url);

  if (!txResult.success) {
    throw new AptosChainError(
      ErrorCode.TRANSACTION_FAILED,
      "Failed to mark PR as merged",
      { txResult }
    );
  }

  // 7. Calculate timestamps (contract uses 7-day cooling period)
  const now = Math.floor(Date.now() / 1000); // Current Unix timestamp
  const COOLING_PERIOD = 7 * 24 * 60 * 60; // 7 days in seconds
  const cooling_until = now + COOLING_PERIOD;

  return {
    bounty_id,
    tx_hash: txResult.hash,
    merged_at: now,
    cooling_until,
    status: "CoolingDown",
  };
}

/**
 * MCP Tool Metadata for mark_merged
 */
export const markMergedToolMetadata = {
  name: "mark_merged",
  description: "Mark a PR as merged and start the 7-day cooling period",
  inputSchema: {
    type: "object" as const,
    properties: {
      bounty_id: {
        type: "string" as const,
        description: "Bounty ID (positive integer as string)",
      },
      pr_url: {
        type: "string" as const,
        description: "GitHub pull request URL (must match the submitted PR)",
      },
    },
    required: ["bounty_id", "pr_url"],
  },
};

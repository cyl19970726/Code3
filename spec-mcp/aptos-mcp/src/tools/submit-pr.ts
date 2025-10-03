/// MCP Tool: submit_pr
/// Submit a pull request URL for a bounty

import { AptosClient } from "../aptos/client.js";
import {
  validateBountyId,
  validateGitHubPRUrl,
  validatePRDigest,
  validateRequiredFields,
} from "../utils/validation.js";
import { AptosChainError, ErrorCode } from "../utils/errors.js";
import type { SubmitPRInput, SubmitPROutput } from "../types.js";

/**
 * Submit PR Tool
 *
 * GIVEN a bounty_id, pr_url, and pr_digest
 * WHEN the winner calls submit_pr
 * THEN:
 *   1. Validate all inputs
 *   2. Verify bounty is in Started status
 *   3. Submit transaction to record PR
 *   4. Return updated bounty info
 */
export async function submitPRTool(
  client: AptosClient,
  input: SubmitPRInput
): Promise<SubmitPROutput> {
  // 1. Validate required fields
  validateRequiredFields(input, ["bounty_id", "pr_url", "pr_digest"]);

  const { bounty_id, pr_url, pr_digest } = input;

  // 2. Validate each field
  validateBountyId(bounty_id);
  validateGitHubPRUrl(pr_url);
  validatePRDigest(pr_digest);

  // 3. Verify bounty exists and is in Started status
  const bounty = await client.getBounty(bounty_id);
  if (!bounty) {
    throw new AptosChainError(
      ErrorCode.BOUNTY_NOT_FOUND,
      `Bounty #${bounty_id} not found`,
      { bounty_id }
    );
  }

  if (bounty.status !== 1) {
    // 1 = Started
    throw new AptosChainError(
      ErrorCode.INVALID_STATUS,
      `Bounty #${bounty_id} is not in Started status (current status: ${bounty.status})`,
      { bounty_id, current_status: bounty.status }
    );
  }

  // 4. Verify caller is the winner
  const caller = client.getAccountAddress();
  if (!caller) {
    throw new AptosChainError(
      ErrorCode.PRIVATE_KEY_MISSING,
      "Cannot determine caller address (no account initialized)"
    );
  }

  if (caller !== bounty.winner) {
    throw new AptosChainError(
      ErrorCode.NOT_WINNER,
      `Only the winner can submit PR for bounty #${bounty_id}`,
      { bounty_id, caller, winner: bounty.winner }
    );
  }

  // 5. Submit transaction
  const txResult = await client.submitPR(bounty_id, pr_url, pr_digest);

  if (!txResult.success) {
    throw new AptosChainError(
      ErrorCode.TRANSACTION_FAILED,
      "Failed to submit PR",
      { txResult }
    );
  }

  return {
    bounty_id,
    tx_hash: txResult.hash,
    pr_url,
    status: "PRSubmitted",
  };
}

/**
 * MCP Tool Metadata for submit_pr
 */
export const submitPRToolMetadata = {
  name: "submit_pr",
  description: "Submit a pull request URL for a bounty",
  inputSchema: {
    type: "object" as const,
    properties: {
      bounty_id: {
        type: "string" as const,
        description: "Bounty ID (positive integer as string)",
      },
      pr_url: {
        type: "string" as const,
        description: "GitHub pull request URL (e.g., https://github.com/owner/repo/pull/123)",
      },
      pr_digest: {
        type: "string" as const,
        description: "SHA-256 hash of PR metadata (64 hex characters)",
      },
    },
    required: ["bounty_id", "pr_url", "pr_digest"],
  },
};

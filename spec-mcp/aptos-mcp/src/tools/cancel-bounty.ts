/// MCP Tool: cancel_bounty
/// Sponsor cancels a bounty before PR submission

import { AptosClient } from "../aptos/client.js";
import { validateBountyId, validateRequiredFields } from "../utils/validation.js";
import { AptosChainError, ErrorCode } from "../utils/errors.js";
import type { CancelBountyInput, CancelBountyOutput } from "../types.js";

/**
 * Cancel Bounty Tool
 *
 * GIVEN a bounty_id
 * WHEN the sponsor calls cancel_bounty before PR submission
 * THEN:
 *   1. Validate bounty_id
 *   2. Verify bounty is in Open or Started status
 *   3. Verify caller is the sponsor
 *   4. Submit transaction to cancel and refund
 *   5. Return cancellation info
 */
export async function cancelBountyTool(
  client: AptosClient,
  input: CancelBountyInput
): Promise<CancelBountyOutput> {
  // 1. Validate required fields
  validateRequiredFields(input, ["bounty_id"]);

  const { bounty_id } = input;

  // 2. Validate bounty_id
  validateBountyId(bounty_id);

  // 3. Verify bounty exists
  const bounty = await client.getBounty(bounty_id);
  if (!bounty) {
    throw new AptosChainError(
      ErrorCode.BOUNTY_NOT_FOUND,
      `Bounty #${bounty_id} not found`,
      { bounty_id }
    );
  }

  // 4. Verify bounty is in cancellable status
  // Only Open (0) or Started (1) can be cancelled
  if (bounty.status !== 0 && bounty.status !== 1) {
    throw new AptosChainError(
      ErrorCode.INVALID_STATUS,
      `Bounty #${bounty_id} cannot be cancelled (current status: ${bounty.status}). ` +
      `Only Open or Started bounties can be cancelled.`,
      { bounty_id, current_status: bounty.status }
    );
  }

  // 5. Verify caller is the sponsor
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
      `Only the sponsor can cancel bounty #${bounty_id}`,
      { bounty_id, caller, sponsor: bounty.sponsor }
    );
  }

  // 6. Submit transaction
  const txResult = await client.cancelBounty(bounty_id);

  if (!txResult.success) {
    throw new AptosChainError(
      ErrorCode.TRANSACTION_FAILED,
      "Failed to cancel bounty",
      { txResult }
    );
  }

  return {
    bounty_id,
    tx_hash: txResult.hash,
    refund_amount: bounty.amount,
    sponsor: bounty.sponsor,
    status: "Cancelled",
  };
}

/**
 * MCP Tool Metadata for cancel_bounty
 */
export const cancelBountyToolMetadata = {
  name: "cancel_bounty",
  description: "Cancel a bounty and refund the sponsor (only before PR submission)",
  inputSchema: {
    type: "object" as const,
    properties: {
      bounty_id: {
        type: "string" as const,
        description: "Bounty ID (positive integer as string)",
      },
    },
    required: ["bounty_id"],
  },
};

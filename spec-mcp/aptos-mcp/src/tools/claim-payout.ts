/// MCP Tool: claim_payout
/// Winner claims payout after cooling period

import { AptosClient } from "../aptos/client.js";
import { validateBountyId, validateRequiredFields } from "../utils/validation.js";
import { AptosChainError, ErrorCode } from "../utils/errors.js";
import type { ClaimPayoutInput, ClaimPayoutOutput } from "../types.js";

/**
 * Claim Payout Tool
 *
 * GIVEN a bounty_id
 * WHEN the winner calls claim_payout after cooling period ends
 * THEN:
 *   1. Validate bounty_id
 *   2. Verify bounty is in CoolingDown status
 *   3. Verify cooling period has ended
 *   4. Verify caller is the winner
 *   5. Submit transaction to transfer funds
 *   6. Return payout info
 */
export async function claimPayoutTool(
  client: AptosClient,
  input: ClaimPayoutInput
): Promise<ClaimPayoutOutput> {
  // 1. Validate required fields
  validateRequiredFields(input, ["bounty_id"]);

  const { bounty_id } = input;

  // 2. Validate bounty_id
  validateBountyId(bounty_id);

  // 3. Verify bounty exists and is in CoolingDown status
  const bounty = await client.getBounty(bounty_id);
  if (!bounty) {
    throw new AptosChainError(
      ErrorCode.BOUNTY_NOT_FOUND,
      `Bounty #${bounty_id} not found`,
      { bounty_id }
    );
  }

  if (bounty.status !== 4) {
    // 4 = CoolingDown
    throw new AptosChainError(
      ErrorCode.INVALID_STATUS,
      `Bounty #${bounty_id} is not in CoolingDown status (current status: ${bounty.status})`,
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
      `Only the winner can claim payout for bounty #${bounty_id}`,
      { bounty_id, caller, winner: bounty.winner }
    );
  }

  // 5. Verify cooling period has ended (client-side check)
  const now = Math.floor(Date.now() / 1000);
  if (bounty.cooling_until && now < bounty.cooling_until) {
    const remainingSeconds = bounty.cooling_until - now;
    const remainingDays = Math.ceil(remainingSeconds / (24 * 60 * 60));

    throw new AptosChainError(
      ErrorCode.COOLING_PERIOD_NOT_ENDED,
      `Cooling period for bounty #${bounty_id} has not ended yet (${remainingDays} days remaining)`,
      {
        bounty_id,
        cooling_until: bounty.cooling_until,
        current_time: now,
        remaining_seconds: remainingSeconds,
      }
    );
  }

  // 6. Submit transaction
  const txResult = await client.claimPayout(bounty_id);

  if (!txResult.success) {
    throw new AptosChainError(
      ErrorCode.TRANSACTION_FAILED,
      "Failed to claim payout",
      { txResult }
    );
  }

  return {
    bounty_id,
    tx_hash: txResult.hash,
    amount: bounty.amount,
    winner: bounty.winner || caller,
    status: "Paid",
  };
}

/**
 * MCP Tool Metadata for claim_payout
 */
export const claimPayoutToolMetadata = {
  name: "claim_payout",
  description: "Claim bounty payout after the 7-day cooling period ends",
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

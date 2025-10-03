/// MCP Tool: accept_bounty
/// Developer accepts a bounty (marks it as Started)

import { AptosClient } from "../aptos/client.js";
import { validateBountyId, validateRequiredFields } from "../utils/validation.js";
import { AptosChainError, ErrorCode } from "../utils/errors.js";
import type { AcceptBountyInput, AcceptBountyOutput, BountyStatus } from "../types.js";

/**
 * Accept Bounty Tool
 *
 * GIVEN a valid bounty_id in Open status
 * WHEN a developer calls accept_bounty
 * THEN:
 *   1. Validate bounty_id
 *   2. Submit transaction to mark bounty as Started
 *   3. Return updated bounty info
 */
export async function acceptBountyTool(
  client: AptosClient,
  input: AcceptBountyInput
): Promise<AcceptBountyOutput> {
  // 1. Validate required fields
  validateRequiredFields(input, ["bounty_id"]);

  const { bounty_id } = input;

  // 2. Validate bounty_id
  validateBountyId(bounty_id);

  // 3. Verify bounty exists and is in Open status (optional pre-check)
  const bounty = await client.getBounty(bounty_id);
  if (!bounty) {
    throw new AptosChainError(
      ErrorCode.BOUNTY_NOT_FOUND,
      `Bounty #${bounty_id} not found`,
      { bounty_id }
    );
  }

  if (bounty.status !== 0) {
    // 0 = Open
    throw new AptosChainError(
      ErrorCode.INVALID_STATUS,
      `Bounty #${bounty_id} is not in Open status (current status: ${bounty.status})`,
      { bounty_id, current_status: bounty.status }
    );
  }

  // 4. Submit transaction
  const txResult = await client.acceptBounty(bounty_id);

  if (!txResult.success) {
    throw new AptosChainError(
      ErrorCode.TRANSACTION_FAILED,
      "Failed to accept bounty",
      { txResult }
    );
  }

  // 5. Get winner address
  const winner = client.getAccountAddress();
  if (!winner) {
    throw new AptosChainError(
      ErrorCode.PRIVATE_KEY_MISSING,
      "Cannot determine winner address (no account initialized)"
    );
  }

  return {
    bounty_id,
    tx_hash: txResult.hash,
    winner,
    status: "Started",
  };
}

/**
 * MCP Tool Metadata for accept_bounty
 */
export const acceptBountyToolMetadata = {
  name: "accept_bounty",
  description: "Accept a bounty and mark it as Started",
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

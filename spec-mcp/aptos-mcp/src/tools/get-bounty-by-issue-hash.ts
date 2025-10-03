/// MCP Tool: get_bounty_by_issue_hash
/// Get bounty ID by issue hash for idempotency checking (read-only)

import { AptosClient } from "../aptos/client.js";
import { validateRequiredFields, validateIssueHash } from "../utils/validation.js";
import type { GetBountyByIssueHashInput, GetBountyByIssueHashOutput } from "../types.js";

/**
 * Get Bounty By Issue Hash Tool
 *
 * GIVEN an issue hash
 * WHEN the user calls get_bounty_by_issue_hash
 * THEN:
   1. Validate issue_hash input
 *   2. Call view function get_bounty_by_issue_hash
 *   3. Return bounty_id (0 if not found) and found boolean
 */
export async function getBountyByIssueHashTool(
  client: AptosClient,
  input: GetBountyByIssueHashInput
): Promise<GetBountyByIssueHashOutput> {
  // 1. Validate required fields
  validateRequiredFields(input, ["issue_hash"]);

  const { issue_hash } = input;

  // 2. Validate issue hash format
  validateIssueHash(issue_hash);

  // 3. Call view function
  const bountyId = await client.getBountyByIssueHash(issue_hash);

  // 4. Return result
  return {
    bounty_id: bountyId,
    found: bountyId !== "0",
  };
}

/**
 * MCP Tool Metadata for get_bounty_by_issue_hash
 */
export const getBountyByIssueHashToolMetadata = {
  name: "get_bounty_by_issue_hash",
  description:
    "Get bounty ID by issue hash for idempotency checking (read-only view function). Returns bounty_id=0 if not found.",
  inputSchema: {
    type: "object" as const,
    properties: {
      issue_hash: {
        type: "string" as const,
        description: "SHA-256 hash of issue metadata (64 hex characters)",
      },
    },
    required: ["issue_hash"],
  },
};

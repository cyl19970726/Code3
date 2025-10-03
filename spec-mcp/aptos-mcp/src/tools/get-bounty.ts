/// MCP Tool: get_bounty
/// Get bounty information by ID (read-only)

import { AptosClient } from "../aptos/client.js";
import { validateRequiredFields } from "../utils/validation.js";
import type { GetBountyInput, GetBountyOutput } from "../types.js";

/**
 * Get Bounty Tool
 *
 * GIVEN a bounty ID
 * WHEN the user calls get_bounty
 * THEN:
 *   1. Validate bounty_id input
 *   2. Call view function get_bounty
 *   3. Return bounty details or null if not found
 */
export async function getBountyTool(
  client: AptosClient,
  input: GetBountyInput
): Promise<GetBountyOutput> {
  // 1. Validate required fields
  validateRequiredFields(input, ["bounty_id"]);

  const { bounty_id } = input;

  // 2. Call view function
  const bounty = await client.getBounty(bounty_id);

  // 3. Return result
  return { bounty };
}

/**
 * MCP Tool Metadata for get_bounty
 */
export const getBountyToolMetadata = {
  name: "get_bounty",
  description: "Get bounty information by ID (read-only view function)",
  inputSchema: {
    type: "object" as const,
    properties: {
      bounty_id: {
        type: "string" as const,
        description: "Bounty ID to query",
      },
    },
    required: ["bounty_id"],
  },
};

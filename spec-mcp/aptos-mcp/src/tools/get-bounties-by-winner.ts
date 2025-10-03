/// MCP Tool: get_bounties_by_winner
/// Get bounties won by a specific worker (read-only)

import { AptosClient } from "../aptos/client.js";
import { validateRequiredFields, validateAptosAddress } from "../utils/validation.js";
import type { GetBountiesByWinnerInput, GetBountiesByWinnerOutput } from "../types.js";

/**
 * Get Bounties By Winner Tool
 *
 * GIVEN a winner address
 * WHEN the user calls get_bounties_by_winner
 * THEN:
 *   1. Validate winner address
 *   2. Call view function get_bounties_by_winner
 *   3. Return array of bounty IDs and count
 */
export async function getBountiesByWinnerTool(
  client: AptosClient,
  input: GetBountiesByWinnerInput
): Promise<GetBountiesByWinnerOutput> {
  // 1. Validate required fields
  validateRequiredFields(input, ["winner"]);

  const { winner } = input;

  // 2. Validate winner address
  validateAptosAddress(winner, "winner");

  // 3. Call view function
  const bounty_ids = await client.getBountiesByWinner(winner);

  // 4. Return result
  return {
    bounty_ids,
    count: bounty_ids.length,
  };
}

/**
 * MCP Tool Metadata for get_bounties_by_winner
 */
export const getBountiesByWinnerToolMetadata = {
  name: "get_bounties_by_winner",
  description:
    "Get bounties won by a specific worker (read-only view function). Returns bounty IDs only.",
  inputSchema: {
    type: "object" as const,
    properties: {
      winner: {
        type: "string" as const,
        description: "Aptos address of the winner/worker (with or without 0x prefix)",
      },
    },
    required: ["winner"],
  },
};

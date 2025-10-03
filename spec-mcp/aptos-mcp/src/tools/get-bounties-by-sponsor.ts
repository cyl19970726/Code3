/// MCP Tool: get_bounties_by_sponsor
/// Get bounties created by a specific sponsor (read-only)

import { AptosClient } from "../aptos/client.js";
import { validateRequiredFields, validateAptosAddress } from "../utils/validation.js";
import type { GetBountiesBySponsorInput, GetBountiesBySponsorOutput } from "../types.js";

/**
 * Get Bounties By Sponsor Tool
 *
 * GIVEN a sponsor address
 * WHEN the user calls get_bounties_by_sponsor
 * THEN:
 *   1. Validate sponsor address
 *   2. Call view function get_bounties_by_sponsor
 *   3. Return array of bounty IDs and count
 */
export async function getBountiesBySponsorTool(
  client: AptosClient,
  input: GetBountiesBySponsorInput
): Promise<GetBountiesBySponsorOutput> {
  // 1. Validate required fields
  validateRequiredFields(input, ["sponsor"]);

  const { sponsor } = input;

  // 2. Validate sponsor address
  validateAptosAddress(sponsor, "sponsor");

  // 3. Call view function
  const bounty_ids = await client.getBountiesBySponsor(sponsor);

  // 4. Return result
  return {
    bounty_ids,
    count: bounty_ids.length,
  };
}

/**
 * MCP Tool Metadata for get_bounties_by_sponsor
 */
export const getBountiesBySponsorToolMetadata = {
  name: "get_bounties_by_sponsor",
  description:
    "Get bounties created by a specific sponsor (read-only view function). Returns bounty IDs only.",
  inputSchema: {
    type: "object" as const,
    properties: {
      sponsor: {
        type: "string" as const,
        description: "Aptos address of the sponsor (with or without 0x prefix)",
      },
    },
    required: ["sponsor"],
  },
};

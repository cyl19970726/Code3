/// MCP Tool: list_bounties
/// List all bounties (returns bounty IDs) - read-only

import { AptosClient } from "../aptos/client.js";
import type { ListBountiesInput, ListBountiesOutput } from "../types.js";

/**
 * List Bounties Tool
 *
 * GIVEN no input (or optional filters in future)
 * WHEN the user calls list_bounties
 * THEN:
 *   1. Call view function list_bounties
 *   2. Return array of bounty IDs and count
 *
 * Note: This returns IDs only. Call get_bounty(id) for each ID to get full details.
 */
export async function listBountiesTool(
  client: AptosClient,
  input: ListBountiesInput
): Promise<ListBountiesOutput> {
  // 1. Call view function
  const bounty_ids = await client.listBounties();

  // 2. Return result
  return {
    bounty_ids,
    count: bounty_ids.length,
  };
}

/**
 * MCP Tool Metadata for list_bounties
 */
export const listBountiesToolMetadata = {
  name: "list_bounties",
  description:
    "List all bounties (read-only view function). Returns bounty IDs only. Use get_bounty to fetch details for each ID.",
  inputSchema: {
    type: "object" as const,
    properties: {
      // No required inputs (filters can be added in future)
    },
    required: [],
  },
};

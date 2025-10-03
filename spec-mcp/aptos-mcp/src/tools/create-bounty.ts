/// MCP Tool: create_bounty
/// Creates a new bounty on the Aptos blockchain

import { AptosClient } from "../aptos/client.js";
import {
  validateGitHubRepoUrl,
  validateIssueHash,
  validateAptosAddress,
  validateAmount,
  validateRequiredFields,
} from "../utils/validation.js";
import { AptosChainError, ErrorCode } from "../utils/errors.js";
import type { CreateBountyInput, CreateBountyOutput } from "../types.js";

/**
 * Create Bounty Tool
 *
 * GIVEN a GitHub repository URL, issue hash, asset address, and amount
 * WHEN the sponsor calls create_bounty
 * THEN:
 *   1. Validate all inputs
 *   2. Submit transaction to Aptos contract
 *   3. Return bounty ID and transaction hash
 */
export async function createBountyTool(
  client: AptosClient,
  input: CreateBountyInput
): Promise<CreateBountyOutput> {
  // 1. Validate required fields
  validateRequiredFields(input, ["repo_url", "issue_hash", "asset", "amount"]);

  const { repo_url, issue_hash, asset, amount } = input;

  // 2. Validate each field
  validateGitHubRepoUrl(repo_url);
  validateIssueHash(issue_hash);
  validateAptosAddress(asset, "asset");
  validateAmount(amount, "amount");

  // 3. Submit transaction
  const txResult = await client.createBounty(repo_url, issue_hash, asset, amount);

  if (!txResult.success) {
    throw new AptosChainError(
      ErrorCode.TRANSACTION_FAILED,
      "Failed to create bounty",
      { txResult }
    );
  }

  // 4. Extract bounty ID from events
  // Note: In production, we should parse transaction events to get the actual bounty_id
  // For MVP, we'll use a placeholder approach - the client can call get_bounty to find it
  // or we can parse events here (requires additional SDK calls)

  // Temporary: Return transaction hash, frontend will need to query for bounty_id
  // In a real implementation, parse BountyCreated event from txResult

  return {
    bounty_id: "pending", // Will be replaced by event parsing
    tx_hash: txResult.hash,
    repo_url,
    issue_hash,
    amount,
    status: "Open",
  };
}

/**
 * MCP Tool Metadata for create_bounty
 */
export const createBountyToolMetadata = {
  name: "create_bounty",
  description: "Create a new bounty for a GitHub issue",
  inputSchema: {
    type: "object" as const,
    properties: {
      repo_url: {
        type: "string" as const,
        description: "GitHub repository URL (e.g., https://github.com/owner/repo)",
      },
      issue_hash: {
        type: "string" as const,
        description: "SHA-256 hash of issue metadata (64 hex characters)",
      },
      asset: {
        type: "string" as const,
        description: "Aptos address of the fungible asset (e.g., USDT metadata object address)",
      },
      amount: {
        type: "string" as const,
        description: "Bounty amount in base units (e.g., '1000000' for 1 USDT with 6 decimals)",
      },
    },
    required: ["repo_url", "issue_hash", "asset", "amount"],
  },
};

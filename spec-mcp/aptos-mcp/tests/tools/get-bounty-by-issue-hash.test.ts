import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBountyByIssueHashTool } from "../../src/tools/get-bounty-by-issue-hash.js";
import { AptosClient } from "../../src/aptos/client.js";
import { AptosChainError, ErrorCode } from "../../src/utils/errors.js";

// Mock AptosClient
vi.mock("../../src/aptos/client.js", () => {
  return {
    AptosClient: vi.fn(),
  };
});

describe("get-bounty-by-issue-hash tool", () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getBountyByIssueHash: vi.fn(),
    };
  });

  it("should get bounty_id successfully with valid issue_hash", async () => {
    mockClient.getBountyByIssueHash.mockResolvedValue("1");

    const result = await getBountyByIssueHashTool(mockClient, {
      issue_hash: "a".repeat(64),
    });

    expect(result.bounty_id).toBe("1");
    expect(result.found).toBe(true);
    expect(mockClient.getBountyByIssueHash).toHaveBeenCalledWith(
      "a".repeat(64)
    );
  });

  it("should return bounty_id=0 and found=false if not found", async () => {
    mockClient.getBountyByIssueHash.mockResolvedValue("0");

    const result = await getBountyByIssueHashTool(mockClient, {
      issue_hash: "b".repeat(64),
    });

    expect(result.bounty_id).toBe("0");
    expect(result.found).toBe(false);
  });

  it("should throw error if issue_hash is missing", async () => {
    await expect(
      getBountyByIssueHashTool(mockClient, {} as any)
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error for invalid issue_hash format", async () => {
    await expect(
      getBountyByIssueHashTool(mockClient, {
        issue_hash: "abc", // Too short
      })
    ).rejects.toThrow(AptosChainError);
  });
});

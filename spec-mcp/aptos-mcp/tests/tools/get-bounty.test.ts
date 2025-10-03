import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBountyTool } from "../../src/tools/get-bounty.js";
import { AptosClient } from "../../src/aptos/client.js";
import { AptosChainError, ErrorCode } from "../../src/utils/errors.js";

// Mock AptosClient
vi.mock("../../src/aptos/client.js", () => {
  return {
    AptosClient: vi.fn(),
  };
});

describe("get-bounty tool", () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getBounty: vi.fn(),
    };
  });

  it("should get bounty successfully with valid bounty_id", async () => {
    const mockBounty = {
      id: "1",
      sponsor: "0xsponsor",
      winner: null,
      repo_url: "https://github.com/code3/core",
      issue_hash: "a".repeat(64),
      pr_url: null,
      asset: "0x1",
      amount: "1000000",
      status: 0,
      merged_at: null,
      cooling_until: null,
      created_at: 1234567890,
    };

    mockClient.getBounty.mockResolvedValue(mockBounty);

    const result = await getBountyTool(mockClient, {
      bounty_id: "1",
    });

    expect(result.bounty).toEqual(mockBounty);
    expect(mockClient.getBounty).toHaveBeenCalledWith("1");
  });

  it("should return null if bounty not found", async () => {
    mockClient.getBounty.mockResolvedValue(null);

    const result = await getBountyTool(mockClient, {
      bounty_id: "999",
    });

    expect(result.bounty).toBeNull();
  });

  it("should throw error if bounty_id is missing", async () => {
    await expect(
      getBountyTool(mockClient, {} as any)
    ).rejects.toThrow(AptosChainError);
  });
});

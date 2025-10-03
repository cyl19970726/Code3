import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBountiesBySponsorTool } from "../../src/tools/get-bounties-by-sponsor.js";
import { AptosClient } from "../../src/aptos/client.js";
import { AptosChainError, ErrorCode } from "../../src/utils/errors.js";

// Mock AptosClient
vi.mock("../../src/aptos/client.js", () => {
  return {
    AptosClient: vi.fn(),
  };
});

describe("get-bounties-by-sponsor tool", () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getBountiesBySponsor: vi.fn(),
    };
  });

  it("should get bounties by sponsor successfully", async () => {
    const validAddress = "0x" + "a".repeat(64);
    mockClient.getBountiesBySponsor.mockResolvedValue(["1", "2"]);

    const result = await getBountiesBySponsorTool(mockClient, {
      sponsor: validAddress,
    });

    expect(result.bounty_ids).toEqual(["1", "2"]);
    expect(result.count).toBe(2);
    expect(mockClient.getBountiesBySponsor).toHaveBeenCalledWith(validAddress);
  });

  it("should return empty array if sponsor has no bounties", async () => {
    const validAddress = "0x" + "b".repeat(64);
    mockClient.getBountiesBySponsor.mockResolvedValue([]);

    const result = await getBountiesBySponsorTool(mockClient, {
      sponsor: validAddress,
    });

    expect(result.bounty_ids).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("should throw error if sponsor is missing", async () => {
    await expect(
      getBountiesBySponsorTool(mockClient, {} as any)
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error for invalid sponsor address", async () => {
    await expect(
      getBountiesBySponsorTool(mockClient, {
        sponsor: "invalid", // Invalid address
      })
    ).rejects.toThrow(AptosChainError);
  });
});

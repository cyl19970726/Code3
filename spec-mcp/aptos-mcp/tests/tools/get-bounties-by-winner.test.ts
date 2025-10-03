import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBountiesByWinnerTool } from "../../src/tools/get-bounties-by-winner.js";
import { AptosClient } from "../../src/aptos/client.js";
import { AptosChainError, ErrorCode } from "../../src/utils/errors.js";

// Mock AptosClient
vi.mock("../../src/aptos/client.js", () => {
  return {
    AptosClient: vi.fn(),
  };
});

describe("get-bounties-by-winner tool", () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getBountiesByWinner: vi.fn(),
    };
  });

  it("should get bounties by winner successfully", async () => {
    const validAddress = "0x" + "a".repeat(64);
    mockClient.getBountiesByWinner.mockResolvedValue(["3", "4", "5"]);

    const result = await getBountiesByWinnerTool(mockClient, {
      winner: validAddress,
    });

    expect(result.bounty_ids).toEqual(["3", "4", "5"]);
    expect(result.count).toBe(3);
    expect(mockClient.getBountiesByWinner).toHaveBeenCalledWith(validAddress);
  });

  it("should return empty array if winner has no bounties", async () => {
    const validAddress = "0x" + "b".repeat(64);
    mockClient.getBountiesByWinner.mockResolvedValue([]);

    const result = await getBountiesByWinnerTool(mockClient, {
      winner: validAddress,
    });

    expect(result.bounty_ids).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("should throw error if winner is missing", async () => {
    await expect(
      getBountiesByWinnerTool(mockClient, {} as any)
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error for invalid winner address", async () => {
    await expect(
      getBountiesByWinnerTool(mockClient, {
        winner: "invalid", // Invalid address
      })
    ).rejects.toThrow(AptosChainError);
  });
});

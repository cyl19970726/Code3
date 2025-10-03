import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBountyTool } from "../../src/tools/create-bounty.js";
import { AptosClient } from "../../src/aptos/client.js";
import { AptosChainError, ErrorCode } from "../../src/utils/errors.js";

// Mock AptosClient
vi.mock("../../src/aptos/client.js", () => {
  return {
    AptosClient: vi.fn(),
  };
});

describe("create-bounty tool", () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      createBounty: vi.fn(),
      getAccountAddress: vi.fn().mockReturnValue("0xsponsor"),
    };
  });

  it("should create bounty successfully with valid inputs", async () => {
    mockClient.createBounty.mockResolvedValue({
      hash: "0x123abc",
      success: true,
    });

    const result = await createBountyTool(mockClient, {
      repo_url: "https://github.com/code3/core",
      issue_hash: "a".repeat(64),
      asset: "0x1",
      amount: "1000000",
    });

    expect(result.tx_hash).toBe("0x123abc");
    expect(result.repo_url).toBe("https://github.com/code3/core");
    expect(result.status).toBe("Open");
    expect(mockClient.createBounty).toHaveBeenCalledWith(
      "https://github.com/code3/core",
      "a".repeat(64),
      "0x1",
      "1000000"
    );
  });

  it("should throw error if required fields are missing", async () => {
    await expect(
      createBountyTool(mockClient, {
        repo_url: "https://github.com/code3/core",
        // Missing issue_hash, asset, amount
      } as any)
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error for invalid repo URL", async () => {
    await expect(
      createBountyTool(mockClient, {
        repo_url: "https://gitlab.com/owner/repo", // Not GitHub
        issue_hash: "a".repeat(64),
        asset: "0x1",
        amount: "1000000",
      })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error for invalid issue hash", async () => {
    await expect(
      createBountyTool(mockClient, {
        repo_url: "https://github.com/code3/core",
        issue_hash: "abc", // Too short
        asset: "0x1",
        amount: "1000000",
      })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error for invalid asset address", async () => {
    await expect(
      createBountyTool(mockClient, {
        repo_url: "https://github.com/code3/core",
        issue_hash: "a".repeat(64),
        asset: "invalid", // Not hex
        amount: "1000000",
      })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error for invalid amount", async () => {
    await expect(
      createBountyTool(mockClient, {
        repo_url: "https://github.com/code3/core",
        issue_hash: "a".repeat(64),
        asset: "0x1",
        amount: "0", // Zero
      })
    ).rejects.toThrow(AptosChainError);

    await expect(
      createBountyTool(mockClient, {
        repo_url: "https://github.com/code3/core",
        issue_hash: "a".repeat(64),
        asset: "0x1",
        amount: "-100", // Negative
      })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error if transaction fails", async () => {
    mockClient.createBounty.mockResolvedValue({
      hash: "0x123",
      success: false,
    });

    await expect(
      createBountyTool(mockClient, {
        repo_url: "https://github.com/code3/core",
        issue_hash: "a".repeat(64),
        asset: "0x1",
        amount: "1000000",
      })
    ).rejects.toThrow(AptosChainError);
  });
});

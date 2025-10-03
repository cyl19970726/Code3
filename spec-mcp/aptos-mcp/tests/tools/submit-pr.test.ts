import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitPRTool } from "../../src/tools/submit-pr.js";
import { AptosChainError, ErrorCode } from "../../src/utils/errors.js";
import { BountyStatus } from "../../src/types.js";

describe("submit-pr tool", () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getBounty: vi.fn(),
      submitPR: vi.fn(),
      getAccountAddress: vi.fn().mockReturnValue("0xwinner"),
    };
  });

  it("should submit PR successfully", async () => {
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.Started,
      winner: "0xwinner",
    });
    mockClient.submitPR.mockResolvedValue({
      hash: "0xdef",
      success: true,
    });

    const result = await submitPRTool(mockClient, {
      bounty_id: "1",
      pr_url: "https://github.com/owner/repo/pull/1",
      pr_digest: "b".repeat(64),
    });

    expect(result.bounty_id).toBe("1");
    expect(result.tx_hash).toBe("0xdef");
    expect(result.pr_url).toBe("https://github.com/owner/repo/pull/1");
    expect(result.status).toBe("PRSubmitted");
  });

  it("should throw error if bounty not found", async () => {
    mockClient.getBounty.mockResolvedValue(null);

    await expect(
      submitPRTool(mockClient, {
        bounty_id: "999",
        pr_url: "https://github.com/owner/repo/pull/1",
        pr_digest: "b".repeat(64),
      })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error if bounty not in Started status", async () => {
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.Open, // Not started yet
      winner: "0xwinner",
    });

    await expect(
      submitPRTool(mockClient, {
        bounty_id: "1",
        pr_url: "https://github.com/owner/repo/pull/1",
        pr_digest: "b".repeat(64),
      })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error if caller is not the winner", async () => {
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.Started,
      winner: "0xother", // Different winner
    });

    await expect(
      submitPRTool(mockClient, {
        bounty_id: "1",
        pr_url: "https://github.com/owner/repo/pull/1",
        pr_digest: "b".repeat(64),
      })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error for invalid PR URL", async () => {
    await expect(
      submitPRTool(mockClient, {
        bounty_id: "1",
        pr_url: "https://github.com/owner/repo", // Not a PR URL
        pr_digest: "b".repeat(64),
      })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error for invalid PR digest", async () => {
    await expect(
      submitPRTool(mockClient, {
        bounty_id: "1",
        pr_url: "https://github.com/owner/repo/pull/1",
        pr_digest: "abc", // Too short
      })
    ).rejects.toThrow(AptosChainError);
  });
});

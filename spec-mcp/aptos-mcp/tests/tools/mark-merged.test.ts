import { describe, it, expect, vi, beforeEach } from "vitest";
import { markMergedTool } from "../../src/tools/mark-merged.js";
import { AptosChainError } from "../../src/utils/errors.js";
import { BountyStatus } from "../../src/types.js";

describe("mark-merged tool", () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getBounty: vi.fn(),
      markMerged: vi.fn(),
      getAccountAddress: vi.fn().mockReturnValue("0xsponsor"),
    };
  });

  it("should mark PR as merged successfully", async () => {
    const prUrl = "https://github.com/owner/repo/pull/1";
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.PRSubmitted,
      sponsor: "0xsponsor",
      pr_url: prUrl,
    });
    mockClient.markMerged.mockResolvedValue({
      hash: "0xghi",
      success: true,
    });

    const result = await markMergedTool(mockClient, {
      bounty_id: "1",
      pr_url: prUrl,
    });

    expect(result.bounty_id).toBe("1");
    expect(result.tx_hash).toBe("0xghi");
    expect(result.status).toBe("CoolingDown");
    expect(result.merged_at).toBeGreaterThan(0);
    expect(result.cooling_until).toBeGreaterThan(result.merged_at);
  });

  it("should throw error if bounty not found", async () => {
    mockClient.getBounty.mockResolvedValue(null);

    await expect(
      markMergedTool(mockClient, {
        bounty_id: "999",
        pr_url: "https://github.com/owner/repo/pull/1",
      })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error if bounty not in PRSubmitted status", async () => {
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.Started, // Not submitted yet
      sponsor: "0xsponsor",
    });

    await expect(
      markMergedTool(mockClient, {
        bounty_id: "1",
        pr_url: "https://github.com/owner/repo/pull/1",
      })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error if caller is not the sponsor", async () => {
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.PRSubmitted,
      sponsor: "0xother", // Different sponsor
      pr_url: "https://github.com/owner/repo/pull/1",
    });

    await expect(
      markMergedTool(mockClient, {
        bounty_id: "1",
        pr_url: "https://github.com/owner/repo/pull/1",
      })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error if PR URL mismatch", async () => {
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.PRSubmitted,
      sponsor: "0xsponsor",
      pr_url: "https://github.com/owner/repo/pull/1",
    });

    await expect(
      markMergedTool(mockClient, {
        bounty_id: "1",
        pr_url: "https://github.com/owner/repo/pull/2", // Mismatch
      })
    ).rejects.toThrow(AptosChainError);
  });

  it("should calculate 7-day cooling period", async () => {
    const prUrl = "https://github.com/owner/repo/pull/1";
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.PRSubmitted,
      sponsor: "0xsponsor",
      pr_url: prUrl,
    });
    mockClient.markMerged.mockResolvedValue({
      hash: "0xghi",
      success: true,
    });

    const beforeTime = Math.floor(Date.now() / 1000);
    const result = await markMergedTool(mockClient, {
      bounty_id: "1",
      pr_url: prUrl,
    });
    const afterTime = Math.floor(Date.now() / 1000);

    // Cooling period should be 7 days (604800 seconds)
    const SEVEN_DAYS = 7 * 24 * 60 * 60;
    expect(result.cooling_until - result.merged_at).toBe(SEVEN_DAYS);
    expect(result.merged_at).toBeGreaterThanOrEqual(beforeTime);
    expect(result.merged_at).toBeLessThanOrEqual(afterTime);
  });
});

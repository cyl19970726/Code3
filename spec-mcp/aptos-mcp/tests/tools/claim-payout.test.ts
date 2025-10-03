import { describe, it, expect, vi, beforeEach } from "vitest";
import { claimPayoutTool } from "../../src/tools/claim-payout.js";
import { AptosChainError, ErrorCode } from "../../src/utils/errors.js";
import { BountyStatus } from "../../src/types.js";

describe("claim-payout tool", () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getBounty: vi.fn(),
      claimPayout: vi.fn(),
      getAccountAddress: vi.fn().mockReturnValue("0xwinner"),
    };
  });

  it("should claim payout successfully after cooling period", async () => {
    const now = Math.floor(Date.now() / 1000);
    const pastCoolingTime = now - 1000; // Cooling period ended

    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.CoolingDown,
      winner: "0xwinner",
      amount: "1000000",
      cooling_until: pastCoolingTime,
    });
    mockClient.claimPayout.mockResolvedValue({
      hash: "0xjkl",
      success: true,
    });

    const result = await claimPayoutTool(mockClient, {
      bounty_id: "1",
    });

    expect(result.bounty_id).toBe("1");
    expect(result.tx_hash).toBe("0xjkl");
    expect(result.amount).toBe("1000000");
    expect(result.winner).toBe("0xwinner");
    expect(result.status).toBe("Paid");
  });

  it("should throw error if bounty not found", async () => {
    mockClient.getBounty.mockResolvedValue(null);

    await expect(
      claimPayoutTool(mockClient, { bounty_id: "999" })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error if bounty not in CoolingDown status", async () => {
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.PRSubmitted, // Not in cooling period
      winner: "0xwinner",
    });

    await expect(
      claimPayoutTool(mockClient, { bounty_id: "1" })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error if caller is not the winner", async () => {
    const now = Math.floor(Date.now() / 1000);
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.CoolingDown,
      winner: "0xother", // Different winner
      cooling_until: now - 1000,
    });

    await expect(
      claimPayoutTool(mockClient, { bounty_id: "1" })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error if cooling period not ended", async () => {
    const now = Math.floor(Date.now() / 1000);
    const futureCoolingTime = now + 86400; // 1 day remaining

    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.CoolingDown,
      winner: "0xwinner",
      cooling_until: futureCoolingTime,
    });

    await expect(
      claimPayoutTool(mockClient, { bounty_id: "1" })
    ).rejects.toThrow(AptosChainError);

    // Verify error is COOLING_PERIOD_NOT_ENDED
    try {
      await claimPayoutTool(mockClient, { bounty_id: "1" });
    } catch (error) {
      expect(error).toBeInstanceOf(AptosChainError);
      expect((error as AptosChainError).code).toBe(ErrorCode.COOLING_PERIOD_NOT_ENDED);
    }
  });

  it("should throw error if transaction fails", async () => {
    const now = Math.floor(Date.now() / 1000);
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.CoolingDown,
      winner: "0xwinner",
      amount: "1000000",
      cooling_until: now - 1000,
    });
    mockClient.claimPayout.mockResolvedValue({
      hash: "0xjkl",
      success: false,
    });

    await expect(
      claimPayoutTool(mockClient, { bounty_id: "1" })
    ).rejects.toThrow(AptosChainError);
  });
});

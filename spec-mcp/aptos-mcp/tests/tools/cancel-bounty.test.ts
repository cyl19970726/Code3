import { describe, it, expect, vi, beforeEach } from "vitest";
import { cancelBountyTool } from "../../src/tools/cancel-bounty.js";
import { AptosChainError } from "../../src/utils/errors.js";
import { BountyStatus } from "../../src/types.js";

describe("cancel-bounty tool", () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getBounty: vi.fn(),
      cancelBounty: vi.fn(),
      getAccountAddress: vi.fn().mockReturnValue("0xsponsor"),
    };
  });

  it("should cancel Open bounty successfully", async () => {
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.Open,
      sponsor: "0xsponsor",
      amount: "1000000",
    });
    mockClient.cancelBounty.mockResolvedValue({
      hash: "0xmno",
      success: true,
    });

    const result = await cancelBountyTool(mockClient, {
      bounty_id: "1",
    });

    expect(result.bounty_id).toBe("1");
    expect(result.tx_hash).toBe("0xmno");
    expect(result.refund_amount).toBe("1000000");
    expect(result.sponsor).toBe("0xsponsor");
    expect(result.status).toBe("Cancelled");
  });

  it("should cancel Started bounty successfully", async () => {
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.Started,
      sponsor: "0xsponsor",
      amount: "500000",
    });
    mockClient.cancelBounty.mockResolvedValue({
      hash: "0xpqr",
      success: true,
    });

    const result = await cancelBountyTool(mockClient, {
      bounty_id: "1",
    });

    expect(result.status).toBe("Cancelled");
  });

  it("should throw error if bounty not found", async () => {
    mockClient.getBounty.mockResolvedValue(null);

    await expect(
      cancelBountyTool(mockClient, { bounty_id: "999" })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error if bounty not in cancellable status", async () => {
    // PRSubmitted cannot be cancelled
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.PRSubmitted,
      sponsor: "0xsponsor",
    });

    await expect(
      cancelBountyTool(mockClient, { bounty_id: "1" })
    ).rejects.toThrow(AptosChainError);

    // CoolingDown cannot be cancelled
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.CoolingDown,
      sponsor: "0xsponsor",
    });

    await expect(
      cancelBountyTool(mockClient, { bounty_id: "1" })
    ).rejects.toThrow(AptosChainError);

    // Paid cannot be cancelled
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.Paid,
      sponsor: "0xsponsor",
    });

    await expect(
      cancelBountyTool(mockClient, { bounty_id: "1" })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error if caller is not the sponsor", async () => {
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.Open,
      sponsor: "0xother", // Different sponsor
      amount: "1000000",
    });

    await expect(
      cancelBountyTool(mockClient, { bounty_id: "1" })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error for invalid bounty_id", async () => {
    await expect(
      cancelBountyTool(mockClient, { bounty_id: "0" })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error if transaction fails", async () => {
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.Open,
      sponsor: "0xsponsor",
      amount: "1000000",
    });
    mockClient.cancelBounty.mockResolvedValue({
      hash: "0xmno",
      success: false,
    });

    await expect(
      cancelBountyTool(mockClient, { bounty_id: "1" })
    ).rejects.toThrow(AptosChainError);
  });
});

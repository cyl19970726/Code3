import { describe, it, expect, vi, beforeEach } from "vitest";
import { acceptBountyTool } from "../../src/tools/accept-bounty.js";
import { AptosChainError, ErrorCode } from "../../src/utils/errors.js";
import { BountyStatus } from "../../src/types.js";

describe("accept-bounty tool", () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getBounty: vi.fn(),
      acceptBounty: vi.fn(),
      getAccountAddress: vi.fn().mockReturnValue("0xwinner"),
    };
  });

  it("should accept bounty successfully", async () => {
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.Open,
      sponsor: "0xsponsor",
    });
    mockClient.acceptBounty.mockResolvedValue({
      hash: "0xabc",
      success: true,
    });

    const result = await acceptBountyTool(mockClient, {
      bounty_id: "1",
    });

    expect(result.bounty_id).toBe("1");
    expect(result.tx_hash).toBe("0xabc");
    expect(result.winner).toBe("0xwinner");
    expect(result.status).toBe("Started");
  });

  it("should throw error if bounty not found", async () => {
    mockClient.getBounty.mockResolvedValue(null);

    await expect(
      acceptBountyTool(mockClient, { bounty_id: "999" })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error if bounty not in Open status", async () => {
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.Started, // Already started
    });

    await expect(
      acceptBountyTool(mockClient, { bounty_id: "1" })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error for invalid bounty_id", async () => {
    await expect(
      acceptBountyTool(mockClient, { bounty_id: "0" })
    ).rejects.toThrow(AptosChainError);

    await expect(
      acceptBountyTool(mockClient, { bounty_id: "abc" })
    ).rejects.toThrow(AptosChainError);
  });

  it("should throw error if transaction fails", async () => {
    mockClient.getBounty.mockResolvedValue({
      id: "1",
      status: BountyStatus.Open,
    });
    mockClient.acceptBounty.mockResolvedValue({
      hash: "0xabc",
      success: false,
    });

    await expect(
      acceptBountyTool(mockClient, { bounty_id: "1" })
    ).rejects.toThrow(AptosChainError);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { listBountiesTool } from "../../src/tools/list-bounties.js";
import { AptosClient } from "../../src/aptos/client.js";

// Mock AptosClient
vi.mock("../../src/aptos/client.js", () => {
  return {
    AptosClient: vi.fn(),
  };
});

describe("list-bounties tool", () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      listBounties: vi.fn(),
    };
  });

  it("should list bounties successfully", async () => {
    mockClient.listBounties.mockResolvedValue(["1", "2", "3"]);

    const result = await listBountiesTool(mockClient, {});

    expect(result.bounty_ids).toEqual(["1", "2", "3"]);
    expect(result.count).toBe(3);
    expect(mockClient.listBounties).toHaveBeenCalled();
  });

  it("should return empty array if no bounties", async () => {
    mockClient.listBounties.mockResolvedValue([]);

    const result = await listBountiesTool(mockClient, {});

    expect(result.bounty_ids).toEqual([]);
    expect(result.count).toBe(0);
  });
});

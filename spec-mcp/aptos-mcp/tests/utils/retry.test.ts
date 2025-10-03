import { describe, it, expect, vi } from "vitest";
import { retryWithBackoff, retryAptosTransaction } from "../../src/utils/retry.js";
import { AptosChainError, ErrorCode } from "../../src/utils/errors.js";

describe("retry.ts", () => {
  describe("retryWithBackoff", () => {
    it("should return result on first successful attempt", async () => {
      const fn = vi.fn().mockResolvedValue("success");

      const result = await retryWithBackoff(fn, {
        maxAttempts: 3,
        initialDelayMs: 100,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable errors", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new AptosChainError(ErrorCode.NETWORK_ERROR, "Network error"))
        .mockResolvedValue("success");

      const result = await retryWithBackoff(fn, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should not retry on non-retryable errors", async () => {
      const fn = vi.fn().mockRejectedValue(
        new AptosChainError(ErrorCode.BOUNTY_NOT_FOUND, "Not found")
      );

      await expect(
        retryWithBackoff(fn, {
          maxAttempts: 3,
          initialDelayMs: 10,
        })
      ).rejects.toThrow("Not found");

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should throw after max attempts", async () => {
      const fn = vi.fn().mockRejectedValue(
        new AptosChainError(ErrorCode.NETWORK_ERROR, "Network error")
      );

      await expect(
        retryWithBackoff(fn, {
          maxAttempts: 3,
          initialDelayMs: 10,
        })
      ).rejects.toThrow(AptosChainError);

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should use exponential backoff", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new AptosChainError(ErrorCode.RPC_ERROR, "RPC error"))
        .mockRejectedValueOnce(new AptosChainError(ErrorCode.RPC_ERROR, "RPC error"))
        .mockResolvedValue("success");

      const startTime = Date.now();

      await retryWithBackoff(fn, {
        maxAttempts: 3,
        initialDelayMs: 100,
        backoff: "exponential",
      });

      const elapsed = Date.now() - startTime;

      // First retry: ~100ms, second retry: ~200ms (with jitter)
      // Total should be at least 250ms (accounting for jitter)
      expect(elapsed).toBeGreaterThanOrEqual(200);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should use linear backoff", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new AptosChainError(ErrorCode.RPC_ERROR, "RPC error"))
        .mockRejectedValueOnce(new AptosChainError(ErrorCode.RPC_ERROR, "RPC error"))
        .mockResolvedValue("success");

      const startTime = Date.now();

      await retryWithBackoff(fn, {
        maxAttempts: 3,
        initialDelayMs: 100,
        backoff: "linear",
      });

      const elapsed = Date.now() - startTime;

      // First retry: ~100ms, second retry: ~200ms (with jitter)
      expect(elapsed).toBeGreaterThanOrEqual(200);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should respect maxDelayMs", async () => {
      const fn = vi.fn().mockRejectedValue(
        new AptosChainError(ErrorCode.NETWORK_ERROR, "Network error")
      );

      const startTime = Date.now();

      await expect(
        retryWithBackoff(fn, {
          maxAttempts: 5,
          initialDelayMs: 1000,
          maxDelayMs: 500, // Cap delay at 500ms
          backoff: "exponential",
        })
      ).rejects.toThrow();

      const elapsed = Date.now() - startTime;

      // Even with exponential backoff, each retry should be capped at ~500ms
      // Total time should be less than if delays were uncapped
      expect(elapsed).toBeLessThan(5000); // Should be ~2000ms with capping
    });

    it("should handle generic errors", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("Generic error"));

      await expect(
        retryWithBackoff(fn, {
          maxAttempts: 2,
          initialDelayMs: 10,
        })
      ).rejects.toThrow(AptosChainError);

      // Generic errors are retried and wrapped in AptosChainError
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("retryAptosTransaction", () => {
    it("should use default Aptos transaction config", async () => {
      const fn = vi.fn().mockResolvedValue("success");

      const result = await retryAptosTransaction(fn);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry up to 3 times", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new AptosChainError(ErrorCode.NETWORK_ERROR, "Network error"))
        .mockRejectedValueOnce(new AptosChainError(ErrorCode.NETWORK_ERROR, "Network error"))
        .mockResolvedValue("success");

      const result = await retryAptosTransaction(fn);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(3);
    }, 10000); // 10 second timeout
  });
});

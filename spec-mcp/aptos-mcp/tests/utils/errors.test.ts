import { describe, it, expect } from "vitest";
import {
  ErrorCode,
  AptosChainError,
  mapContractError,
  parseAptosError,
} from "../../src/utils/errors.js";

describe("errors.ts", () => {
  describe("AptosChainError", () => {
    it("should create error with code and message", () => {
      const error = new AptosChainError(
        ErrorCode.BOUNTY_NOT_FOUND,
        "Bounty not found"
      );

      expect(error.code).toBe(ErrorCode.BOUNTY_NOT_FOUND);
      expect(error.message).toBe("Bounty not found");
      expect(error.name).toBe("AptosChainError");
    });

    it("should include details in error", () => {
      const details = { bounty_id: "123" };
      const error = new AptosChainError(
        ErrorCode.BOUNTY_NOT_FOUND,
        "Bounty not found",
        details
      );

      expect(error.details).toEqual(details);
    });

    it("should serialize to JSON", () => {
      const error = new AptosChainError(
        ErrorCode.INVALID_STATUS,
        "Invalid status",
        { current: "Open", expected: "Started" }
      );

      const json = error.toJSON();

      expect(json).toEqual({
        name: "AptosChainError",
        code: ErrorCode.INVALID_STATUS,
        message: "Invalid status",
        details: { current: "Open", expected: "Started" },
      });
    });
  });

  describe("mapContractError", () => {
    it("should map Move error codes to ErrorCode", () => {
      expect(mapContractError(1)).toBe(ErrorCode.BOUNTY_NOT_FOUND);
      expect(mapContractError(2)).toBe(ErrorCode.INVALID_STATUS);
      expect(mapContractError(3)).toBe(ErrorCode.NOT_SPONSOR);
      expect(mapContractError(4)).toBe(ErrorCode.NOT_WINNER);
      expect(mapContractError(5)).toBe(ErrorCode.COOLING_PERIOD_NOT_ENDED);
      expect(mapContractError(6)).toBe(ErrorCode.INSUFFICIENT_BALANCE);
      expect(mapContractError(7)).toBe(ErrorCode.ALREADY_ACCEPTED);
      expect(mapContractError(8)).toBe(ErrorCode.INVALID_ASSET);
      expect(mapContractError(9)).toBe(ErrorCode.DUPLICATE_PR);
    });

    it("should return UNKNOWN_ERROR for unmapped codes", () => {
      expect(mapContractError(999)).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(mapContractError(0)).toBe(ErrorCode.UNKNOWN_ERROR);
    });
  });

  describe("parseAptosError", () => {
    it("should parse Move abort codes", () => {
      const error = {
        vm_status: "ABORTED with code 1 in module 0x1::bounty",
      };

      const parsed = parseAptosError(error);

      expect(parsed).toBeInstanceOf(AptosChainError);
      expect(parsed.code).toBe(ErrorCode.BOUNTY_NOT_FOUND);
      expect(parsed.message).toContain("BOUNTY_NOT_FOUND");
    });

    it("should parse insufficient gas errors", () => {
      const error = {
        message: "insufficient gas for transaction",
      };

      const parsed = parseAptosError(error);

      expect(parsed.code).toBe(ErrorCode.INSUFFICIENT_GAS);
    });

    it("should parse timeout errors", () => {
      const error1 = { message: "transaction timeout" };
      const error2 = { code: "ETIMEDOUT" };

      expect(parseAptosError(error1).code).toBe(ErrorCode.TRANSACTION_TIMEOUT);
      expect(parseAptosError(error2).code).toBe(ErrorCode.TRANSACTION_TIMEOUT);
    });

    it("should parse transaction failure errors", () => {
      const error = { message: "transaction failed to execute" };

      const parsed = parseAptosError(error);

      expect(parsed.code).toBe(ErrorCode.TRANSACTION_FAILED);
    });

    it("should parse network errors", () => {
      const error1 = { code: "ECONNREFUSED" };
      const error2 = { code: "ENOTFOUND" };

      expect(parseAptosError(error1).code).toBe(ErrorCode.NETWORK_ERROR);
      expect(parseAptosError(error2).code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it("should return UNKNOWN_ERROR for unparseable errors", () => {
      const error = { some_field: "unknown" };

      const parsed = parseAptosError(error);

      expect(parsed.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });
  });
});

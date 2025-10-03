import { describe, it, expect } from "vitest";
import {
  validateUrl,
  validateGitHubRepoUrl,
  validateGitHubPRUrl,
  validateAptosAddress,
  validateAmount,
  validateBountyId,
  validateIssueHash,
  validatePRDigest,
  validateRequiredFields,
} from "../../src/utils/validation.js";
import { AptosChainError, ErrorCode } from "../../src/utils/errors.js";

describe("validation.ts", () => {
  describe("validateUrl", () => {
    it("should accept valid HTTPS URLs", () => {
      expect(() => validateUrl("https://example.com", "test_url")).not.toThrow();
      expect(() => validateUrl("https://github.com/owner/repo", "test_url")).not.toThrow();
    });

    it("should accept localhost HTTP URLs", () => {
      expect(() => validateUrl("http://localhost:8080", "test_url")).not.toThrow();
    });

    it("should reject invalid URLs", () => {
      expect(() => validateUrl("not-a-url", "test_url")).toThrow(AptosChainError);
      expect(() => validateUrl("", "test_url")).toThrow(AptosChainError);
    });

    it("should reject HTTP URLs (non-localhost)", () => {
      expect(() => validateUrl("http://example.com", "test_url")).toThrow(AptosChainError);
    });
  });

  describe("validateGitHubRepoUrl", () => {
    it("should accept valid GitHub repo URLs", () => {
      expect(() => validateGitHubRepoUrl("https://github.com/owner/repo")).not.toThrow();
      expect(() => validateGitHubRepoUrl("https://github.com/code3/core")).not.toThrow();
      expect(() => validateGitHubRepoUrl("https://github.com/my-org/my-repo.js")).not.toThrow();
    });

    it("should accept URLs with trailing slash", () => {
      expect(() => validateGitHubRepoUrl("https://github.com/owner/repo/")).not.toThrow();
    });

    it("should accept URLs without .git suffix", () => {
      expect(() => validateGitHubRepoUrl("https://github.com/owner/repo.git")).not.toThrow();
    });

    it("should reject non-GitHub URLs", () => {
      expect(() => validateGitHubRepoUrl("https://gitlab.com/owner/repo")).toThrow(AptosChainError);
    });

    it("should reject invalid GitHub URL patterns", () => {
      expect(() => validateGitHubRepoUrl("https://github.com/owner")).toThrow(AptosChainError);
      expect(() => validateGitHubRepoUrl("https://github.com")).toThrow(AptosChainError);
    });
  });

  describe("validateGitHubPRUrl", () => {
    it("should accept valid GitHub PR URLs", () => {
      expect(() => validateGitHubPRUrl("https://github.com/owner/repo/pull/1")).not.toThrow();
      expect(() => validateGitHubPRUrl("https://github.com/owner/repo/pull/123")).not.toThrow();
    });

    it("should accept URLs with trailing slash", () => {
      expect(() => validateGitHubPRUrl("https://github.com/owner/repo/pull/1/")).not.toThrow();
    });

    it("should reject non-PR URLs", () => {
      expect(() => validateGitHubPRUrl("https://github.com/owner/repo")).toThrow(AptosChainError);
      expect(() => validateGitHubPRUrl("https://github.com/owner/repo/issues/1")).toThrow(AptosChainError);
    });

    it("should reject invalid PR URL patterns", () => {
      expect(() => validateGitHubPRUrl("https://github.com/owner/repo/pull/abc")).toThrow(AptosChainError);
    });
  });

  describe("validateAptosAddress", () => {
    it("should accept valid Aptos addresses", () => {
      expect(() => validateAptosAddress("0x1", "test_address")).not.toThrow();
      expect(() => validateAptosAddress("0x123abc", "test_address")).not.toThrow();
      expect(() => validateAptosAddress("0x" + "a".repeat(64), "test_address")).not.toThrow();
    });

    it("should reject invalid address formats", () => {
      expect(() => validateAptosAddress("123", "test_address")).toThrow(AptosChainError);
      expect(() => validateAptosAddress("0x", "test_address")).toThrow(AptosChainError);
      expect(() => validateAptosAddress("0x" + "a".repeat(65), "test_address")).toThrow(AptosChainError);
    });

    it("should reject addresses with invalid characters", () => {
      expect(() => validateAptosAddress("0xGGG", "test_address")).toThrow(AptosChainError);
    });
  });

  describe("validateAmount", () => {
    it("should accept valid positive amounts", () => {
      expect(() => validateAmount("1", "test_amount")).not.toThrow();
      expect(() => validateAmount("1000000", "test_amount")).not.toThrow();
      expect(() => validateAmount("18446744073709551615", "test_amount")).not.toThrow(); // u64::MAX
    });

    it("should reject zero", () => {
      expect(() => validateAmount("0", "test_amount")).toThrow(AptosChainError);
    });

    it("should reject negative amounts", () => {
      expect(() => validateAmount("-1", "test_amount")).toThrow(AptosChainError);
    });

    it("should reject non-numeric strings", () => {
      expect(() => validateAmount("abc", "test_amount")).toThrow(AptosChainError);
      expect(() => validateAmount("1.5", "test_amount")).toThrow(AptosChainError);
    });

    it("should reject amounts exceeding u64::MAX", () => {
      expect(() => validateAmount("18446744073709551616", "test_amount")).toThrow(AptosChainError);
    });
  });

  describe("validateBountyId", () => {
    it("should accept valid bounty IDs", () => {
      expect(() => validateBountyId("1")).not.toThrow();
      expect(() => validateBountyId("12345")).not.toThrow();
    });

    it("should reject zero", () => {
      expect(() => validateBountyId("0")).toThrow(AptosChainError);
    });

    it("should reject negative IDs", () => {
      expect(() => validateBountyId("-1")).toThrow(AptosChainError);
    });

    it("should reject non-numeric strings", () => {
      expect(() => validateBountyId("abc")).toThrow(AptosChainError);
    });
  });

  describe("validateIssueHash", () => {
    it("should accept valid SHA-256 hashes", () => {
      expect(() => validateIssueHash("a".repeat(64))).not.toThrow();
      expect(() => validateIssueHash("A".repeat(64))).not.toThrow();
      expect(() => validateIssueHash("0123456789abcdefABCDEF".repeat(3).substring(0, 64))).not.toThrow();
    });

    it("should reject invalid hash lengths", () => {
      expect(() => validateIssueHash("a".repeat(63))).toThrow(AptosChainError);
      expect(() => validateIssueHash("a".repeat(65))).toThrow(AptosChainError);
    });

    it("should reject empty strings", () => {
      expect(() => validateIssueHash("")).toThrow(AptosChainError);
    });

    it("should reject hashes with invalid characters", () => {
      expect(() => validateIssueHash("g".repeat(64))).toThrow(AptosChainError);
    });
  });

  describe("validatePRDigest", () => {
    it("should accept valid SHA-256 digests", () => {
      expect(() => validatePRDigest("b".repeat(64))).not.toThrow();
    });

    it("should reject invalid digest lengths", () => {
      expect(() => validatePRDigest("b".repeat(63))).toThrow(AptosChainError);
    });

    it("should reject empty strings", () => {
      expect(() => validatePRDigest("")).toThrow(AptosChainError);
    });
  });

  describe("validateRequiredFields", () => {
    it("should pass when all required fields are present", () => {
      expect(() =>
        validateRequiredFields(
          { field1: "value1", field2: "value2" },
          ["field1", "field2"]
        )
      ).not.toThrow();
    });

    it("should throw when required field is missing", () => {
      expect(() =>
        validateRequiredFields({ field1: "value1" }, ["field1", "field2"])
      ).toThrow(AptosChainError);
    });

    it("should throw when required field is undefined", () => {
      expect(() =>
        validateRequiredFields({ field1: "value1", field2: undefined }, ["field1", "field2"])
      ).toThrow(AptosChainError);
    });

    it("should throw when required field is null", () => {
      expect(() =>
        validateRequiredFields({ field1: "value1", field2: null }, ["field1", "field2"])
      ).toThrow(AptosChainError);
    });
  });
});

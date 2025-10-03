/// Input validation utilities for MCP tools

import { AptosChainError, ErrorCode } from "./errors.js";

/**
 * Validate URL format
 */
export function validateUrl(url: string, fieldName: string): void {
  try {
    new URL(url);
  } catch {
    throw new AptosChainError(
      ErrorCode.INVALID_URL,
      `${fieldName} must be a valid URL`,
      { url }
    );
  }

  // Additional validation: must be HTTPS (except localhost)
  if (!url.startsWith("https://") && !url.startsWith("http://localhost")) {
    throw new AptosChainError(
      ErrorCode.INVALID_URL,
      `${fieldName} must use HTTPS protocol`,
      { url }
    );
  }
}

/**
 * Validate GitHub repo URL format
 */
export function validateGitHubRepoUrl(url: string): void {
  validateUrl(url, "repo_url");

  // Must be a GitHub URL
  if (!url.includes("github.com/")) {
    throw new AptosChainError(
      ErrorCode.INVALID_URL,
      "repo_url must be a GitHub repository URL",
      { url }
    );
  }

  // Pattern: https://github.com/owner/repo
  const pattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;
  if (!pattern.test(url.replace(/\.git$/, ""))) {
    throw new AptosChainError(
      ErrorCode.INVALID_URL,
      "repo_url must match pattern: https://github.com/owner/repo",
      { url }
    );
  }
}

/**
 * Validate GitHub PR URL format
 */
export function validateGitHubPRUrl(url: string): void {
  validateUrl(url, "pr_url");

  // Must be a GitHub PR URL
  if (!url.includes("github.com/") || !url.includes("/pull/")) {
    throw new AptosChainError(
      ErrorCode.INVALID_URL,
      "pr_url must be a GitHub pull request URL",
      { url }
    );
  }

  // Pattern: https://github.com/owner/repo/pull/123
  const pattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/pull\/\d+\/?$/;
  if (!pattern.test(url)) {
    throw new AptosChainError(
      ErrorCode.INVALID_URL,
      "pr_url must match pattern: https://github.com/owner/repo/pull/123",
      { url }
    );
  }
}

/**
 * Validate Aptos address format
 */
export function validateAptosAddress(address: string, fieldName: string): void {
  // Aptos address format: 0x followed by 1-64 hex characters
  const pattern = /^0x[a-fA-F0-9]{1,64}$/;
  if (!pattern.test(address)) {
    throw new AptosChainError(
      ErrorCode.INVALID_ADDRESS,
      `${fieldName} must be a valid Aptos address (0x followed by 1-64 hex characters)`,
      { address }
    );
  }
}

/**
 * Validate amount (must be positive integer)
 */
export function validateAmount(amount: string, fieldName: string): void {
  // Must be a numeric string
  if (!/^\d+$/.test(amount)) {
    throw new AptosChainError(
      ErrorCode.INVALID_AMOUNT,
      `${fieldName} must be a positive integer string`,
      { amount }
    );
  }

  // Convert to BigInt for range validation
  try {
    const amountBigInt = BigInt(amount);

    // Must be positive
    if (amountBigInt <= 0n) {
      throw new AptosChainError(
        ErrorCode.INVALID_AMOUNT,
        `${fieldName} must be greater than 0`,
        { amount }
      );
    }

    // Check reasonable upper bound (u64 max)
    const U64_MAX = BigInt("18446744073709551615");
    if (amountBigInt > U64_MAX) {
      throw new AptosChainError(
        ErrorCode.INVALID_AMOUNT,
        `${fieldName} exceeds maximum allowed value (u64::MAX)`,
        { amount }
      );
    }
  } catch (error) {
    if (error instanceof AptosChainError) {
      throw error;
    }
    throw new AptosChainError(
      ErrorCode.INVALID_AMOUNT,
      `${fieldName} is not a valid number`,
      { amount, error }
    );
  }
}

/**
 * Validate bounty ID format
 */
export function validateBountyId(bountyId: string): void {
  // Must be a numeric string
  if (!/^\d+$/.test(bountyId)) {
    throw new AptosChainError(
      ErrorCode.INVALID_INPUT,
      "bounty_id must be a positive integer string",
      { bountyId }
    );
  }

  const id = parseInt(bountyId, 10);
  if (id <= 0) {
    throw new AptosChainError(
      ErrorCode.INVALID_INPUT,
      "bounty_id must be greater than 0",
      { bountyId }
    );
  }
}

/**
 * Validate issue hash (SHA-256 digest)
 */
export function validateIssueHash(hash: string): void {
  if (!hash || hash.trim() === "") {
    throw new AptosChainError(
      ErrorCode.INVALID_INPUT,
      "issue_hash cannot be empty",
      { hash }
    );
  }

  // SHA-256 produces 64 hex characters
  if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
    throw new AptosChainError(
      ErrorCode.INVALID_INPUT,
      "issue_hash must be a 64-character hex string (SHA-256)",
      { hash }
    );
  }
}

/**
 * Validate PR digest (SHA-256 digest)
 */
export function validatePRDigest(digest: string): void {
  if (!digest || digest.trim() === "") {
    throw new AptosChainError(
      ErrorCode.INVALID_INPUT,
      "pr_digest cannot be empty",
      { digest }
    );
  }

  // SHA-256 produces 64 hex characters
  if (!/^[a-fA-F0-9]{64}$/.test(digest)) {
    throw new AptosChainError(
      ErrorCode.INVALID_INPUT,
      "pr_digest must be a 64-character hex string (SHA-256)",
      { digest }
    );
  }
}

/**
 * Validate all required fields are present
 */
export function validateRequiredFields(
  obj: Record<string, any>,
  requiredFields: string[]
): void {
  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
      throw new AptosChainError(
        ErrorCode.INVALID_INPUT,
        `Missing required field: ${field}`,
        { requiredFields, providedFields: Object.keys(obj) }
      );
    }
  }
}

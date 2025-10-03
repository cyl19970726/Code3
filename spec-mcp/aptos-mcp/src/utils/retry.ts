/// Retry logic with exponential backoff

import { AptosChainError, ErrorCode } from "./errors.js";

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs?: number;
  backoff?: "exponential" | "linear";
  retryableErrors?: ErrorCode[];
}

const DEFAULT_RETRYABLE_ERRORS: ErrorCode[] = [
  ErrorCode.NETWORK_ERROR,
  ErrorCode.RPC_ERROR,
  ErrorCode.TRANSACTION_TIMEOUT,
];

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  const {
    maxAttempts,
    initialDelayMs,
    maxDelayMs = 30000, // 30 seconds max
    backoff = "exponential",
    retryableErrors = DEFAULT_RETRYABLE_ERRORS,
  } = config;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (error instanceof AptosChainError) {
        if (!retryableErrors.includes(error.code)) {
          // Non-retryable error, throw immediately
          throw error;
        }
      }

      // Last attempt, throw error
      if (attempt === maxAttempts) {
        throw new AptosChainError(
          ErrorCode.TRANSACTION_FAILED,
          `Failed after ${attempt} attempts: ${lastError.message}`,
          { originalError: lastError }
        );
      }

      // Calculate delay
      const delay = calculateDelay(attempt, initialDelayMs, maxDelayMs, backoff);

      console.log(
        `[Retry] Attempt ${attempt}/${maxAttempts} failed. ` +
        `Retrying in ${delay}ms... Error: ${lastError.message}`
      );

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Calculate delay for retry attempt
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoff: "exponential" | "linear"
): number {
  let delay: number;

  if (backoff === "exponential") {
    // Exponential backoff: initialDelay * 2^(attempt-1)
    delay = initialDelayMs * Math.pow(2, attempt - 1);
  } else {
    // Linear backoff: initialDelay * attempt
    delay = initialDelayMs * attempt;
  }

  // Add jitter to avoid thundering herd
  const jitter = Math.random() * 0.3 * delay; // ±30% jitter
  delay = delay + jitter;

  // Cap at maxDelayMs
  return Math.min(delay, maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with default config optimized for Aptos transactions
 */
export async function retryAptosTransaction<T>(
  fn: () => Promise<T>
): Promise<T> {
  return retryWithBackoff(fn, {
    maxAttempts: 3,
    initialDelayMs: 2000, // 2 seconds
    maxDelayMs: 10000, // 10 seconds
    backoff: "exponential",
  });
}

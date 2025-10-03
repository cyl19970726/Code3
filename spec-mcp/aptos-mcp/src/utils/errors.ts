/// Error definitions for Aptos Chain MCP

export enum ErrorCode {
  // Configuration errors
  CONFIG_MISSING = "CONFIG_MISSING",
  CONFIG_INVALID = "CONFIG_INVALID",
  PRIVATE_KEY_MISSING = "PRIVATE_KEY_MISSING",

  // Validation errors
  INVALID_INPUT = "INVALID_INPUT",
  INVALID_AMOUNT = "INVALID_AMOUNT",
  INVALID_ADDRESS = "INVALID_ADDRESS",
  INVALID_URL = "INVALID_URL",

  // Aptos SDK errors
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  TRANSACTION_TIMEOUT = "TRANSACTION_TIMEOUT",
  INSUFFICIENT_GAS = "INSUFFICIENT_GAS",
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",

  // Contract errors (mapped from Move error codes)
  BOUNTY_NOT_FOUND = "BOUNTY_NOT_FOUND",
  INVALID_STATUS = "INVALID_STATUS",
  NOT_SPONSOR = "NOT_SPONSOR",
  NOT_WINNER = "NOT_WINNER",
  COOLING_PERIOD_NOT_ENDED = "COOLING_PERIOD_NOT_ENDED",
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  ALREADY_ACCEPTED = "ALREADY_ACCEPTED",
  INVALID_ASSET = "INVALID_ASSET",
  DUPLICATE_PR = "DUPLICATE_PR",

  // Network errors
  NETWORK_ERROR = "NETWORK_ERROR",
  RPC_ERROR = "RPC_ERROR",

  // Unknown
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export class AptosChainError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AptosChainError";
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Map Move contract error codes to ErrorCode
 */
export function mapContractError(moveErrorCode: number): ErrorCode {
  const errorMap: Record<number, ErrorCode> = {
    1: ErrorCode.BOUNTY_NOT_FOUND,
    2: ErrorCode.INVALID_STATUS,
    3: ErrorCode.NOT_SPONSOR,
    4: ErrorCode.NOT_WINNER,
    5: ErrorCode.COOLING_PERIOD_NOT_ENDED,
    6: ErrorCode.INSUFFICIENT_BALANCE,
    7: ErrorCode.ALREADY_ACCEPTED,
    8: ErrorCode.INVALID_ASSET,
    9: ErrorCode.DUPLICATE_PR,
  };

  return errorMap[moveErrorCode] || ErrorCode.UNKNOWN_ERROR;
}

/**
 * Parse Aptos transaction error
 */
export function parseAptosError(error: any): AptosChainError {
  // Check for Move abort code in error.message (from Aptos SDK)
  if (error.message && typeof error.message === "string") {
    // Format: "Move abort in 0xADDRESS::MODULE: E_ERROR_NAME(0xCODE): "
    const abortMatch = error.message.match(/E_(\w+)\(0x(\w+)\)/);
    if (abortMatch) {
      const errorName = abortMatch[1];
      const errorCode = parseInt(abortMatch[2], 16);
      const mappedCode = mapContractError(errorCode);
      return new AptosChainError(
        mappedCode,
        `Contract error: ${errorName}`,
        { original_message: error.message, error_code: errorCode }
      );
    }
  }

  // Check for Move abort code in vm_status
  if (error.vm_status && error.vm_status.includes("ABORTED")) {
    const match = error.vm_status.match(/code (\d+)/);
    if (match) {
      const moveErrorCode = parseInt(match[1], 10);
      const errorCode = mapContractError(moveErrorCode);
      return new AptosChainError(
        errorCode,
        `Contract error: ${errorCode}`,
        { vm_status: error.vm_status }
      );
    }
  }

  // Check for insufficient gas
  if (error.message?.includes("insufficient") && error.message?.includes("gas")) {
    return new AptosChainError(
      ErrorCode.INSUFFICIENT_GAS,
      "Insufficient gas for transaction",
      error
    );
  }

  // Check for timeout
  if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
    return new AptosChainError(
      ErrorCode.TRANSACTION_TIMEOUT,
      "Transaction confirmation timeout",
      error
    );
  }

  // Generic transaction failure
  if (error.message?.includes("transaction")) {
    return new AptosChainError(
      ErrorCode.TRANSACTION_FAILED,
      error.message || "Transaction failed",
      error
    );
  }

  // Network error
  if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
    return new AptosChainError(
      ErrorCode.NETWORK_ERROR,
      "Network connection failed",
      error
    );
  }

  // Unknown error
  return new AptosChainError(
    ErrorCode.UNKNOWN_ERROR,
    error.message || "Unknown error",
    error
  );
}

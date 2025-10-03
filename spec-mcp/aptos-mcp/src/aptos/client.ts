/// Aptos SDK client wrapper for bounty contract interaction

import {
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Account,
  Network,
  NetworkToNetworkName,
  InputViewFunctionData,
  InputEntryFunctionData,
  AccountAddress,
  parseTypeTag,
} from "@aptos-labs/ts-sdk";
import type { AptosConfig as AppConfig, BountyInfo, TransactionResult } from "../types.js";
import { AptosChainError, ErrorCode, parseAptosError } from "../utils/errors.js";
import { retryWithBackoff } from "../utils/retry.js";
import { getDefaultNodeUrl } from "../config.js";

/**
 * Aptos client for interacting with the bounty contract
 */
export class AptosClient {
  private aptos: Aptos;
  private account: Account | null = null;
  private contractAddress: string;

  constructor(config: AppConfig) {
    // Initialize Aptos SDK config
    const nodeUrl = config.nodeUrl || getDefaultNodeUrl(config.network);
    const aptosConfig = new AptosConfig({
      network: config.network,
      fullnode: nodeUrl,
    });

    this.aptos = new Aptos(aptosConfig);
    this.contractAddress = config.contractAddress;

    // Initialize account if private key is provided
    if (config.privateKey) {
      try {
        // Remove "0x" prefix if present
        const privateKeyHex = config.privateKey.startsWith("0x")
          ? config.privateKey.slice(2)
          : config.privateKey;

        const privateKey = new Ed25519PrivateKey(privateKeyHex);
        this.account = Account.fromPrivateKey({ privateKey });

        console.log(`[AptosClient] Initialized account: ${this.account.accountAddress.toString()}`);
      } catch (error) {
        throw new AptosChainError(
          ErrorCode.PRIVATE_KEY_MISSING,
          "Failed to initialize account from private key",
          { error }
        );
      }
    } else {
      console.warn("[AptosClient] No private key provided. Running in read-only mode.");
    }
  }

  /**
   * Get account address (throws if private key not set)
   */
  private getAccount(): Account {
    if (!this.account) {
      throw new AptosChainError(
        ErrorCode.PRIVATE_KEY_MISSING,
        "Private key required for write operations. Set APTOS_PRIVATE_KEY environment variable."
      );
    }
    return this.account;
  }

  /**
   * Call a view function (read-only)
   */
  private async view<T = any>(
    functionName: string,
    typeArguments: string[] = [],
    args: any[] = []
  ): Promise<T> {
    const payload: InputViewFunctionData = {
      function: `${this.contractAddress}::bounty::${functionName}`,
      typeArguments,
      functionArguments: args,
    };

    try {
      const result = await retryWithBackoff(
        () => this.aptos.view({ payload }),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoff: "exponential",
        }
      );

      return result[0] as T;
    } catch (error) {
      throw parseAptosError(error);
    }
  }

  /**
   * Submit an entry function transaction (write operation)
   */
  private async submitTransaction(
    functionName: string,
    typeArguments: string[] = [],
    args: any[] = []
  ): Promise<TransactionResult> {
    const account = this.getAccount();

    const payload: InputEntryFunctionData = {
      function: `${this.contractAddress}::bounty::${functionName}`,
      typeArguments,
      functionArguments: args,
    };

    try {
      // Build transaction
      const transaction = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: payload,
      });

      // Sign and submit
      const pendingTxn = await this.aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      console.log(`[AptosClient] Transaction submitted: ${pendingTxn.hash}`);

      // Wait for confirmation (with retry)
      const response = await retryWithBackoff(
        async () => {
          return await this.aptos.waitForTransaction({
            transactionHash: pendingTxn.hash,
            options: {
              timeoutSecs: 30,
              checkSuccess: true,
            },
          });
        },
        {
          maxAttempts: 3,
          initialDelayMs: 2000,
          backoff: "linear",
        }
      );

      console.log(`[AptosClient] Transaction confirmed: ${response.hash}`);

      return {
        hash: response.hash,
        success: response.success,
        vm_status: response.vm_status,
        gas_used: response.gas_used?.toString(),
      };
    } catch (error) {
      throw parseAptosError(error);
    }
  }

  /**
   * Get bounty information by ID
   */
  async getBounty(bountyId: string): Promise<BountyInfo | null> {
    try {
      const result = await this.view<any>("get_bounty", [], [bountyId]);

      // If bounty not found, contract returns empty result
      if (!result || result.id === undefined) {
        return null;
      }

      // Parse bounty data (contract returns struct fields in order)
      return {
        id: result.id?.toString() || bountyId,
        sponsor: result.sponsor || "",
        winner: result.winner || null,
        repo_url: result.repo_url || "",
        issue_hash: result.issue_hash || "",
        pr_url: result.pr_url || null,
        asset: result.asset || "",
        amount: result.amount?.toString() || "0",
        status: result.status !== undefined ? result.status : 0,
        merged_at: result.merged_at || null,
        cooling_until: result.cooling_until || null,
        created_at: result.created_at || 0,
      };
    } catch (error) {
      // If error is BOUNTY_NOT_FOUND, return null instead of throwing
      if (error instanceof AptosChainError && error.code === ErrorCode.BOUNTY_NOT_FOUND) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get bounty ID by issue hash (for idempotency check)
   * Returns bounty ID if found, or "0" if not found
   */
  async getBountyByIssueHash(issueHash: string): Promise<string> {
    try {
      // Convert issue_hash string to vector<u8>
      const issueHashBytes = Buffer.from(issueHash, "hex");

      const result = await this.view<string>("get_bounty_by_issue_hash", [], [
        Array.from(issueHashBytes),
      ]);

      return result.toString();
    } catch (error) {
      throw parseAptosError(error);
    }
  }

  /**
   * List all bounties (returns bounty IDs)
   */
  async listBounties(): Promise<string[]> {
    try {
      const result = await this.view<any[]>("list_bounties", [], []);

      // Convert to string array
      return result.map((id) => id.toString());
    } catch (error) {
      throw parseAptosError(error);
    }
  }

  /**
   * Get bounties by sponsor address
   */
  async getBountiesBySponsor(sponsor: string): Promise<string[]> {
    try {
      const result = await this.view<any[]>("get_bounties_by_sponsor", [], [sponsor]);

      // Convert to string array
      return result.map((id) => id.toString());
    } catch (error) {
      throw parseAptosError(error);
    }
  }

  /**
   * Get bounties by winner address
   */
  async getBountiesByWinner(winner: string): Promise<string[]> {
    try {
      const result = await this.view<any[]>("get_bounties_by_winner", [], [winner]);

      // Convert to string array
      return result.map((id) => id.toString());
    } catch (error) {
      throw parseAptosError(error);
    }
  }

  /**
   * Create a new bounty
   */
  async createBounty(
    repoUrl: string,
    issueHash: string,
    asset: string,
    amount: string
  ): Promise<TransactionResult> {
    // Convert issue_hash string to vector<u8>
    const issueHashBytes = Buffer.from(issueHash, "hex");

    return this.submitTransaction(
      "create_bounty",
      [], // No type arguments
      [
        repoUrl,
        Array.from(issueHashBytes), // vector<u8>
        asset, // Object<Metadata> address
        amount, // u64 as string
      ]
    );
  }

  /**
   * Accept a bounty (mark as Started)
   */
  async acceptBounty(bountyId: string): Promise<TransactionResult> {
    return this.submitTransaction("accept_bounty", [], [bountyId]);
  }

  /**
   * Submit a PR for a bounty
   */
  async submitPR(
    bountyId: string,
    prUrl: string,
    prDigest: string
  ): Promise<TransactionResult> {
    // Convert pr_digest string to vector<u8>
    const prDigestBytes = Buffer.from(prDigest, "hex");

    return this.submitTransaction(
      "submit_pr",
      [],
      [
        bountyId,
        prUrl,
        Array.from(prDigestBytes), // vector<u8>
      ]
    );
  }

  /**
   * Mark a PR as merged (sponsor only)
   */
  async markMerged(bountyId: string, prUrl: string): Promise<TransactionResult> {
    return this.submitTransaction("mark_merged", [], [bountyId, prUrl]);
  }

  /**
   * Claim payout after cooling period (winner only)
   */
  async claimPayout(bountyId: string): Promise<TransactionResult> {
    return this.submitTransaction("claim_payout", [], [bountyId]);
  }

  /**
   * Cancel a bounty (sponsor only, before PR submission)
   */
  async cancelBounty(bountyId: string): Promise<TransactionResult> {
    return this.submitTransaction("cancel_bounty", [], [bountyId]);
  }

  /**
   * Get account balance for a specific asset
   */
  async getBalance(accountAddress: string, assetAddress: string): Promise<string> {
    try {
      // Use primary_fungible_store::balance view function
      const payload: InputViewFunctionData = {
        function: "0x1::primary_fungible_store::balance",
        typeArguments: [],
        functionArguments: [accountAddress, assetAddress],
      };

      const result = await this.aptos.view({ payload });
      return result[0]?.toString() || "0";
    } catch (error) {
      // If account doesn't exist or has no balance, return "0"
      console.warn(`[AptosClient] Failed to get balance: ${error}`);
      return "0";
    }
  }

  /**
   * Get current account address
   */
  getAccountAddress(): string | null {
    return this.account?.accountAddress.toString() || null;
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.contractAddress;
  }

  /**
   * Get network name
   */
  getNetwork(): string {
    return this.aptos.config.network;
  }
}

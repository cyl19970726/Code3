import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import type {
  BountyOperator,
  CreateBountyParams,
  CreateBountyResult,
  AcceptBountyParams,
  AcceptBountyResult,
  SubmitBountyParams,
  SubmitBountyResult,
  ConfirmBountyParams,
  ConfirmBountyResult,
  ClaimPayoutParams,
  ClaimPayoutResult,
  CancelBountyParams,
  CancelBountyResult,
  GetBountyParams,
  Bounty,
  GetBountyByTaskHashParams,
  GetBountyByTaskHashResult,
  ListBountiesParams,
  ListBountiesResult,
  GetBountiesBySponsorParams,
  GetBountiesBySponsorResult,
  GetBountiesByWorkerParams,
  GetBountiesByWorkerResult
} from '@code3-team/bounty-operator';
import { BountyStatus } from '@code3-team/bounty-operator';

export interface AptosBountyOperatorConfig {
  network: Network;
  privateKey: string;
  moduleAddress: string;
}

/**
 * Aptos implementation of BountyOperator interface
 *
 * Wraps Aptos Move contract calls with TypeScript SDK
 */
export class AptosBountyOperator implements BountyOperator {
  private aptos: Aptos;
  private account: Account;
  private moduleAddress: string;

  constructor(config: AptosBountyOperatorConfig) {
    const aptosConfig = new AptosConfig({ network: config.network });
    this.aptos = new Aptos(aptosConfig);
    const privateKey = new Ed25519PrivateKey(config.privateKey);
    this.account = Account.fromPrivateKey({ privateKey });
    this.moduleAddress = config.moduleAddress;
  }

  // ========== Write Operations ==========

  async createBounty(params: CreateBountyParams): Promise<CreateBountyResult> {
    // Move contract signature: create_bounty(sponsor, task_id, task_hash, amount, asset)
    const payload = {
      function: `${this.moduleAddress}::bounty::create_bounty` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: [
        params.taskId,
        params.taskHash,
        params.amount,
        params.asset
      ]
    } as any;

    const transaction = await this.aptos.transaction.build.simple({
      sender: this.account.accountAddress,
      data: payload
    });

    const committedTxn = await this.aptos.signAndSubmitTransaction({
      signer: this.account,
      transaction
    });

    await this.aptos.waitForTransaction({ transactionHash: committedTxn.hash });

    // Query the bountyId using taskHash (idempotency check)
    const result = await this.getBountyByTaskHash({ taskHash: params.taskHash });

    return {
      bountyId: result.bountyId!,
      txHash: committedTxn.hash
    };
  }

  async acceptBounty(params: AcceptBountyParams): Promise<AcceptBountyResult> {
    const payload = {
      function: `${this.moduleAddress}::bounty::accept_bounty` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: [params.bountyId]
    } as any;

    const transaction = await this.aptos.transaction.build.simple({
      sender: this.account.accountAddress,
      data: payload
    });

    const committedTxn = await this.aptos.signAndSubmitTransaction({
      signer: this.account,
      transaction
    });

    await this.aptos.waitForTransaction({ transactionHash: committedTxn.hash });

    return {
      txHash: committedTxn.hash
    };
  }

  async submitBounty(params: SubmitBountyParams): Promise<SubmitBountyResult> {
    const payload = {
      function: `${this.moduleAddress}::bounty::submit_bounty` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: [params.bountyId, params.submissionHash || '']
    } as any;

    const transaction = await this.aptos.transaction.build.simple({
      sender: this.account.accountAddress,
      data: payload
    });

    const committedTxn = await this.aptos.signAndSubmitTransaction({
      signer: this.account,
      transaction
    });

    await this.aptos.waitForTransaction({ transactionHash: committedTxn.hash });

    return {
      txHash: committedTxn.hash
    };
  }

  async confirmBounty(params: ConfirmBountyParams): Promise<ConfirmBountyResult> {
    const payload = {
      function: `${this.moduleAddress}::bounty::confirm_bounty` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: [params.bountyId, params.confirmedAt]
    } as any;

    const transaction = await this.aptos.transaction.build.simple({
      sender: this.account.accountAddress,
      data: payload
    });

    const committedTxn = await this.aptos.signAndSubmitTransaction({
      signer: this.account,
      transaction
    });

    await this.aptos.waitForTransaction({ transactionHash: committedTxn.hash });

    // Calculate cooling period end (7 days = 604800 seconds)
    const coolingUntil = params.confirmedAt + 604800;

    return {
      txHash: committedTxn.hash,
      confirmedAt: params.confirmedAt,
      coolingUntil
    };
  }

  async claimPayout(params: ClaimPayoutParams): Promise<ClaimPayoutResult> {
    const payload = {
      function: `${this.moduleAddress}::bounty::claim_payout` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: [params.bountyId]
    } as any;

    const transaction = await this.aptos.transaction.build.simple({
      sender: this.account.accountAddress,
      data: payload
    });

    const committedTxn = await this.aptos.signAndSubmitTransaction({
      signer: this.account,
      transaction
    });

    await this.aptos.waitForTransaction({ transactionHash: committedTxn.hash });

    return {
      txHash: committedTxn.hash
    };
  }

  async cancelBounty(params: CancelBountyParams): Promise<CancelBountyResult> {
    const payload = {
      function: `${this.moduleAddress}::bounty::cancel_bounty` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: [params.bountyId]
    } as any;

    const transaction = await this.aptos.transaction.build.simple({
      sender: this.account.accountAddress,
      data: payload
    });

    const committedTxn = await this.aptos.signAndSubmitTransaction({
      signer: this.account,
      transaction
    });

    await this.aptos.waitForTransaction({ transactionHash: committedTxn.hash });

    return {
      txHash: committedTxn.hash
    };
  }

  // ========== Read Operations ==========

  async getBounty(params: GetBountyParams): Promise<Bounty> {
    const payload = {
      function: `${this.moduleAddress}::bounty::get_bounty` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: [params.bountyId]
    };

    const result = await this.aptos.view({ payload });

    // Parse Move struct to TypeScript Bounty type
    return this.parseBountyFromMove(result[0]);
  }

  async getBountyByTaskHash(params: GetBountyByTaskHashParams): Promise<GetBountyByTaskHashResult> {
    const payload = {
      function: `${this.moduleAddress}::bounty::get_bounty_by_task_hash` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: [params.taskHash]
    };

    const result = await this.aptos.view({ payload });

    // Move contract returns (bool, u64) or similar
    const bountyId = result[0] as string;

    if (bountyId && bountyId !== '0') {
      return {
        bountyId,
        found: true
      };
    } else {
      return {
        bountyId: null,
        found: false
      };
    }
  }

  async listBounties(params?: ListBountiesParams): Promise<ListBountiesResult> {
    const payload = {
      function: `${this.moduleAddress}::bounty::list_all_bounties` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: []
    };

    try {
      const result = await this.aptos.view({ payload });
      const bountyIds = result[0] as string[];

      return {
        bountyIds,
        count: bountyIds.length
      };
    } catch (error) {
      // If list_all_bounties not implemented, return empty list
      console.warn('list_all_bounties view function not found, returning empty list');
      return {
        bountyIds: [],
        count: 0
      };
    }
  }

  async getBountiesBySponsor(params: GetBountiesBySponsorParams): Promise<GetBountiesBySponsorResult> {
    const payload = {
      function: `${this.moduleAddress}::bounty::get_bounties_by_sponsor` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: [params.sponsor]
    };

    const result = await this.aptos.view({ payload });
    const bountyIds = result[0] as string[];

    return {
      bountyIds,
      count: bountyIds.length
    };
  }

  async getBountiesByWorker(params: GetBountiesByWorkerParams): Promise<GetBountiesByWorkerResult> {
    const payload = {
      function: `${this.moduleAddress}::bounty::get_bounties_by_worker` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: [params.worker]
    };

    const result = await this.aptos.view({ payload });
    const bountyIds = result[0] as string[];

    return {
      bountyIds,
      count: bountyIds.length
    };
  }

  // ========== Helper Methods ==========

  /**
   * Parse Move Bounty struct to TypeScript Bounty type
   */
  private parseBountyFromMove(moveData: any): Bounty {
    return {
      bountyId: String(moveData.bounty_id || '0'),
      taskId: moveData.task_id || '',
      taskHash: moveData.task_hash || '',
      sponsor: moveData.sponsor || '',
      worker: moveData.worker === '0x0' ? null : moveData.worker,
      amount: String(moveData.amount || '0'),
      asset: moveData.asset || '',
      status: this.parseStatus(Number(moveData.status || 0)),
      createdAt: Number(moveData.created_at || 0),
      acceptedAt: Number(moveData.accepted_at || 0) || null,
      submittedAt: Number(moveData.submitted_at || 0) || null,
      confirmedAt: Number(moveData.confirmed_at || 0) || null,
      claimedAt: Number(moveData.claimed_at || 0) || null
    };
  }

  /**
   * Parse Aptos on-chain status to TypeScript BountyStatus enum
   *
   * Mapping (Aptos Move contract → TypeScript enum):
   * - 0 (STATUS_OPEN) → Open
   * - 1 (STATUS_ACCEPTED) → Accepted
   * - 2 (STATUS_SUBMITTED) → Submitted
   * - 3 (STATUS_CONFIRMED) → Confirmed (enters 7-day cooling period)
   * - 4 (STATUS_CLAIMED) → Claimed
   * - 5 (STATUS_CANCELLED) → Cancelled
   *
   * Note: STATUS_CONFIRMED (3) represents the cooling down period state
   */
  private parseStatus(statusCode: number): BountyStatus {
    switch (statusCode) {
      case 0: // Open
        return BountyStatus.Open;
      case 1: // Accepted
        return BountyStatus.Accepted;
      case 2: // Submitted
        return BountyStatus.Submitted;
      case 3: // Confirmed (cooling down period)
        return BountyStatus.Confirmed;
      case 4: // Claimed
        return BountyStatus.Claimed;
      case 5: // Cancelled
        return BountyStatus.Cancelled;
      default:
        return BountyStatus.Open;
    }
  }
}

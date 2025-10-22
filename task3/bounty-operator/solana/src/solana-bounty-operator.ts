import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import BN from 'bn.js';
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
  GetBountiesByWorkerResult,
} from '@code3-team/bounty-operator';
import { BountyStatus } from '@code3-team/bounty-operator';
import type { BountyManager } from '../target/types/bounty_manager.js';
import bs58 from 'bs58';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const IDL = JSON.parse(
  readFileSync(join(__dirname, '../target/idl/bounty_manager.json'), 'utf-8')
);

export interface SolanaBountyOperatorConfig {
  rpcUrl: string;
  privateKey: string; // Base58 encoded private key
  programId: string;
}

/**
 * Solana implementation of BountyOperator interface
 *
 * Wraps Solana bounty_manager program calls with @solana/web3.js and Anchor
 */
export class SolanaBountyOperator implements BountyOperator {
  private connection: Connection;
  private wallet: Wallet;
  private program: Program<BountyManager>;
  private config: SolanaBountyOperatorConfig;
  private keypair: Keypair;

  // PDA seeds (must match Rust constants)
  private static readonly BOUNTY_MANAGER_SEED = Buffer.from('bounty_manager');
  private static readonly BOUNTY_SEED = Buffer.from('bounty');
  private static readonly BOUNTY_VAULT_SEED = Buffer.from('bounty_vault');

  constructor(config: SolanaBountyOperatorConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, 'confirmed');

    // Parse private key from Base58
    const secretKey = bs58.decode(config.privateKey);
    this.keypair = Keypair.fromSecretKey(secretKey);
    this.wallet = new Wallet(this.keypair);

    // Create Anchor provider
    const provider = new AnchorProvider(this.connection, this.wallet, {
      commitment: 'confirmed',
    });

    // Create program instance
    this.program = new Program(IDL as unknown as BountyManager, provider);
  }

  // ========== PDA Derivation Helpers ==========

  private async deriveBountyManagerPDA(): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [SolanaBountyOperator.BOUNTY_MANAGER_SEED],
      this.program.programId
    );
  }

  private async deriveBountyPDA(bountyId: number): Promise<[PublicKey, number]> {
    const bountyIdBuffer = Buffer.alloc(8);
    bountyIdBuffer.writeBigUInt64LE(BigInt(bountyId));

    return PublicKey.findProgramAddressSync(
      [SolanaBountyOperator.BOUNTY_SEED, bountyIdBuffer],
      this.program.programId
    );
  }

  private async deriveBountyVaultPDA(bountyId: number): Promise<[PublicKey, number]> {
    const bountyIdBuffer = Buffer.alloc(8);
    bountyIdBuffer.writeBigUInt64LE(BigInt(bountyId));

    return PublicKey.findProgramAddressSync(
      [SolanaBountyOperator.BOUNTY_VAULT_SEED, bountyIdBuffer],
      this.program.programId
    );
  }

  // ========== Type Conversion Helpers ==========

  private bountyStatusToEnum(status: any): BountyStatus {
    // Solana status enum: { open: {}, accepted: {}, submitted: {}, confirmed: {}, claimed: {}, cancelled: {} }
    if (status.open !== undefined) return BountyStatus.Open;
    if (status.accepted !== undefined) return BountyStatus.Accepted;
    if (status.submitted !== undefined) return BountyStatus.Submitted;
    if (status.confirmed !== undefined) return BountyStatus.Confirmed;
    if (status.claimed !== undefined) return BountyStatus.Claimed;
    if (status.cancelled !== undefined) return BountyStatus.Cancelled;
    throw new Error(`Unknown bounty status: ${JSON.stringify(status)}`);
  }

  private convertBountyToInterface(onChainBounty: any): Bounty {
    return {
      bountyId: onChainBounty.bountyId.toString(),
      taskId: onChainBounty.taskId,
      taskUrl: onChainBounty.taskUrl,
      taskHash: Buffer.from(onChainBounty.taskHash).toString('hex'),
      sponsor: onChainBounty.sponsor.toBase58(),
      worker: onChainBounty.worker.equals(SystemProgram.programId)
        ? null
        : onChainBounty.worker.toBase58(),
      amount: onChainBounty.amount.toString(),
      asset: onChainBounty.asset.equals(SystemProgram.programId) ? 'SOL' : onChainBounty.asset.toBase58(),
      status: this.bountyStatusToEnum(onChainBounty.status),
      createdAt: onChainBounty.createdAt.toNumber(),
      acceptedAt: onChainBounty.acceptedAt.toNumber() || null,
      submittedAt: onChainBounty.submittedAt.toNumber() || null,
      confirmedAt: onChainBounty.confirmedAt.toNumber() || null,
      claimedAt: onChainBounty.claimedAt.toNumber() || null,
    };
  }

  // ========== Write Operations ==========

  async createBounty(params: CreateBountyParams): Promise<CreateBountyResult> {
    // Get BountyManager PDA to read next_bounty_id
    const [bountyManagerPDA] = await this.deriveBountyManagerPDA();
    const bountyManager = await this.program.account.bountyManager.fetch(bountyManagerPDA);
    const bountyId = bountyManager.nextBountyId.toNumber();

    // Derive PDAs for new bounty
    const [bountyPDA] = await this.deriveBountyPDA(bountyId);
    const [bountyVaultPDA] = await this.deriveBountyVaultPDA(bountyId);

    // Convert taskHash to [u8; 32]
    const taskHashBuffer = Buffer.from(params.taskHash, 'hex');
    if (taskHashBuffer.length !== 32) {
      throw new Error('taskHash must be exactly 32 bytes');
    }
    const taskHashArray = Array.from(taskHashBuffer);

    // Convert amount to u64
    const amount = new BN(params.amount);

    // Call create_bounty instruction
    const tx = await this.program.methods
      .createBounty(
        params.taskId,
        params.taskUrl,
        taskHashArray,
        amount
      )
      .accountsPartial({
        bountyManager: bountyManagerPDA,
        bounty: bountyPDA,
        bountyVault: bountyVaultPDA,
        sponsor: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return {
      bountyId: bountyId.toString(),
      txHash: tx,
    };
  }

  async acceptBounty(params: AcceptBountyParams): Promise<AcceptBountyResult> {
    const bountyId = parseInt(params.bountyId);
    const [bountyManagerPDA] = await this.deriveBountyManagerPDA();
    const [bountyPDA] = await this.deriveBountyPDA(bountyId);

    // Get worker address from current wallet (sponsor assigns worker)
    const worker = this.wallet.publicKey;

    const tx = await this.program.methods
      .acceptBounty(worker)
      .accountsPartial({
        bountyManager: bountyManagerPDA,
        bounty: bountyPDA,
        sponsor: this.wallet.publicKey,
      } as any)
      .rpc();

    return { txHash: tx };
  }

  async submitBounty(params: SubmitBountyParams): Promise<SubmitBountyResult> {
    const bountyId = parseInt(params.bountyId);
    const [bountyManagerPDA] = await this.deriveBountyManagerPDA();
    const [bountyPDA] = await this.deriveBountyPDA(bountyId);

    // Use submissionHash as submission URL (or construct GitHub PR URL)
    const submissionUrl = params.submissionHash || '';

    const tx = await this.program.methods
      .submitBounty(submissionUrl)
      .accountsPartial({
        bountyManager: bountyManagerPDA,
        bounty: bountyPDA,
        worker: this.wallet.publicKey,
      } as any)
      .rpc();

    return { txHash: tx };
  }

  async confirmBounty(params: ConfirmBountyParams): Promise<ConfirmBountyResult> {
    const bountyId = parseInt(params.bountyId);
    const [bountyManagerPDA] = await this.deriveBountyManagerPDA();
    const [bountyPDA] = await this.deriveBountyPDA(bountyId);

    const tx = await this.program.methods
      .confirmBounty()
      .accountsPartial({
        bountyManager: bountyManagerPDA,
        bounty: bountyPDA,
        sponsor: this.wallet.publicKey,
      } as any)
      .rpc();

    return {
      txHash: tx,
      confirmedAt: params.confirmedAt,
    };
  }

  async claimPayout(params: ClaimPayoutParams): Promise<ClaimPayoutResult> {
    const bountyId = parseInt(params.bountyId);
    const [bountyManagerPDA] = await this.deriveBountyManagerPDA();
    const [bountyPDA] = await this.deriveBountyPDA(bountyId);
    const [bountyVaultPDA] = await this.deriveBountyVaultPDA(bountyId);

    const tx = await this.program.methods
      .claimBounty()
      .accountsPartial({
        bountyManager: bountyManagerPDA,
        bounty: bountyPDA,
        bountyVault: bountyVaultPDA,
        worker: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    return { txHash: tx };
  }

  async cancelBounty(params: CancelBountyParams): Promise<CancelBountyResult> {
    throw new Error('cancelBounty not implemented yet');
  }

  // ========== Read Operations ==========

  async getBounty(params: GetBountyParams): Promise<Bounty> {
    const bountyId = parseInt(params.bountyId);
    const [bountyPDA] = await this.deriveBountyPDA(bountyId);

    const bountyAccount = await this.program.account.bounty.fetch(bountyPDA);
    return this.convertBountyToInterface(bountyAccount);
  }

  async getBountyByTaskHash(params: GetBountyByTaskHashParams): Promise<GetBountyByTaskHashResult> {
    const taskHashBuffer = Buffer.from(params.taskHash, 'hex');

    // Get all bounty accounts
    const bounties = await this.program.account.bounty.all();

    // Find bounty with matching taskHash
    for (const bounty of bounties) {
      const onChainTaskHash = Buffer.from(bounty.account.taskHash);
      if (onChainTaskHash.equals(taskHashBuffer)) {
        return {
          bountyId: bounty.account.bountyId.toString(),
          found: true,
        };
      }
    }

    return {
      bountyId: null,
      found: false,
    };
  }

  async listBounties(params?: ListBountiesParams): Promise<ListBountiesResult> {
    const offset = params?.offset || 0;
    const limit = params?.limit || 100;

    // Get all bounty accounts
    const bounties = await this.program.account.bounty.all();

    // Sort by bountyId and apply pagination
    const sortedBounties = bounties
      .sort((a, b) => a.account.bountyId.toNumber() - b.account.bountyId.toNumber())
      .slice(offset, offset + limit);

    return {
      bountyIds: sortedBounties.map(b => b.account.bountyId.toString()),
      count: sortedBounties.length,
    };
  }

  async getBountiesBySponsor(params: GetBountiesBySponsorParams): Promise<GetBountiesBySponsorResult> {
    const sponsorPubkey = new PublicKey(params.sponsor);

    // Get all bounties and filter by sponsor
    const allBounties = await this.program.account.bounty.all();
    const bounties = allBounties.filter(b => b.account.sponsor.equals(sponsorPubkey));

    return {
      bountyIds: bounties.map(b => b.account.bountyId.toString()),
      count: bounties.length,
    };
  }

  async getBountiesByWorker(params: GetBountiesByWorkerParams): Promise<GetBountiesByWorkerResult> {
    const workerPubkey = new PublicKey(params.worker);

    // Get all bounties and filter by worker
    const allBounties = await this.program.account.bounty.all();
    const bounties = allBounties.filter(
      b => b.account.worker.equals(workerPubkey) && !b.account.worker.equals(SystemProgram.programId)
    );

    return {
      bountyIds: bounties.map(b => b.account.bountyId.toString()),
      count: bounties.length,
    };
  }
}

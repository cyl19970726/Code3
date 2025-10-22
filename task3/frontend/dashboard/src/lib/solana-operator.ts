import { Connection, PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Bounty, BountyStatus } from './types';

// Status mapping from Solana enum to string
const parseStatus = (status: any): BountyStatus => {
  if (status.open !== undefined) return 'Open';
  if (status.accepted !== undefined) return 'Accepted';
  if (status.submitted !== undefined) return 'Submitted';
  if (status.confirmed !== undefined) return 'Confirmed';
  if (status.claimed !== undefined) return 'Claimed';
  if (status.cancelled !== undefined) return 'Cancelled';
  return 'Open';
};

// Read-only wallet for Anchor (server-side)
class ReadOnlyWallet implements Wallet {
  readonly payer: Keypair;

  constructor() {
    // Create a dummy keypair for read-only operations
    this.payer = Keypair.generate();
  }

  async signTransaction(): Promise<any> {
    throw new Error('Read-only wallet cannot sign');
  }

  async signAllTransactions(): Promise<any[]> {
    throw new Error('Read-only wallet cannot sign');
  }

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }
}

export class SolanaOperator {
  private connection: Connection;
  private program: any = null;
  private programId: PublicKey;
  private initialized: boolean = false;

  // PDA seeds (must match Rust constants)
  private static readonly BOUNTY_SEED = Buffer.from('bounty');

  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'http://localhost:8899';
    const programIdString = process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID || '';

    if (!programIdString) {
      console.warn('NEXT_PUBLIC_SOLANA_PROGRAM_ID is not set');
    }

    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(programIdString);
  }

  /**
   * Initialize Anchor program (lazy initialization)
   */
  private async initProgram() {
    if (this.initialized) return;

    try {
      // Dynamically import IDL
      const fs = await import('fs');
      const path = await import('path');

      const idlPath = path.join(
        process.cwd(),
        '../../bounty-operator/solana/target/idl/bounty_manager.json'
      );

      const idlContent = fs.readFileSync(idlPath, 'utf-8');
      const idl = JSON.parse(idlContent);

      // Create read-only provider
      const dummyWallet = new ReadOnlyWallet();
      const provider = new AnchorProvider(
        this.connection,
        dummyWallet,
        { commitment: 'confirmed' }
      );

      this.program = new Program(idl, provider);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Solana program:', error);
    }
  }

  /**
   * Derive Bounty PDA from bounty ID
   */
  private deriveBountyPDA(bountyId: number): PublicKey {
    const bountyIdBuffer = Buffer.alloc(8);
    bountyIdBuffer.writeBigUInt64LE(BigInt(bountyId));

    const [bountyPDA] = PublicKey.findProgramAddressSync(
      [SolanaOperator.BOUNTY_SEED, bountyIdBuffer],
      this.programId
    );

    return bountyPDA;
  }

  /**
   * Get a single bounty by ID
   */
  async getBounty(bountyId: string): Promise<Bounty | null> {
    await this.initProgram();

    if (!this.program) {
      console.error('Solana program not initialized');
      return null;
    }

    try {
      const bountyPDA = this.deriveBountyPDA(parseInt(bountyId));
      const bountyAccount = await this.program.account.bounty.fetch(bountyPDA);

      return this.parseBountyFromAccount(bountyAccount);
    } catch (error) {
      console.error('Error fetching Solana bounty:', error);
      return null;
    }
  }

  /**
   * List all bounties
   */
  async listBounties(): Promise<Bounty[]> {
    await this.initProgram();

    if (!this.program) {
      console.error('Solana program not initialized');
      return [];
    }

    try {
      // Fetch all bounty accounts
      const bountyAccounts = await this.program.account.bounty.all();

      // Parse and return
      return bountyAccounts
        .map(({ account }: any) => this.parseBountyFromAccount(account))
        .filter((b: Bounty | null): b is Bounty => b !== null);
    } catch (error) {
      console.error('Error listing Solana bounties:', error);
      return [];
    }
  }

  /**
   * Parse bounty data from on-chain account
   */
  private parseBountyFromAccount(account: any): Bounty | null {
    try {
      return {
        bountyId: account.bountyId.toString(),
        taskId: account.taskId,
        taskUrl: account.taskUrl,
        taskHash: Buffer.from(account.taskHash).toString('hex'),
        sponsor: account.sponsor.toBase58(),
        worker: account.worker.equals(SystemProgram.programId)
          ? null
          : account.worker.toBase58(),
        amount: account.amount.toString(),
        asset: account.asset.equals(SystemProgram.programId)
          ? 'SOL'
          : account.asset.toBase58(),
        status: parseStatus(account.status),
        chain: 'solana',
        createdAt: account.createdAt.toNumber() * 1000, // Convert to milliseconds
        acceptedAt: account.acceptedAt.toNumber() > 0
          ? account.acceptedAt.toNumber() * 1000
          : undefined,
        submittedAt: account.submittedAt.toNumber() > 0
          ? account.submittedAt.toNumber() * 1000
          : undefined,
        confirmedAt: account.confirmedAt.toNumber() > 0
          ? account.confirmedAt.toNumber() * 1000
          : undefined,
        claimedAt: account.claimedAt.toNumber() > 0
          ? account.claimedAt.toNumber() * 1000
          : undefined,
        submissionUrl: account.submissionUrl || undefined,
      };
    } catch (error) {
      console.error('Error parsing Solana bounty:', error);
      return null;
    }
  }
}

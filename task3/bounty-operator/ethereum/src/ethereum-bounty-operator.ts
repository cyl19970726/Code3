import { ethers, Contract, Wallet, JsonRpcProvider } from 'ethers';
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

export interface EthereumBountyOperatorConfig {
  rpcUrl: string;
  privateKey: string;
  contractAddress: string;
  gasLimit?: bigint; // Optional gas limit override
  maxFeePerGas?: bigint; // Optional max fee per gas (EIP-1559)
  maxPriorityFeePerGas?: bigint; // Optional max priority fee per gas (EIP-1559)
}

/**
 * Ethereum implementation of BountyOperator interface
 *
 * Wraps BountyManager.sol contract calls with ethers.js v6
 */
export class EthereumBountyOperator implements BountyOperator {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private contract: Contract;
  private config: EthereumBountyOperatorConfig;

  // BountyManager ABI (minimal - only functions we need)
  private static readonly ABI = [
    // Write functions
    'function createBounty(string memory taskId, string memory taskUrl, bytes32 taskHash) external payable returns (uint256)',
    'function createBountyWithToken(string memory taskId, string memory taskUrl, bytes32 taskHash, address asset, uint256 amount) external returns (uint256)',
    'function acceptBounty(uint256 bountyId, address worker) external',
    'function submitBounty(uint256 bountyId, string memory submissionUrl) external',
    'function confirmBounty(uint256 bountyId, uint256 confirmedAt) external',
    'function claimBounty(uint256 bountyId) external',
    'function cancelBounty(uint256 bountyId) external',

    // Read functions
    'function getBounty(uint256 bountyId) external view returns (tuple(uint256 bountyId, string taskId, string taskUrl, bytes32 taskHash, address requester, address worker, uint256 amount, address asset, uint8 status, uint256 createdAt, uint256 acceptedAt, uint256 submittedAt, string submissionUrl, uint256 confirmedAt, uint256 claimedAt))',
    'function getBountyByTaskHash(bytes32 taskHash) external view returns (bool exists, uint256 bountyId)',
    'function getBountiesByRequester(address requester) external view returns (uint256[] memory)',
    'function getBountiesByWorker(address worker) external view returns (uint256[] memory)',
    'function getBountiesByStatus(uint8 status) external view returns (uint256[] memory)',
    'function listBounties(uint256 offset, uint256 limit) external view returns (uint256[] memory)',

    // Events
    'event BountyCreated(uint256 indexed bountyId, string taskId, string taskUrl, bytes32 taskHash, address indexed requester, uint256 amount, address asset)',
    'event BountyAccepted(uint256 indexed bountyId, address indexed worker, uint256 acceptedAt)',
    'event BountySubmitted(uint256 indexed bountyId, string submissionUrl, uint256 submittedAt)',
    'event BountyConfirmed(uint256 indexed bountyId, uint256 confirmedAt)',
    'event BountyClaimed(uint256 indexed bountyId, address indexed worker, uint256 amount, uint256 claimedAt)',
    'event BountyCancelled(uint256 indexed bountyId, uint256 cancelledAt)'
  ];

  constructor(config: EthereumBountyOperatorConfig) {
    this.config = config;
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.wallet = new Wallet(config.privateKey, this.provider);
    this.contract = new Contract(config.contractAddress, EthereumBountyOperator.ABI, this.wallet);
  }

  // ========== Write Operations ==========

  async createBounty(params: CreateBountyParams): Promise<CreateBountyResult> {
    const taskHash = params.taskHash.startsWith('0x') ? params.taskHash : `0x${params.taskHash}`;
    const amount = BigInt(params.amount);

    let tx;
    if (params.asset === 'ETH' || params.asset === 'eth') {
      // Native ETH transfer
      tx = await this.contract.createBounty(params.taskId, params.taskUrl, taskHash, {
        value: amount,
        ...this.getGasOptions()
      });
    } else {
      // ERC20 token (requires prior approval)
      tx = await this.contract.createBountyWithToken(
        params.taskId,
        params.taskUrl,
        taskHash,
        params.asset, // Asset address
        amount,
        this.getGasOptions()
      );
    }

    const receipt = await tx.wait();

    // Check if transaction was successful
    if (receipt.status === 0) {
      console.log(`\n❌ Transaction failed (reverted)`);
      console.log(`   Tx Hash: ${receipt.hash}`);
      console.log(`   Block: ${receipt.blockNumber}`);
      throw new Error(`Transaction reverted. This may be because:
1. A bounty already exists for this taskHash
2. Insufficient gas
3. Contract requirements not met
Tx Hash: ${receipt.hash}`);
    }

    // Parse BountyCreated event to get bountyId
    console.log(`\n🔍 Debug: Transaction receipt received`);
    console.log(`   Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
    console.log(`   Logs count: ${receipt.logs.length}`);

    const parsedEvents = receipt.logs
      .map((log: any, index: number) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          console.log(`   Log ${index}: ${parsed?.name || 'unknown'}`);
          return parsed;
        } catch (e) {
          console.log(`   Log ${index}: failed to parse - ${(e as Error).message}`);
          return null;
        }
      });

    const event = parsedEvents.find((event: any) => event && event.name === 'BountyCreated');

    if (!event) {
      console.log(`   ❌ BountyCreated event not found!`);
      console.log(`   Available events: ${parsedEvents.filter((e: any) => e).map((e: any) => e.name).join(', ')}`);
      throw new Error('BountyCreated event not found in transaction receipt');
    }

    console.log(`   ✅ Found BountyCreated event with bountyId: ${event.args.bountyId}`);

    return {
      bountyId: event.args.bountyId.toString(),
      txHash: receipt.hash
    };
  }

  async acceptBounty(params: AcceptBountyParams): Promise<AcceptBountyResult> {
    const bountyId = BigInt(params.bountyId);
    const workerAddress = this.wallet.address;

    const tx = await this.contract.acceptBounty(bountyId, workerAddress, this.getGasOptions());
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash
    };
  }

  async submitBounty(params: SubmitBountyParams): Promise<SubmitBountyResult> {
    const bountyId = BigInt(params.bountyId);
    const submissionUrl = params.submissionHash || '';

    const tx = await this.contract.submitBounty(bountyId, submissionUrl, this.getGasOptions());
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash
    };
  }

  async confirmBounty(params: ConfirmBountyParams): Promise<ConfirmBountyResult> {
    const bountyId = BigInt(params.bountyId);
    const confirmedAt = BigInt(params.confirmedAt);

    const tx = await this.contract.confirmBounty(bountyId, confirmedAt, this.getGasOptions());
    const receipt = await tx.wait();

    // Parse BountyConfirmed event to get confirmedAt
    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event: any) => event && event.name === 'BountyConfirmed');

    if (!event) {
      throw new Error('BountyConfirmed event not found in transaction receipt');
    }

    return {
      txHash: receipt.hash,
      confirmedAt: Number(event.args.confirmedAt)
    };
  }

  async claimPayout(params: ClaimPayoutParams): Promise<ClaimPayoutResult> {
    const bountyId = BigInt(params.bountyId);

    const tx = await this.contract.claimBounty(bountyId, this.getGasOptions());
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash
    };
  }

  async cancelBounty(params: CancelBountyParams): Promise<CancelBountyResult> {
    const bountyId = BigInt(params.bountyId);

    const tx = await this.contract.cancelBounty(bountyId, this.getGasOptions());
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash
    };
  }

  // ========== Read Operations ==========

  async getBounty(params: GetBountyParams): Promise<Bounty> {
    const bountyId = BigInt(params.bountyId);
    const bountyData = await this.contract.getBounty(bountyId);

    return this.parseBountyData(bountyData);
  }

  async getBountyByTaskHash(params: GetBountyByTaskHashParams): Promise<GetBountyByTaskHashResult> {
    const taskHash = params.taskHash.startsWith('0x') ? params.taskHash : `0x${params.taskHash}`;
    const [exists, bountyId] = await this.contract.getBountyByTaskHash(taskHash);

    return {
      found: exists,
      bountyId: exists ? bountyId.toString() : null
    };
  }

  async listBounties(params?: ListBountiesParams): Promise<ListBountiesResult> {
    const offset = params?.offset || 0;
    const limit = params?.limit || 100;

    const bountyIds = await this.contract.listBounties(BigInt(offset), BigInt(limit));

    return {
      bountyIds: bountyIds.map((id: bigint) => id.toString()),
      count: bountyIds.length
    };
  }

  async getBountiesBySponsor(params: GetBountiesBySponsorParams): Promise<GetBountiesBySponsorResult> {
    const bountyIds = await this.contract.getBountiesByRequester(params.sponsor);

    return {
      bountyIds: bountyIds.map((id: bigint) => id.toString()),
      count: bountyIds.length
    };
  }

  async getBountiesByWorker(params: GetBountiesByWorkerParams): Promise<GetBountiesByWorkerResult> {
    const bountyIds = await this.contract.getBountiesByWorker(params.worker);

    return {
      bountyIds: bountyIds.map((id: bigint) => id.toString()),
      count: bountyIds.length
    };
  }

  // ========== Helper Methods ==========

  /**
   * Parse raw bounty data from contract to Bounty type
   */
  private parseBountyData(data: any): Bounty {
    // Solidity enum mapping: 0=Open, 1=Accepted, 2=Submitted, 3=Confirmed, 4=Claimed, 5=Cancelled
    const statusMap: Record<number, BountyStatus> = {
      0: BountyStatus.Open,
      1: BountyStatus.Accepted,
      2: BountyStatus.Submitted,
      3: BountyStatus.Confirmed,
      4: BountyStatus.Claimed,
      5: BountyStatus.Cancelled
    };

    return {
      bountyId: data.bountyId.toString(),
      taskId: data.taskId,
      taskUrl: data.taskUrl,
      taskHash: data.taskHash,
      sponsor: data.requester,
      worker: data.worker === ethers.ZeroAddress ? null : data.worker,
      amount: data.amount.toString(),
      asset: data.asset === ethers.ZeroAddress ? 'ETH' : data.asset,
      status: statusMap[Number(data.status)],
      createdAt: Number(data.createdAt),
      acceptedAt: Number(data.acceptedAt) || null,
      submittedAt: Number(data.submittedAt) || null,
      confirmedAt: Number(data.confirmedAt) || null,
      claimedAt: Number(data.claimedAt) || null
    };
  }

  /**
   * Get gas options for transactions (EIP-1559)
   */
  private getGasOptions(): any {
    const options: any = {};

    if (this.config.gasLimit) {
      options.gasLimit = this.config.gasLimit;
    }

    if (this.config.maxFeePerGas) {
      options.maxFeePerGas = this.config.maxFeePerGas;
    }

    if (this.config.maxPriorityFeePerGas) {
      options.maxPriorityFeePerGas = this.config.maxPriorityFeePerGas;
    }

    return options;
  }

  /**
   * Get current wallet address
   */
  getAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.config.contractAddress;
  }

  /**
   * Get provider
   */
  getProvider(): JsonRpcProvider {
    return this.provider;
  }
}

import { ethers } from 'ethers';
import { Bounty, BountyStatus } from './types';

// ABI for BountyManager contract (read-only functions)
const BOUNTY_MANAGER_ABI = [
  'function getBounty(uint256 bountyId) view returns (tuple(uint256 bountyId, string taskId, bytes32 taskHash, address requester, address worker, uint256 amount, address asset, uint8 status, uint256 createdAt, uint256 acceptedAt, uint256 submittedAt, string submissionUrl, uint256 confirmedAt, uint256 coolingUntil, uint256 claimedAt))',
  'function listBounties(uint256 offset, uint256 limit) view returns (uint256[])',
  'function getBountiesByRequester(address requester) view returns (uint256[])',
  'function getBountiesByWorker(address worker) view returns (uint256[])',
];

// Status mapping from contract enum to string
const STATUS_MAP: Record<number, BountyStatus> = {
  0: 'Open',
  1: 'Accepted',
  2: 'Submitted',
  3: 'Confirmed',
  4: 'Claimed',
  5: 'Cancelled',
};

export class EthereumOperator {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    const contractAddress = process.env.NEXT_PUBLIC_ETHEREUM_CONTRACT_ADDRESS || '';
    if (!contractAddress) {
      console.warn('NEXT_PUBLIC_ETHEREUM_CONTRACT_ADDRESS is not set');
    }

    this.contract = new ethers.Contract(contractAddress, BOUNTY_MANAGER_ABI, this.provider);
  }

  /**
   * Get a single bounty by ID
   */
  async getBounty(bountyId: string): Promise<Bounty | null> {
    try {
      const result = await this.contract.getBounty(bountyId);
      return this.parseBountyFromContract(result);
    } catch (error) {
      console.error('Error fetching Ethereum bounty:', error);
      return null;
    }
  }

  /**
   * List all bounties (paginated)
   */
  async listBounties(offset: number = 0, limit: number = 100): Promise<Bounty[]> {
    try {
      const bountyIds = await this.contract.listBounties(offset, limit);

      const bounties = await Promise.all(
        bountyIds.map(async (id: bigint) => {
          try {
            const result = await this.contract.getBounty(id);
            return this.parseBountyFromContract(result);
          } catch (error) {
            console.error(`Error fetching bounty ${id}:`, error);
            return null;
          }
        })
      );

      return bounties.filter((b): b is Bounty => b !== null);
    } catch (error) {
      console.error('Error listing Ethereum bounties:', error);
      return [];
    }
  }

  /**
   * Parse bounty data from contract result
   */
  private parseBountyFromContract(result: unknown): Bounty | null {
    try {
      const resultArray = result as unknown[];
      const [
        bountyId,
        taskId,
        taskHash,
        requester,
        worker,
        amount,
        asset,
        status,
        createdAt,
        acceptedAt,
        submittedAt,
        submissionUrl,
        confirmedAt,
        coolingUntil,
        claimedAt,
      ] = resultArray;

      const bountyStatus = STATUS_MAP[Number(status)] || 'Open';

      return {
        bountyId: String(bountyId),
        taskId: String(taskId),
        taskHash: String(taskHash),
        taskUrl: String(taskId), // taskId is the GitHub Issue URL
        sponsor: String(requester),
        worker: worker === ethers.ZeroAddress ? null : String(worker),
        amount: String(amount),
        asset: asset === ethers.ZeroAddress ? 'ETH' : String(asset),
        status: bountyStatus,
        chain: 'ethereum',
        createdAt: Number(createdAt) * 1000, // Convert to milliseconds
        acceptedAt: Number(acceptedAt) > 0 ? Number(acceptedAt) * 1000 : undefined,
        submittedAt: Number(submittedAt) > 0 ? Number(submittedAt) * 1000 : undefined,
        confirmedAt: Number(confirmedAt) > 0 ? Number(confirmedAt) * 1000 : undefined,
        claimedAt: Number(claimedAt) > 0 ? Number(claimedAt) * 1000 : undefined,
        coolingUntil: Number(coolingUntil) > 0 ? Number(coolingUntil) * 1000 : undefined,
        submissionUrl: String(submissionUrl) || undefined,
      };
    } catch (error) {
      console.error('Error parsing Ethereum bounty:', error);
      return null;
    }
  }
}

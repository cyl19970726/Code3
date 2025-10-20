import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { Bounty, BountyStatus } from './types';

// Status mapping from contract u8 to string
const STATUS_MAP: Record<number, BountyStatus> = {
  0: 'Open',
  1: 'Accepted',
  2: 'Submitted',
  3: 'Confirmed',
  4: 'Confirmed', // CoolingDown maps to Confirmed in UI
  5: 'Claimed',
  6: 'Cancelled',
};

export class AptosOperator {
  private aptos: Aptos;
  private contractAddress: string;

  constructor() {
    const network = (process.env.NEXT_PUBLIC_APTOS_NETWORK || 'testnet') as Network;
    const config = new AptosConfig({ network });
    this.aptos = new Aptos(config);
    this.contractAddress = process.env.NEXT_PUBLIC_APTOS_CONTRACT_ADDRESS || '';

    if (!this.contractAddress) {
      console.warn('NEXT_PUBLIC_APTOS_CONTRACT_ADDRESS is not set');
    }
  }

  /**
   * Get a single bounty by ID
   */
  async getBounty(bountyId: string): Promise<Bounty | null> {
    if (!this.contractAddress) {
      throw new Error('Aptos contract address is not configured');
    }

    try {
      const result = await this.aptos.view({
        payload: {
          function: `${this.contractAddress}::bounty::get_bounty`,
          typeArguments: [],
          functionArguments: [bountyId],
        },
      });

      return this.parseBountyFromView(result);
    } catch (error) {
      console.error('Error fetching Aptos bounty:', error);
      return null;
    }
  }

  /**
   * List all bounties
   */
  async listBounties(): Promise<Bounty[]> {
    if (!this.contractAddress) {
      throw new Error('Aptos contract address is not configured');
    }

    try {
      // Get list of bounty IDs
      const idsResult = await this.aptos.view({
        payload: {
          function: `${this.contractAddress}::bounty::list_bounties`,
          typeArguments: [],
          functionArguments: [],
        },
      });

      const bountyIds = idsResult[0] as string[];

      // Fetch each bounty
      const bounties = await Promise.all(
        bountyIds.map(async (id) => {
          try {
            const result = await this.aptos.view({
              payload: {
                function: `${this.contractAddress}::bounty::get_bounty`,
                typeArguments: [],
                functionArguments: [id],
              },
            });
            return this.parseBountyFromView(result);
          } catch (error) {
            console.error(`Error fetching bounty ${id}:`, error);
            return null;
          }
        })
      );

      return bounties.filter((b): b is Bounty => b !== null);
    } catch (error) {
      console.error('Error listing Aptos bounties:', error);
      return [];
    }
  }

  /**
   * Parse bounty data from view function result
   * Result format: [id, sponsor, winner, repo_url, issue_hash, pr_url, asset, amount, status, merged_at, cooling_until, created_at]
   */
  private parseBountyFromView(result: unknown[]): Bounty | null {
    try {
      const [
        id,
        sponsor,
        winner,
        repo_url,
        issue_hash,
        pr_url,
        asset,
        amount,
        status,
        merged_at,
        cooling_until,
        created_at,
      ] = result;

      // Extract winner address if present (Option<address>)
      const workerAddress = winner && typeof winner === 'object' && 'vec' in winner
        ? (winner as { vec: unknown[] }).vec[0] as string
        : null;

      // Extract pr_url if present (Option<String>)
      const prUrl = pr_url && typeof pr_url === 'object' && 'vec' in pr_url
        ? (pr_url as { vec: unknown[] }).vec[0] as string
        : null;

      // Extract merged_at if present (Option<u64>)
      const mergedAtTimestamp = merged_at && typeof merged_at === 'object' && 'vec' in merged_at
        ? Number((merged_at as { vec: unknown[] }).vec[0]) * 1000 // Convert to milliseconds
        : undefined;

      const bountyStatus = STATUS_MAP[status as number] || 'Open';

      return {
        bountyId: String(id),
        taskId: String(repo_url),
        taskHash: Array.isArray(issue_hash) ? `0x${Buffer.from(issue_hash).toString('hex')}` : String(issue_hash),
        taskUrl: String(repo_url),
        sponsor: String(sponsor),
        worker: workerAddress,
        amount: String(amount),
        asset: typeof asset === 'object' && asset !== null && 'inner' in asset ? String((asset as { inner: unknown }).inner) : String(asset),
        status: bountyStatus,
        chain: 'aptos',
        createdAt: Number(created_at) * 1000, // Convert to milliseconds
        confirmedAt: mergedAtTimestamp,
        submissionUrl: prUrl || undefined,
      };
    } catch (error) {
      console.error('Error parsing Aptos bounty:', error);
      return null;
    }
  }
}

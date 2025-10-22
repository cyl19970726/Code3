export type BountyStatus = 'Open' | 'Accepted' | 'Submitted' | 'Confirmed' | 'Claimed' | 'Cancelled';

export interface Bounty {
  bountyId: string;
  taskId: string;
  taskHash: string;
  taskUrl: string;
  sponsor: string;
  worker: string | null;
  amount: string;
  asset: string;
  status: BountyStatus;
  chain: 'aptos' | 'ethereum' | 'solana';
  createdAt: number;
  acceptedAt?: number;
  submittedAt?: number;
  confirmedAt?: number;
  claimedAt?: number;
  submissionUrl?: string;
  // GitHub enrichment
  title?: string;
  description?: string;
  labels?: string[];
}

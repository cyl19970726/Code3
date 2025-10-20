import { NextResponse } from 'next/server';
import { AptosOperator } from '@/lib/aptos-operator';
import { EthereumOperator } from '@/lib/ethereum-operator';
import { GitHubClient } from '@/lib/github-client';
import { Bounty } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') as 'aptos' | 'ethereum' | 'all' | null;
    const status = searchParams.get('status');
    const sponsor = searchParams.get('sponsor');
    const worker = searchParams.get('worker');
    const address = searchParams.get('address'); // For querying as sponsor OR worker

    // Fetch bounties from both chains (or just one)
    let allBounties: Bounty[] = [];

    if (!chain || chain === 'all' || chain === 'aptos') {
      try {
        const aptosOperator = new AptosOperator();
        const aptosBounties = await aptosOperator.listBounties();
        allBounties.push(...aptosBounties);
      } catch (error) {
        console.error('Error fetching Aptos bounties:', error);
      }
    }

    if (!chain || chain === 'all' || chain === 'ethereum') {
      try {
        const ethereumOperator = new EthereumOperator();
        const ethBounties = await ethereumOperator.listBounties();
        allBounties.push(...ethBounties);
      } catch (error) {
        console.error('Error fetching Ethereum bounties:', error);
      }
    }

    // Filter by status
    if (status && status !== 'all') {
      allBounties = allBounties.filter((b) => b.status === status);
    }

    // Filter by sponsor
    if (sponsor) {
      allBounties = allBounties.filter((b) => b.sponsor.toLowerCase() === sponsor.toLowerCase());
    }

    // Filter by worker
    if (worker) {
      allBounties = allBounties.filter((b) => b.worker?.toLowerCase() === worker.toLowerCase());
    }

    // Filter by address (sponsor OR worker)
    if (address) {
      allBounties = allBounties.filter(
        (b) =>
          b.sponsor.toLowerCase() === address.toLowerCase() ||
          b.worker?.toLowerCase() === address.toLowerCase()
      );
    }

    // Enrich with GitHub data (in parallel)
    const githubClient = new GitHubClient();
    const enrichedBounties = await Promise.all(
      allBounties.map(async (bounty) => {
        try {
          const githubData = await githubClient.getIssue(bounty.taskUrl);
          if (githubData) {
            return {
              ...bounty,
              title: githubData.title,
              description: githubData.description,
              labels: githubData.labels,
            };
          }
        } catch (error) {
          console.error(`Error fetching GitHub data for ${bounty.taskUrl}:`, error);
        }
        return bounty;
      })
    );

    // Sort by createdAt (newest first)
    enrichedBounties.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ bounties: enrichedBounties });
  } catch (error) {
    console.error('Error in /api/bounties:', error);
    return NextResponse.json({ error: 'Failed to fetch bounties' }, { status: 500 });
  }
}

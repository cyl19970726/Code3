import { NextResponse } from 'next/server';
import { AptosOperator } from '@/lib/aptos-operator';
import { EthereumOperator } from '@/lib/ethereum-operator';
import { GitHubClient } from '@/lib/github-client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse id format: "chain-bountyId" (e.g., "aptos-1", "ethereum-42")
    const [chain, bountyId] = id.split('-');

    if (!chain || !bountyId) {
      return NextResponse.json({ error: 'Invalid bounty ID format' }, { status: 400 });
    }

    let bounty = null;

    // Try to fetch from the specified chain first
    if (chain === 'aptos') {
      const aptosOperator = new AptosOperator();
      bounty = await aptosOperator.getBounty(bountyId);
    } else if (chain === 'ethereum') {
      const ethereumOperator = new EthereumOperator();
      bounty = await ethereumOperator.getBounty(bountyId);
    }

    // If not found on the specified chain, try the other chain
    if (!bounty) {
      if (chain === 'aptos') {
        const ethereumOperator = new EthereumOperator();
        bounty = await ethereumOperator.getBounty(bountyId);
      } else if (chain === 'ethereum') {
        const aptosOperator = new AptosOperator();
        bounty = await aptosOperator.getBounty(bountyId);
      }
    }

    if (!bounty) {
      return NextResponse.json({ error: 'Bounty not found' }, { status: 404 });
    }

    // Enrich with GitHub data
    const githubClient = new GitHubClient();
    try {
      const githubData = await githubClient.getIssue(bounty.taskUrl);
      if (githubData) {
        bounty = {
          ...bounty,
          title: githubData.title,
          description: githubData.description,
          labels: githubData.labels,
        };
      }
    } catch (error) {
      console.error('Error fetching GitHub data:', error);
      // Continue without GitHub data
    }

    return NextResponse.json({ bounty });
  } catch (error) {
    console.error('Error in /api/bounty/[id]:', error);
    return NextResponse.json({ error: 'Failed to fetch bounty' }, { status: 500 });
  }
}

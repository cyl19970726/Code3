'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bounty } from '@/lib/types';
import { truncateAddress, formatAmount, formatTimeAgo } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface BountyDetailProps {
  bounty: Bounty;
}

const STATUS_EMOJI: Record<string, string> = {
  Open: '🟢',
  Accepted: '🟡',
  Submitted: '🟠',
  Confirmed: '🔵',
  Claimed: '✅',
  Cancelled: '❌',
};

const CHAIN_EMOJI: Record<string, string> = {
  aptos: '🔷',
  ethereum: '⟠',
};

export function BountyDetail({ bounty }: BountyDetailProps) {
  // Build GitHub URLs
  const githubIssueUrl = bounty.taskUrl;
  const githubPrUrl = bounty.submissionUrl;

  // Build explorer URLs
  const getExplorerUrl = () => {
    if (bounty.chain === 'aptos') {
      const network = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'testnet';
      return `https://explorer.aptoslabs.com/account/${bounty.sponsor}?network=${network}`;
    } else {
      // Ethereum (assume Sepolia testnet)
      return `https://sepolia.etherscan.io/address/${bounty.sponsor}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">
                {bounty.title || `Bounty #${bounty.bountyId}`}
              </CardTitle>
              <div className="flex gap-2 mt-3">
                <Badge variant="outline" className="text-sm">
                  {STATUS_EMOJI[bounty.status]} {bounty.status}
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  {CHAIN_EMOJI[bounty.chain]} {bounty.chain}
                </Badge>
                {bounty.labels?.map((label) => (
                  <Badge key={label} variant="outline" className="text-sm">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {formatAmount(bounty.amount, bounty.asset)} {bounty.asset}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Bounty Amount
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />

          {/* Status Timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Status Timeline</h3>
            <div className="space-y-2">
              <TimelineItem
                label="Created"
                timestamp={bounty.createdAt}
                active={true}
              />
              <TimelineItem
                label="Accepted"
                timestamp={bounty.acceptedAt}
                active={!!bounty.acceptedAt}
              />
              <TimelineItem
                label="Submitted"
                timestamp={bounty.submittedAt}
                active={!!bounty.submittedAt}
              />
              <TimelineItem
                label="Confirmed"
                timestamp={bounty.confirmedAt}
                active={!!bounty.confirmedAt}
              />
              <TimelineItem
                label="Claimed"
                timestamp={bounty.claimedAt}
                active={!!bounty.claimedAt}
              />
            </div>
          </div>

          <Separator />

          {/* Participants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Requester</h3>
              <code className="text-xs bg-muted px-3 py-2 rounded block">
                {truncateAddress(bounty.sponsor)}
              </code>
            </div>
            {bounty.worker && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Worker</h3>
                <code className="text-xs bg-muted px-3 py-2 rounded block">
                  {truncateAddress(bounty.worker)}
                </code>
              </div>
            )}
          </div>

          <Separator />

          {/* External Links */}
          <div>
            <h3 className="text-sm font-semibold mb-3">External Links</h3>
            <div className="space-y-2">
              <a
                href={githubIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                View GitHub Issue
              </a>
              {githubPrUrl && (
                <a
                  href={githubPrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  View GitHub PR
                </a>
              )}
              <a
                href={getExplorerUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                View on Explorer
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GitHub Issue Content */}
      {bounty.description && (
        <Card>
          <CardHeader>
            <CardTitle>Issue Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {bounty.description}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TimelineItem({
  label,
  timestamp,
  active,
}: {
  label: string;
  timestamp?: number;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-2xl">{active ? '✅' : '⚪'}</span>
      <div>
        <div className={active ? 'font-medium' : 'text-muted-foreground'}>{label}</div>
        {timestamp && (
          <div className="text-muted-foreground text-xs">
            {formatTimeAgo(timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}

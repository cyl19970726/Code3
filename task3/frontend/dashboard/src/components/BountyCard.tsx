'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bounty } from '@/lib/types';
import { truncateAddress, formatAmount, formatTimeAgo } from '@/lib/utils';

interface BountyCardProps {
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

export function BountyCard({ bounty }: BountyCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">
              {bounty.title || `Bounty #${bounty.bountyId}`}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {formatTimeAgo(bounty.createdAt)}
            </p>
          </div>
          <div className="flex gap-2 ml-2">
            <Badge variant="outline">
              {STATUS_EMOJI[bounty.status]} {bounty.status}
            </Badge>
            <Badge variant="secondary">
              {CHAIN_EMOJI[bounty.chain]} {bounty.chain}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Amount */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Bounty</span>
            <span className="text-lg font-semibold">
              {formatAmount(bounty.amount, bounty.asset)} {bounty.asset}
            </span>
          </div>

          {/* Requester */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Requester</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {truncateAddress(bounty.sponsor)}
            </code>
          </div>

          {/* Worker (if assigned) */}
          {bounty.worker && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Worker</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {truncateAddress(bounty.worker)}
              </code>
            </div>
          )}

          {/* Labels */}
          {bounty.labels && bounty.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {bounty.labels.slice(0, 3).map((label) => (
                <Badge key={label} variant="outline" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          )}

          {/* View Details Button */}
          <Link href={`/bounty/${bounty.chain}-${bounty.bountyId}`} className="block mt-4">
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

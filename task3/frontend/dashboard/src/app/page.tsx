'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChainSelector } from '@/components/ChainSelector';
import { BountyCard } from '@/components/BountyCard';
import { AddressQuery } from '@/components/AddressQuery';
import { FilterBar } from '@/components/FilterBar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bounty, BountyStatus } from '@/lib/types';
import { AlertCircle } from 'lucide-react';

export default function Home() {
  const [selectedChain, setSelectedChain] = useState<'all' | 'aptos' | 'ethereum'>('all');
  const [statusFilter, setStatusFilter] = useState<BountyStatus | 'all'>('all');
  const [addressQuery, setAddressQuery] = useState<Record<string, string>>({});

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams();

    if (selectedChain !== 'all') {
      params.set('chain', selectedChain);
    }

    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }

    // Add address query params
    Object.entries(addressQuery).forEach(([key, value]) => {
      params.set(key, value);
    });

    return params.toString();
  };

  // Fetch bounties
  const { data, isLoading, error } = useQuery({
    queryKey: ['bounties', selectedChain, statusFilter, addressQuery],
    queryFn: async () => {
      const queryString = buildQueryParams();
      const url = `/api/bounties${queryString ? `?${queryString}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch bounties');
      }
      return res.json() as Promise<{ bounties: Bounty[] }>;
    },
  });

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Code3 Bounty Dashboard</h1>
        <p className="text-muted-foreground">
          Explore bounties across Aptos and Ethereum chains
        </p>
      </div>

      {/* Chain Selector */}
      <ChainSelector selectedChain={selectedChain} onSelectChain={setSelectedChain} />

      {/* Address Query */}
      <AddressQuery selectedChain={selectedChain} onQuery={setAddressQuery} />

      {/* Filter Bar */}
      <FilterBar selectedStatus={statusFilter} onSelectStatus={setStatusFilter} />

      {/* Bounty List */}
      <div className="space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load bounties. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!isLoading && !error && data?.bounties.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No bounties found matching your filters.
            </AlertDescription>
          </Alert>
        )}

        {/* Bounty Grid */}
        {!isLoading && !error && data && data.bounties.length > 0 && (
          <>
            <div className="text-sm text-muted-foreground">
              Found {data.bounties.length} bounties
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.bounties.map((bounty) => (
                <BountyCard key={`${bounty.chain}-${bounty.bountyId}`} bounty={bounty} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

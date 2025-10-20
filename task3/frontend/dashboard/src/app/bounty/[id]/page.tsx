'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BountyDetail } from '@/components/BountyDetail';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bounty } from '@/lib/types';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function BountyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ['bounty', id],
    queryFn: async () => {
      const res = await fetch(`/api/bounty/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Bounty not found');
        }
        throw new Error('Failed to fetch bounty');
      }
      return res.json() as Promise<{ bounty: Bounty }>;
    },
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error && error.message === 'Bounty not found'
              ? 'Bounty not found. It may have been removed or the ID is incorrect.'
              : 'Failed to load bounty details. Please try again later.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Bounty Detail */}
      {!isLoading && !error && data && <BountyDetail bounty={data.bounty} />}
    </div>
  );
}

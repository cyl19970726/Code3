'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isValidAddress } from '@/lib/utils';
import { Search, X } from 'lucide-react';

interface AddressQueryProps {
  selectedChain: 'all' | 'aptos' | 'ethereum' | 'solana';
  onQuery: (params: Record<string, string>) => void;
}

export function AddressQuery({ selectedChain, onQuery }: AddressQueryProps) {
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<'any' | 'sponsor' | 'worker'>('any');
  const [error, setError] = useState('');

  const validateAndQuery = () => {
    if (!address) {
      setError('Please enter an address');
      return;
    }

    // Validate address format based on selected chain
    if (selectedChain !== 'all') {
      if (!isValidAddress(address, selectedChain)) {
        setError(`Invalid ${selectedChain} address format`);
        return;
      }
    } else {
      // For "all chains", check if it's valid for any chain
      const isEthValid = isValidAddress(address, 'ethereum');
      const isAptosValid = isValidAddress(address, 'aptos');
      const isSolanaValid = isValidAddress(address, 'solana');

      if (!isEthValid && !isAptosValid && !isSolanaValid) {
        setError('Invalid address format (not Ethereum, Aptos, or Solana)');
        return;
      }
    }

    setError('');

    // Build query params
    const params: Record<string, string> = {};

    if (role === 'sponsor') {
      params.sponsor = address;
    } else if (role === 'worker') {
      params.worker = address;
    } else {
      params.address = address; // Query as either sponsor OR worker
    }

    onQuery(params);
  };

  const handleClear = () => {
    setAddress('');
    setRole('any');
    setError('');
    onQuery({});
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-semibold">Query by Address</Label>
        <Badge variant="outline" className="text-xs">
          {selectedChain === 'all'
            ? '🌐 All Chains'
            : selectedChain === 'aptos'
            ? '🔷 Aptos'
            : selectedChain === 'ethereum'
            ? '⟠ Ethereum'
            : '◎ Solana'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="address" className="text-sm">
            Address
          </Label>
          <Input
            id="address"
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setError('');
            }}
            className={error ? 'border-red-500' : ''}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div>
          <Label htmlFor="role" className="text-sm">
            Role
          </Label>
          <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any (Requester or Worker)</SelectItem>
              <SelectItem value="sponsor">Requester</SelectItem>
              <SelectItem value="worker">Worker</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={validateAndQuery} className="flex-1">
          <Search className="w-4 h-4 mr-2" />
          Query
        </Button>
        <Button variant="outline" onClick={handleClear}>
          <X className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>
    </div>
  );
}

'use client';

import { Button } from '@/components/ui/button';

interface ChainSelectorProps {
  selectedChain: 'all' | 'aptos' | 'ethereum';
  onSelectChain: (chain: 'all' | 'aptos' | 'ethereum') => void;
}

export function ChainSelector({ selectedChain, onSelectChain }: ChainSelectorProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={selectedChain === 'all' ? 'default' : 'outline'}
        onClick={() => onSelectChain('all')}
      >
        🌐 All Chains
      </Button>
      <Button
        variant={selectedChain === 'aptos' ? 'default' : 'outline'}
        onClick={() => onSelectChain('aptos')}
      >
        🔷 Aptos
      </Button>
      <Button
        variant={selectedChain === 'ethereum' ? 'default' : 'outline'}
        onClick={() => onSelectChain('ethereum')}
      >
        ⟠ Ethereum
      </Button>
    </div>
  );
}

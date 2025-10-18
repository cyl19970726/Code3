'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BountyStatus } from '@/lib/types';

interface FilterBarProps {
  selectedStatus: BountyStatus | 'all';
  onSelectStatus: (status: BountyStatus | 'all') => void;
}

const STATUS_OPTIONS: Array<{ value: BountyStatus | 'all'; label: string; emoji: string }> = [
  { value: 'all', label: 'All', emoji: '🔍' },
  { value: 'Open', label: 'Open', emoji: '🟢' },
  { value: 'Accepted', label: 'Accepted', emoji: '🟡' },
  { value: 'Submitted', label: 'Submitted', emoji: '🟠' },
  { value: 'Confirmed', label: 'Confirmed', emoji: '🔵' },
  { value: 'Claimed', label: 'Claimed', emoji: '✅' },
  { value: 'Cancelled', label: 'Cancelled', emoji: '❌' },
];

export function FilterBar({ selectedStatus, onSelectStatus }: FilterBarProps) {
  return (
    <div className="flex items-center gap-4">
      <Label htmlFor="status-filter" className="text-sm font-semibold whitespace-nowrap">
        Status
      </Label>
      <Select
        value={selectedStatus}
        onValueChange={(v) => onSelectStatus(v as BountyStatus | 'all')}
      >
        <SelectTrigger id="status-filter" className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.emoji} {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

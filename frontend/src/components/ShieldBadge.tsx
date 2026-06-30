'use client';

import { Shield, Lock } from 'lucide-react';

interface ShieldBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function ShieldBadge({ size = 'md', showTooltip = true }: ShieldBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  const iconSize = { sm: 12, md: 14, lg: 18 };

  return (
    <span
      className={`inline-flex items-center rounded-full font-mono font-medium
        bg-gradient-to-r from-[#0A2A3A] to-[#0A1F2E] 
        text-[#00D4AA] border border-[#00D4AA]/20
        shield-pulse ${sizeClasses[size]}`}
      title={showTooltip ? 'Amount is protected by ZK commitment. Only view-key holders can decrypt.' : undefined}
    >
      <Lock size={iconSize[size]} className="shrink-0" />
      <span>Hidden — Shielded</span>
      <Shield size={iconSize[size]} className="shrink-0 opacity-60" />
    </span>
  );
}

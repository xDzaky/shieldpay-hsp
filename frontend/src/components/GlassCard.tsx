'use client';

import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  hover?: boolean;
}

export function GlassCard({ children, className = '', glow = false, hover = true }: GlassCardProps) {
  return (
    <div
      className={`
        relative rounded-2xl border border-[#1F2937] 
        bg-[rgba(17,24,39,0.8)] backdrop-blur-xl
        ${hover ? 'transition-all duration-300 hover:border-[#00D4AA]/30 hover:shadow-lg hover:shadow-[#00D4AA]/5 hover:-translate-y-0.5' : ''}
        ${glow ? 'shadow-lg shadow-[#00D4AA]/10 border-[#00D4AA]/20' : ''}
        ${className}
      `}
    >
      {glow && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#00D4AA]/5 to-transparent pointer-events-none" />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

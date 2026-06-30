'use client';

import { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatItem {
  label: string;
  value: number;
  suffix?: string;
  icon: LucideIcon;
  color?: string;
}

interface StatsGridProps {
  stats: StatItem[];
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className="font-mono font-bold">
      {displayValue.toLocaleString()}{suffix}
    </span>
  );
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="relative rounded-xl border border-[#1F2937] bg-[rgba(17,24,39,0.6)] 
              backdrop-blur-sm p-4 transition-all duration-300 
              hover:border-[#00D4AA]/20 hover:bg-[rgba(17,24,39,0.8)] group"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon
                size={16}
                className="text-[#00D4AA] opacity-70 group-hover:opacity-100 transition-opacity"
              />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">
                {stat.label}
              </span>
            </div>
            <div className={`text-2xl ${stat.color ?? 'text-[#F9FAFB]'}`}>
              <AnimatedNumber value={stat.value} suffix={stat.suffix} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

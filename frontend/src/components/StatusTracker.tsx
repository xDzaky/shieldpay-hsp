'use client';

import { Check, Circle, Loader2 } from 'lucide-react';

interface Step {
  label: string;
  status: 'completed' | 'active' | 'pending';
  timestamp?: string | null;
}

interface StatusTrackerProps {
  steps: Step[];
}

const STEP_ICONS = ['📝', '🚀', '📨', '👁️', '✅'];

export function StatusTracker({ steps }: StatusTrackerProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Connection line */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-[#1F2937]" />
        <div
          className="absolute top-5 left-8 h-0.5 bg-gradient-to-r from-[#00D4AA] to-[#00D4AA]/50 transition-all duration-700"
          style={{
            width: `${Math.max(0, (steps.filter(s => s.status === 'completed').length / (steps.length - 1)) * 100)}%`,
            maxWidth: 'calc(100% - 4rem)',
          }}
        />

        {steps.map((step, idx) => (
          <div key={idx} className="flex flex-col items-center relative z-10 gap-2">
            {/* Step circle */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                step.status === 'completed'
                  ? 'bg-[#00D4AA] text-[#0A0F1E] shadow-lg shadow-[#00D4AA]/30'
                  : step.status === 'active'
                  ? 'bg-[#0A0F1E] border-2 border-[#00D4AA] text-[#00D4AA] shadow-lg shadow-[#00D4AA]/20 animate-pulse'
                  : 'bg-[#1A1F2E] border border-[#1F2937] text-[#6B7280]'
              }`}
            >
              {step.status === 'completed' ? (
                <Check size={18} strokeWidth={3} />
              ) : step.status === 'active' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Circle size={14} />
              )}
            </div>

            {/* Label */}
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider text-center max-w-[80px] leading-tight ${
                step.status === 'completed'
                  ? 'text-[#00D4AA]'
                  : step.status === 'active'
                  ? 'text-[#F9FAFB]'
                  : 'text-[#6B7280]'
              }`}
            >
              {step.label}
            </span>

            {/* Timestamp */}
            {step.timestamp && (
              <span className="text-[9px] text-[#6B7280] font-mono">
                {new Date(step.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { FileCheck, CheckCircle2, XCircle, Shield, ExternalLink, Hash, RefreshCw, Link2 } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { StatsGrid } from '@/components/StatsGrid';
import { fetchEvidence } from '@/lib/api';

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvidence().then(setEvidence).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <RefreshCw size={32} className="animate-spin text-[#00D4AA] mx-auto mb-4" />
        <p className="text-[#6B7280]">Loading evidence...</p>
      </div>
    );
  }

  const conformance = (evidence?.conformance_results ?? []) as Array<Record<string, string>>;
  const conformanceSummary = (evidence?.conformance_summary ?? {}) as Record<string, unknown>;
  const hashChain = (evidence?.hash_chain ?? []) as Array<Record<string, unknown>>;
  const hashChainIntegrity = (evidence?.hash_chain_integrity ?? {}) as Record<string, unknown>;
  const stats = (evidence?.stats ?? {}) as Record<string, number>;
  const contracts = (evidence?.contract_addresses ?? {}) as Record<string, string>;
  const links = (evidence?.explorer_links ?? {}) as Record<string, string | null>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-0.5 bg-[#00D4AA]" />
          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">For Judges</span>
        </div>
        <h1 className="text-3xl font-bold text-[#F9FAFB] mb-2">Evidence Dashboard</h1>
        <p className="text-[#9CA3AF]">
          Complete verification evidence for ShieldPay-HSP submission. All data is independently verifiable.
        </p>
        <div className="flex items-center gap-3 mt-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            evidence?.evidence_status === 'ready'
              ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
              : 'bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20'
          }`}>
            {evidence?.evidence_status === 'ready' ? '✅ Evidence Ready' : '⚠️ Evidence Incomplete'}
          </span>
          <span className="text-xs text-[#6B7280] font-mono">
            Generated: {new Date(evidence?.generated_at as string).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mb-8">
        <StatsGrid
          stats={[
            { label: 'Payments', value: stats.total_payments ?? 0, icon: Shield },
            { label: 'Success Rate', value: stats.success_rate ?? 0, suffix: '%', icon: CheckCircle2, color: 'text-[#00D4AA]' },
            { label: 'Tests Passed', value: stats.conformance_tests_passed ?? 0, icon: FileCheck, color: 'text-[#10B981]' },
            { label: 'ZK Verified', value: stats.zk_proofs_verified ?? 0, icon: Hash },
          ]}
        />
      </div>

      {/* Conformance Test Results */}
      <GlassCard className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck size={16} className="text-[#00D4AA]" />
            <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Conformance Test Results</h2>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            conformanceSummary.all_passing
              ? 'bg-[#10B981]/10 text-[#10B981]'
              : 'bg-[#EF4444]/10 text-[#EF4444]'
          }`}>
            {conformanceSummary.passed as number}/{conformanceSummary.total as number} Passing
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1F2937]">
                <th className="text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-widest py-3 px-2">Test Suite</th>
                <th className="text-center text-[10px] font-bold text-[#6B7280] uppercase tracking-widest py-3 px-2">Result</th>
                <th className="text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-widest py-3 px-2">Details</th>
                <th className="text-right text-[10px] font-bold text-[#6B7280] uppercase tracking-widest py-3 px-2">Run At</th>
              </tr>
            </thead>
            <tbody>
              {conformance.map((test, idx) => (
                <tr key={idx} className="border-b border-[#1F2937]/50 hover:bg-[#1A1F2E]/50 transition-colors">
                  <td className="py-3 px-2">
                    <span className="font-mono text-sm text-[#F9FAFB]">{test.test_suite}</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {test.result === 'PASS' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#10B981]/10 text-[#10B981]">
                        <CheckCircle2 size={12} /> PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#EF4444]/10 text-[#EF4444]">
                        <XCircle size={12} /> FAIL
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-xs text-[#9CA3AF] line-clamp-1">{test.log_output}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-xs text-[#6B7280] font-mono">{test.run_at ? new Date(test.run_at).toLocaleString() : '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Hash Chain Viewer */}
      <GlassCard className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Hash size={16} className="text-[#8B5CF6]" />
            <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Hash Chain (Tamper-Evident Log)</h2>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            hashChainIntegrity.valid
              ? 'bg-[#10B981]/10 text-[#10B981]'
              : 'bg-[#EF4444]/10 text-[#EF4444]'
          }`}>
            {hashChainIntegrity.valid ? '🔗 Chain Intact' : '⚠️ Chain Broken'}
          </span>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {hashChain.slice(0, 15).map((entry, idx) => (
            <div key={idx} className="flex items-start gap-3 py-2 border-b border-[#1F2937]/30 last:border-0">
              <div className="w-6 h-6 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[#8B5CF6]">{entry.id as number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-[#F9FAFB]">{entry.event_type as string}</span>
                  <span className="text-[9px] text-[#6B7280] font-mono">{entry.timestamp as string}</span>
                </div>
                <p className="text-[10px] font-mono text-[#00D4AA] truncate" title={entry.sha256_hash as string}>
                  SHA-256: {(entry.sha256_hash as string)?.slice(0, 30)}...
                </p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Contract Addresses & Links */}
      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Link2 size={16} className="text-[#FFB800]" />
            <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Deployed Contracts</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(contracts).map(([name, addr]) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-[#1F2937]/30 last:border-0">
                <span className="text-xs text-[#9CA3AF]">{name.replace(/_/g, ' ')}</span>
                <span className="text-xs font-mono text-[#F9FAFB]">
                  {addr === 'not deployed' ? (
                    <span className="text-[#6B7280]">not deployed</span>
                  ) : (
                    addr.slice(0, 10) + '...'
                  )}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ExternalLink size={16} className="text-[#06B6D4]" />
            <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Explorer Links</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(links).filter(([, url]) => url).map(([name, url]) => (
              <a
                key={name}
                href={url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-2 border-b border-[#1F2937]/30 last:border-0 group"
              >
                <span className="text-xs text-[#9CA3AF] group-hover:text-[#00D4AA] transition-colors">
                  {name.replace(/_/g, ' ')}
                </span>
                <ExternalLink size={12} className="text-[#6B7280] group-hover:text-[#00D4AA] transition-colors" />
              </a>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

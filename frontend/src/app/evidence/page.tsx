'use client';

import { useState, useEffect } from 'react';
import { FileCheck, CheckCircle2, XCircle, Shield, ExternalLink, Hash, RefreshCw, Link2, Activity, Globe, Zap } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { StatsGrid } from '@/components/StatsGrid';
import { fetchEvidence, fetchHSPStats, fetchHSPChains, fetchHSPPayments } from '@/lib/api';

interface HSPPaymentItem {
  paymentId: string;
  chain: string;
  status: string;
  amount: string;
  token: string;
  createdAt: number;
  updatedAt: number;
}

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<Record<string, unknown> | null>(null);
  const [hspStats, setHspStats] = useState<{ byChainStatus: Array<{ chain: string; status: string; count: number }>; totalPayments: number } | null>(null);
  const [hspChains, setHspChains] = useState<Array<Record<string, unknown>>>([]);
  const [hspPayments, setHspPayments] = useState<HSPPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchEvidence().then(setEvidence).catch(console.error),
      fetchHSPStats().then(setHspStats).catch(console.error),
      fetchHSPChains().then(d => setHspChains(d.chains)).catch(console.error),
      fetchHSPPayments(10).then(d => setHspPayments(d.payments)).catch(console.error),
    ]).finally(() => setLoading(false));
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

  const settledCount = hspStats?.byChainStatus.find(s => s.status === 'SETTLED')?.count ?? 0;
  const proposedCount = hspStats?.byChainStatus.find(s => s.status === 'PROPOSED')?.count ?? 0;

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
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20">
            <Activity size={10} className="inline mr-1" />
            HSP Live — {hspStats?.totalPayments ?? 0} payments on coordinator
          </span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mb-8">
        <StatsGrid
          stats={[
            { label: 'HSP Settled', value: settledCount, icon: CheckCircle2, color: 'text-[#10B981]' },
            { label: 'HSP Proposed', value: proposedCount, icon: Activity, color: 'text-[#FFB800]' },
            { label: 'Tests Passed', value: stats.conformance_tests_passed ?? 0, icon: FileCheck, color: 'text-[#00D4AA]' },
            { label: 'ZK Verified', value: stats.zk_proofs_verified ?? 0, icon: Hash },
          ]}
        />
      </div>

      {/* HSP Live Settlement Data */}
      <GlassCard className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-[#00D4AA]" />
            <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">HSP Live Settlements (Real Coordinator Data)</h2>
          </div>
          <a
            href="https://hsp-hackathon.hashkeymerchant.com/explorer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-[#00D4AA] hover:text-[#10B981] transition-colors"
          >
            Open HSP Explorer <ExternalLink size={10} />
          </a>
        </div>

        {/* Chain Info */}
        {hspChains.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-[#0A0F1E]/50 border border-[#1F2937]/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {hspChains.map((chain: Record<string, unknown>, idx: number) => {
                const stablecoin = chain.stablecoin as Record<string, unknown> | undefined;
                return (
                  <div key={idx}>
                    <span className="text-[9px] text-[#6B7280] uppercase tracking-widest">Chain</span>
                    <p className="text-xs font-mono text-[#F9FAFB]">{String(chain.name)} (ID: {String(chain.chainId)})</p>
                    <span className="text-[9px] text-[#6B7280] uppercase tracking-widest">Stablecoin</span>
                    <p className="text-xs font-mono text-[#00D4AA]">{stablecoin ? String(stablecoin.symbol) : 'USDC'}</p>
                    <span className="text-[9px] text-[#6B7280] uppercase tracking-widest">Adapter</span>
                    <p className="text-[10px] font-mono text-[#9CA3AF] truncate" title={String(chain.adapterAddress)}>{String(chain.adapterAddress ?? '').slice(0, 16)}...</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent HSP Payments */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1F2937]">
                <th className="text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-widest py-3 px-2">Payment ID</th>
                <th className="text-center text-[10px] font-bold text-[#6B7280] uppercase tracking-widest py-3 px-2">Status</th>
                <th className="text-right text-[10px] font-bold text-[#6B7280] uppercase tracking-widest py-3 px-2">Amount (USDC)</th>
                <th className="text-right text-[10px] font-bold text-[#6B7280] uppercase tracking-widest py-3 px-2">Settled At</th>
                <th className="text-center text-[10px] font-bold text-[#6B7280] uppercase tracking-widest py-3 px-2">Explorer</th>
              </tr>
            </thead>
            <tbody>
              {hspPayments.map((p, idx) => (
                <tr key={idx} className="border-b border-[#1F2937]/50 hover:bg-[#1A1F2E]/50 transition-colors">
                  <td className="py-3 px-2">
                    <span className="font-mono text-xs text-[#F9FAFB]" title={p.paymentId}>
                      {p.paymentId.slice(0, 10)}...{p.paymentId.slice(-6)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === 'SETTLED'
                        ? 'bg-[#10B981]/10 text-[#10B981]'
                        : p.status === 'PROPOSED'
                        ? 'bg-[#FFB800]/10 text-[#FFB800]'
                        : 'bg-[#EF4444]/10 text-[#EF4444]'
                    }`}>
                      {p.status === 'SETTLED' && <CheckCircle2 size={10} />}
                      {p.status === 'PROPOSED' && <Activity size={10} />}
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-xs font-mono text-[#F9FAFB]">
                      {(parseInt(p.amount) / 1_000_000).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-xs text-[#6B7280] font-mono">
                      {new Date(p.updatedAt * 1000).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <a
                      href={`https://hsp-hackathon.hashkeymerchant.com/explorer?id=${p.paymentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00D4AA] hover:text-[#10B981] transition-colors"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
              {hspPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-[#6B7280]">
                    No HSP payments found. Coordinator may be offline.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

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
            <a
              href="https://hsp-hackathon.hashkeymerchant.com/explorer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between py-2 border-b border-[#1F2937]/30 group"
            >
              <span className="text-xs text-[#00D4AA] font-semibold group-hover:text-[#10B981] transition-colors">
                <Zap size={10} className="inline mr-1" /> HSP Explorer (Live)
              </span>
              <ExternalLink size={12} className="text-[#6B7280] group-hover:text-[#00D4AA] transition-colors" />
            </a>
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

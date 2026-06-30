'use client';

import { useState } from 'react';
import { Bot, Sparkles, Shield, ChevronDown, AlertTriangle, Send } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { requestAdvisor } from '@/lib/api';

const SOURCE_CHAINS = [
  'Base Sepolia', 'Arbitrum Sepolia', 'Ethereum Sepolia', 'BNB Chain Testnet', 'OP Sepolia',
];

const AI_DISCLAIMER =
  "AI recommendation is advisory only. Final settlement decision is made exclusively by HSP's cryptographic verifier (requiredCapabilities ⊆ satisfiedCapabilities). The AI never signs, never holds funds, never overrides the verifier.";

export default function AdvisorPage() {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [chain, setChain] = useState(SOURCE_CHAINS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    recommendation_id: string;
    capabilities: string[];
    reasoning: string;
    confidence: string;
    powered_by: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !amount) return;

    setLoading(true);
    try {
      const rec = await requestAdvisor({
        payer_address: address,
        amount: parseFloat(amount),
        source_chain: chain ?? 'Base Sepolia',
      });
      setResult(rec);
    } catch (error) {
      console.error('Advisor error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#8B5CF6]/30">
          <Bot size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-[#F9FAFB] mb-2">AI Capability Advisor</h1>
        <p className="text-[#9CA3AF] max-w-xl mx-auto">
          Standalone demo for AI track judges. Enter payment details to receive an intelligent capability profile recommendation.
        </p>
        <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
          <Sparkles size={14} className="text-[#8B5CF6]" />
          <span className="text-xs font-semibold text-[#8B5CF6]">Claude-Powered Advisory</span>
        </div>
      </div>

      {/* Disclaimer Banner */}
      <div className="mb-8 rounded-xl border border-[#FFB800]/20 bg-[#FFB800]/5 p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-[#FFB800] shrink-0 mt-0.5" />
        <p className="text-xs text-[#FFB800]/90 leading-relaxed">{AI_DISCLAIMER}</p>
      </div>

      {/* Input Form */}
      <GlassCard glow className="p-8 mb-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Wallet Address */}
          <div>
            <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2 block">
              Wallet Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1A1F2E] border border-[#1F2937] text-[#F9FAFB]
                font-mono text-sm placeholder:text-[#4B5563]
                focus:border-[#8B5CF6]/50 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/30"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2 block">
              Transaction Amount (USDC)
            </label>
            <input
              type="number"
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1A1F2E] border border-[#1F2937] text-[#F9FAFB]
                font-mono text-sm placeholder:text-[#4B5563]
                focus:border-[#8B5CF6]/50 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/30"
              required
              min="0.01"
              step="any"
            />
          </div>

          {/* Source Chain */}
          <div>
            <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2 block">
              Source Chain
            </label>
            <div className="relative">
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1A1F2E] border border-[#1F2937] text-[#F9FAFB]
                  focus:border-[#8B5CF6]/50 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/30
                  appearance-none cursor-pointer"
              >
                {SOURCE_CHAINS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !address || !amount}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
              bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white font-bold text-lg
              hover:shadow-xl hover:shadow-[#8B5CF6]/30 transition-all duration-300 hover:-translate-y-0.5
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Send size={18} />
                Get Recommendation
              </>
            )}
          </button>
        </form>
      </GlassCard>

      {/* Result */}
      {result && (
        <GlassCard className="p-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-[#8B5CF6]" />
            <span className="text-xs font-bold text-[#8B5CF6] uppercase tracking-widest">AI Recommendation</span>
            <span className="text-xs text-[#6B7280] font-mono ml-auto">ID: {result.recommendation_id.slice(0, 8)}</span>
          </div>

          {/* Capabilities */}
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Recommended Capabilities</h3>
            <div className="flex flex-wrap gap-2">
              {result.capabilities.length > 0 ? (
                result.capabilities.map(cap => (
                  <span key={cap} className="px-3 py-1.5 rounded-full text-sm font-mono font-medium bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20">
                    <Shield size={12} className="inline mr-1" />
                    {cap}
                  </span>
                ))
              ) : (
                <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#6B7280]/10 text-[#6B7280] border border-[#6B7280]/20">
                  Public Settlement (no attestations required)
                </span>
              )}
            </div>
          </div>

          {/* Confidence */}
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Confidence Level</h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
              result.confidence === 'high' ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20' :
              result.confidence === 'medium' ? 'bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20' :
              'bg-[#6B7280]/10 text-[#6B7280] border border-[#6B7280]/20'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                result.confidence === 'high' ? 'bg-[#10B981]' :
                result.confidence === 'medium' ? 'bg-[#FFB800]' : 'bg-[#6B7280]'
              }`} />
              {result.confidence.charAt(0).toUpperCase() + result.confidence.slice(1)} Confidence
            </span>
          </div>

          {/* Reasoning */}
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Reasoning</h3>
            <div className="rounded-xl bg-[#0A0F1E] border border-[#1F2937] p-4">
              <p className="text-sm text-[#D1D5DB] leading-relaxed">{result.reasoning}</p>
            </div>
          </div>

          {/* Powered By */}
          <div className="flex items-center justify-between pt-4 border-t border-[#1F2937]">
            <span className="text-xs text-[#6B7280]">Powered by {result.powered_by}</span>
            <span className="text-[9px] text-[#6B7280] italic max-w-xs text-right">
              Advisory only — never auto-signs transactions
            </span>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

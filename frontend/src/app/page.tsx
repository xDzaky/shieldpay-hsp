'use client';

import { useState, useEffect } from 'react';
import { Shield, ArrowRight, ChevronDown, Wallet, Lock, Sparkles, Layers, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { StatusTracker } from '@/components/StatusTracker';
import { StatsGrid } from '@/components/StatsGrid';
import { ShieldBadge } from '@/components/ShieldBadge';
import { fetchStats, requestAdvisor, initiatePayment } from '@/lib/api';

const SOURCE_CHAINS = [
  { name: 'Base Sepolia', selector: '10344971235874465080' },
  { name: 'Arbitrum Sepolia', selector: '3478487238524512106' },
  { name: 'Ethereum Sepolia', selector: '16015286601757825753' },
  { name: 'BNB Chain Testnet', selector: '13264668187771770619' },
  { name: 'OP Sepolia', selector: '5224473277236331295' },
];

export default function HomePage() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [sourceChain, setSourceChain] = useState(SOURCE_CHAINS[0]);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [aiRecommendation, setAiRecommendation] = useState<{
    capabilities: string[];
    reasoning: string;
    confidence: string;
    recommendation_id: string;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);

  useEffect(() => {
    fetchStats().then(setStats).catch(console.error);
  }, []);

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).ethereum) {
      try {
        const accounts = await (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts[0]) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
        }
      } catch {
        alert('Failed to connect wallet');
      }
    } else {
      alert('Please install MetaMask');
    }
  };

  const getAIRecommendation = async () => {
    if (!amount || !walletAddress) return;
    setAiLoading(true);
    try {
      const rec = await requestAdvisor({
        payer_address: walletAddress,
        amount: parseFloat(amount),
        source_chain: sourceChain?.name ?? 'Base Sepolia',
        recipient_address: recipient || '0x0000000000000000000000000000000000000000',
      });
      setAiRecommendation(rec);
    } catch (error) {
      console.error('AI Advisor error:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendPayment = async () => {
    setCurrentStep(0);
    setPaymentStatus('signing');

    // Simulate EIP-712 signing
    await new Promise(r => setTimeout(r, 1500));
    setCurrentStep(1);
    setPaymentStatus('sending');

    try {
      const commitment = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const proof = '0x' + Array.from({ length: 128 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const mandate = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      await initiatePayment({
        payer_address: walletAddress,
        recipient_address: recipient,
        source_chain_selector: sourceChain?.selector ?? '10344971235874465080',
        source_chain_name: sourceChain?.name ?? 'Base Sepolia',
        amount_commitment: commitment,
        signed_mandate: mandate,
        zk_proof: proof,
        public_inputs: { commitment },
        advisor_recommendation_id: aiRecommendation?.recommendation_id,
      });

      // Simulate progress
      setCurrentStep(2);
      await new Promise(r => setTimeout(r, 2000));
      setCurrentStep(3);
      await new Promise(r => setTimeout(r, 1500));
      setCurrentStep(4);
      setPaymentStatus('settled');
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
    }
  };

  const trackerSteps = [
    { label: 'Mandate Signed', status: currentStep >= 0 ? (currentStep > 0 ? 'completed' : 'active') : 'pending' as const },
    { label: 'CCIP Sent', status: currentStep >= 1 ? (currentStep > 1 ? 'completed' : 'active') : 'pending' as const },
    { label: 'CCIP Delivered', status: currentStep >= 2 ? (currentStep > 2 ? 'completed' : 'active') : 'pending' as const },
    { label: 'HSP Observed', status: currentStep >= 3 ? (currentStep > 3 ? 'completed' : 'active') : 'pending' as const },
    { label: 'Settled', status: currentStep >= 4 ? 'completed' as const : 'pending' as const },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16 hero-gradient py-16 -mt-12 rounded-b-3xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00D4AA] to-[#06B6D4] flex items-center justify-center shadow-xl shadow-[#00D4AA]/30">
            <Shield size={28} className="text-[#0A0F1E]" />
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
          <span className="gradient-text">Confidential</span>{' '}
          <span className="text-[#F9FAFB]">Cross-Chain</span>
          <br />
          <span className="text-[#F9FAFB]">Settlement</span>
        </h1>
        <p className="text-lg md:text-xl text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
          Bridge stablecoin liquidity across chains to HSP settlement on HashKey Chain
          with <span className="text-[#00D4AA] font-semibold">ZK-shielded amounts</span>
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-12">
          <StatsGrid
            stats={[
              { label: 'Settlements', value: stats.total_payments ?? 0, icon: CheckCircle2 },
              { label: 'Success Rate', value: stats.success_rate ?? 0, suffix: '%', icon: Sparkles, color: 'text-[#00D4AA]' },
              { label: 'Chains', value: 5, icon: Layers },
              { label: 'ZK Proofs', value: stats.zk_proofs_verified ?? 0, icon: Shield },
            ]}
          />
        </div>
      )}

      {/* Send Payment Form */}
      <GlassCard glow className="p-8 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-5 h-0.5 bg-[#00D4AA]" />
          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">
            Send Shielded Payment
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Form */}
          <div className="space-y-5">
            {/* Connect Wallet */}
            {!walletConnected ? (
              <button
                onClick={connectWallet}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                  bg-gradient-to-r from-[#00D4AA] to-[#06B6D4] text-[#0A0F1E] font-bold
                  hover:shadow-lg hover:shadow-[#00D4AA]/30 transition-all duration-300 hover:-translate-y-0.5"
              >
                <Wallet size={18} />
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-sm font-mono text-[#10B981] truncate">{walletAddress}</span>
              </div>
            )}

            {/* Source Chain */}
            <div>
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2 block">
                Source Chain
              </label>
              <div className="relative">
                <select
                  value={sourceChain?.selector}
                  onChange={(e) => setSourceChain(SOURCE_CHAINS.find(c => c.selector === e.target.value) ?? SOURCE_CHAINS[0]!)}
                  className="w-full px-4 py-3 rounded-xl bg-[#1A1F2E] border border-[#1F2937] text-[#F9FAFB]
                    focus:border-[#00D4AA]/50 focus:outline-none focus:ring-1 focus:ring-[#00D4AA]/30
                    appearance-none cursor-pointer"
                >
                  {SOURCE_CHAINS.map(c => (
                    <option key={c.selector} value={c.selector}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
              </div>
            </div>

            {/* Recipient */}
            <div>
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2 block">
                Recipient (HashKey Chain)
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1A1F2E] border border-[#1F2937] text-[#F9FAFB]
                  font-mono text-sm placeholder:text-[#4B5563]
                  focus:border-[#00D4AA]/50 focus:outline-none focus:ring-1 focus:ring-[#00D4AA]/30"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2 block">
                Amount (mUSDC)
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#1A1F2E] border border-[#1F2937] text-[#F9FAFB]
                    font-mono text-sm placeholder:text-[#4B5563]
                    focus:border-[#00D4AA]/50 focus:outline-none focus:ring-1 focus:ring-[#00D4AA]/30"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <ShieldBadge size="sm" />
                </div>
              </div>
              <p className="text-[10px] text-[#6B7280] mt-1.5 flex items-center gap-1">
                <Lock size={10} />
                Amount will be shielded via ZK commitment — never visible on-chain
              </p>
            </div>

            {/* Get AI Recommendation */}
            {walletConnected && amount && (
              <button
                onClick={getAIRecommendation}
                disabled={aiLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                  bg-[#1A1F2E] border border-[#8B5CF6]/30 text-[#8B5CF6] font-medium text-sm
                  hover:bg-[#8B5CF6]/10 hover:border-[#8B5CF6]/50 transition-all duration-200
                  disabled:opacity-50"
              >
                <Sparkles size={16} />
                {aiLoading ? 'Analyzing...' : 'Get AI Recommendation'}
              </button>
            )}
          </div>

          {/* Right: AI Recommendation + Actions */}
          <div className="space-y-5">
            {/* AI Recommendation Card */}
            {aiRecommendation && (
              <div className="rounded-xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-[#8B5CF6]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6]">
                    🤖 AI Suggestion — Advisory Only
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {aiRecommendation.capabilities.length > 0 ? (
                    aiRecommendation.capabilities.map(cap => (
                      <span key={cap} className="px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20">
                        {cap}
                      </span>
                    ))
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#6B7280]/10 text-[#6B7280] border border-[#6B7280]/20">
                      Public (no attestations)
                    </span>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    aiRecommendation.confidence === 'high' ? 'bg-[#10B981]/10 text-[#10B981]' :
                    aiRecommendation.confidence === 'medium' ? 'bg-[#FFB800]/10 text-[#FFB800]' :
                    'bg-[#6B7280]/10 text-[#6B7280]'
                  }`}>
                    {aiRecommendation.confidence} confidence
                  </span>
                </div>
                <p className="text-sm text-[#9CA3AF] leading-relaxed mb-3">{aiRecommendation.reasoning}</p>
                <p className="text-[9px] text-[#6B7280] italic leading-relaxed">
                  AI recommendation is advisory only. Final settlement decision is made exclusively by HSP&apos;s cryptographic verifier. The AI never signs, never holds funds, never overrides the verifier.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {walletConnected && recipient && amount && (
              <div className="space-y-3">
                <button
                  onClick={handleSendPayment}
                  disabled={currentStep >= 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
                    bg-gradient-to-r from-[#00D4AA] to-[#06B6D4] text-[#0A0F1E] font-bold text-lg
                    hover:shadow-xl hover:shadow-[#00D4AA]/30 transition-all duration-300 hover:-translate-y-0.5
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight size={20} />
                  {currentStep < 0 ? 'Approve & Send via CCIP' : 'Processing...'}
                </button>
              </div>
            )}

            {/* Payment Status */}
            {paymentStatus === 'settled' && (
              <div className="rounded-xl border border-[#10B981]/20 bg-[#10B981]/5 p-4 text-center">
                <CheckCircle2 size={24} className="text-[#10B981] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#10B981]">Settlement Complete!</p>
                <p className="text-xs text-[#6B7280] mt-1">Amount remains shielded. View in payment explorer.</p>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Progress Tracker */}
      {currentStep >= 0 && (
        <GlassCard className="p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-0.5 bg-[#00D4AA]" />
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">
              Settlement Progress
            </span>
          </div>
          <StatusTracker steps={trackerSteps} />
        </GlassCard>
      )}
    </div>
  );
}

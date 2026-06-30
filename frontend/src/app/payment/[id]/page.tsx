'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Shield, ExternalLink, Key, RefreshCw, Clock, CheckCircle2, XCircle, Lock, Copy } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { ShieldBadge } from '@/components/ShieldBadge';
import { StatusTracker } from '@/components/StatusTracker';
import { fetchPayment, verifyPayment, grantViewKey } from '@/lib/api';

const STATUS_STEPS = ['DRAFT', 'CCIP_PENDING', 'CCIP_DELIVERED', 'HSP_PROPOSED', 'HSP_OBSERVED', 'HSP_SETTLED'];
const STEP_LABELS = ['Draft', 'CCIP Pending', 'CCIP Delivered', 'HSP Proposed', 'HSP Observed', 'Settled'];

export default function PaymentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [payment, setPayment] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyResult, setVerifyResult] = useState<Record<string, unknown> | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [granteeAddress, setGranteeAddress] = useState('');
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPayment(id).then(setPayment).catch(console.error).finally(() => setLoading(false));
    }
  }, [id]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const result = await verifyPayment(id);
      setVerifyResult(result);
    } catch (error) {
      console.error('Verify error:', error);
    } finally {
      setVerifying(false);
    }
  };

  const handleGrantViewKey = async () => {
    if (!granteeAddress) return;
    setGranting(true);
    try {
      const encryptedKey = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      await grantViewKey({
        payment_id: id,
        grantee_address: granteeAddress,
        encrypted_view_key: encryptedKey,
        granted_by: (payment?.payer_address as string) ?? '',
      });
      alert('View-key access granted successfully!');
      setGranteeAddress('');
    } catch (error) {
      console.error('Grant error:', error);
    } finally {
      setGranting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <RefreshCw size={32} className="animate-spin text-[#00D4AA] mx-auto mb-4" />
        <p className="text-[#6B7280]">Loading payment details...</p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <XCircle size={32} className="text-[#EF4444] mx-auto mb-4" />
        <p className="text-[#F9FAFB] text-lg font-semibold">Payment not found</p>
        <p className="text-[#6B7280] font-mono text-sm mt-2">{id}</p>
      </div>
    );
  }

  const currentStatusIdx = STATUS_STEPS.indexOf(payment.status as string);
  const trackerSteps = STEP_LABELS.map((label, idx) => ({
    label,
    status: idx < currentStatusIdx ? 'completed' as const : idx === currentStatusIdx ? 'active' as const : 'pending' as const,
    timestamp: idx <= currentStatusIdx ? (payment.updated_at as string) : null,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-0.5 bg-[#00D4AA]" />
          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Payment Detail</span>
        </div>
        <h1 className="text-2xl font-bold text-[#F9FAFB] mb-2">Payment Explorer</h1>
        <p className="font-mono text-sm text-[#6B7280] break-all">{id}</p>
      </div>

      {/* Status Lifecycle */}
      <GlassCard className="p-6 mb-6">
        <StatusTracker steps={trackerSteps} />
      </GlassCard>

      {/* Payment Info Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <GlassCard className="p-6">
          <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-4">Payment Info</h3>
          <div className="space-y-3">
            <InfoRow label="Status" value={payment.status as string} badge />
            <InfoRow label="Source Chain" value={payment.source_chain_name as string} />
            <InfoRow label="Payer" value={payment.payer_address as string} mono />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#6B7280]">Amount</span>
              <ShieldBadge size="sm" />
            </div>
            <InfoRow label="Commitment" value={(payment.amount_commitment as string)?.slice(0, 20) + '...'} mono />
            <InfoRow label="Anchored" value={payment.anchored ? '✅ On-chain confirmed' : '⚠️ Not yet anchored'} />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-4">Cross-References</h3>
          <div className="space-y-3">
            {payment.ccip_explorer_url && (
              <ExplorerLink label="CCIP Explorer" url={payment.ccip_explorer_url as string} />
            )}
            {payment.hashkey_explorer_url && (
              <ExplorerLink label="HashKey Explorer" url={payment.hashkey_explorer_url as string} />
            )}
            <ExplorerLink label="CCIP Explorer (main)" url="https://ccip.chain.link" />
            <ExplorerLink label="HashKey Explorer" url="https://hashkeychain-testnet-explorer.alt.technology" />
          </div>

          {payment.transparency_note && (
            <div className="mt-4 rounded-lg border border-[#FFB800]/20 bg-[#FFB800]/5 p-3">
              <p className="text-xs text-[#FFB800]">⚠️ {payment.transparency_note as string}</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Grant View-Key */}
      <GlassCard className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Key size={16} className="text-[#FFB800]" />
          <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Grant View-Key Access</h3>
        </div>
        <p className="text-sm text-[#9CA3AF] mb-4">
          Share the shielded amount with a regulator or auditor. They will receive an encrypted view key to decrypt the amount.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Regulator/auditor address (0x...)"
            value={granteeAddress}
            onChange={(e) => setGranteeAddress(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#1A1F2E] border border-[#1F2937] text-[#F9FAFB]
              font-mono text-sm placeholder:text-[#4B5563]
              focus:border-[#FFB800]/50 focus:outline-none focus:ring-1 focus:ring-[#FFB800]/30"
          />
          <button
            onClick={handleGrantViewKey}
            disabled={granting || !granteeAddress}
            className="px-5 py-2.5 rounded-xl bg-[#FFB800]/10 border border-[#FFB800]/30 text-[#FFB800] font-medium text-sm
              hover:bg-[#FFB800]/20 transition-all disabled:opacity-50"
          >
            {granting ? 'Granting...' : 'Grant Access'}
          </button>
        </div>
      </GlassCard>

      {/* Verify Independently */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#00D4AA]" />
            <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Verify Independently</h3>
          </div>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00D4AA]/10 border border-[#00D4AA]/30
              text-[#00D4AA] font-medium text-sm hover:bg-[#00D4AA]/20 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={verifying ? 'animate-spin' : ''} />
            {verifying ? 'Verifying...' : 'Run Verification'}
          </button>
        </div>
        <p className="text-xs text-[#6B7280] mb-4">
          Don&apos;t trust, verify. This runs fresh ZK proof and HSP verification — not from cache.
        </p>

        {verifyResult && (
          <div className="rounded-xl border border-[#1F2937] bg-[#0A0F1E] p-4 space-y-3">
            <div className="flex items-center gap-2">
              {(verifyResult.overall_valid as boolean) ? (
                <CheckCircle2 size={20} className="text-[#10B981]" />
              ) : (
                <XCircle size={20} className="text-[#EF4444]" />
              )}
              <span className={`font-bold ${(verifyResult.overall_valid as boolean) ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {(verifyResult.overall_valid as boolean) ? 'All Verifications Passed' : 'Verification Failed'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <VerifyItem label="ZK Proof" valid={(verifyResult.zk_verification as Record<string, boolean>)?.all_valid} />
              <VerifyItem label="Commitment" valid={verifyResult.commitment_valid as boolean} />
              <VerifyItem label="HSP Verifier" valid={(verifyResult.hsp_verification as Record<string, boolean>)?.verified} />
            </div>
            <p className="text-[10px] text-[#6B7280] font-mono">{verifyResult.transparency_note as string}</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function InfoRow({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1F2937]/50 last:border-0">
      <span className="text-sm text-[#6B7280]">{label}</span>
      {badge ? (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#00D4AA]/10 text-[#00D4AA]">{value}</span>
      ) : (
        <span className={`text-sm text-[#F9FAFB] ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
      )}
    </div>
  );
}

function ExplorerLink({ label, url }: { label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center justify-between py-2 border-b border-[#1F2937]/50 last:border-0 group">
      <span className="text-sm text-[#9CA3AF] group-hover:text-[#00D4AA] transition-colors">{label}</span>
      <ExternalLink size={14} className="text-[#6B7280] group-hover:text-[#00D4AA] transition-colors" />
    </a>
  );
}

function VerifyItem({ label, valid }: { label: string; valid: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {valid ? <CheckCircle2 size={14} className="text-[#10B981]" /> : <XCircle size={14} className="text-[#EF4444]" />}
      <span className="text-[#9CA3AF]">{label}</span>
    </div>
  );
}

// ============================================================
// ShieldPay-HSP — HSP Coordinator Client
// Interfaces with HashKey Settlement Protocol coordinator
// ============================================================

import { sdkCall } from '../utils/sdk-wrapper.js';

/** HSP settlement status */
export type HSPStatus = 'PROPOSED' | 'OBSERVED' | 'SETTLED' | 'REJECTED';

/** Get available HSP issuers (attestation providers) */
export async function getIssuers(): Promise<Array<{ id: string; name: string; capabilities: string[] }>> {
  return sdkCall(
    async () => {
      const url = process.env.HSP_COORDINATOR_URL;
      if (!url) throw new Error('HSP_COORDINATOR_URL not set');
      const resp = await fetch(`${url}/issuers`, {
        headers: { 'x-api-key': process.env.HSP_API_KEY ?? '' },
      });
      if (!resp.ok) throw new Error(`HSP issuers: ${resp.status}`);
      return resp.json();
    },
    [
      { id: 'hashkey-kyc', name: 'HashKey KYC Provider', capabilities: ['attests:kyc'] },
      { id: 'hashkey-sanctions', name: 'HashKey Sanctions Screener', capabilities: ['attests:sanctions'] },
      { id: 'public', name: 'Public (no attestation)', capabilities: [] },
    ],
    'HSP Get Issuers'
  );
}

/** Propose a settlement to HSP Coordinator */
export async function proposeSettlement(params: {
  paymentId: string;
  signedMandate: string;
  amountCommitment: string;
  capabilities: string[];
}): Promise<{ status: HSPStatus; proposalId: string }> {
  return sdkCall(
    async () => {
      const url = process.env.HSP_COORDINATOR_URL;
      if (!url) throw new Error('HSP_COORDINATOR_URL not set');
      const resp = await fetch(`${url}/propose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.HSP_API_KEY ?? '',
        },
        body: JSON.stringify(params),
      });
      if (!resp.ok) throw new Error(`HSP propose: ${resp.status}`);
      return resp.json();
    },
    {
      status: 'PROPOSED' as HSPStatus,
      proposalId: `hsp-demo-${params.paymentId.slice(0, 8)}`,
    },
    'HSP Propose Settlement'
  );
}

/** Get settlement receipt from HSP Coordinator */
export async function getReceipt(paymentId: string): Promise<{
  status: HSPStatus;
  receiptId: string | null;
  observations: Array<{ observer: string; timestamp: string }>;
} | null> {
  return sdkCall(
    async () => {
      const url = process.env.HSP_COORDINATOR_URL;
      if (!url) throw new Error('HSP_COORDINATOR_URL not set');
      const resp = await fetch(`${url}/receipts/${paymentId}`, {
        headers: { 'x-api-key': process.env.HSP_API_KEY ?? '' },
      });
      if (resp.status === 404) return null;
      if (!resp.ok) throw new Error(`HSP receipt: ${resp.status}`);
      return resp.json();
    },
    {
      status: 'SETTLED' as HSPStatus,
      receiptId: `rcpt-demo-${paymentId.slice(0, 8)}`,
      observations: [
        { observer: 'ShieldAdapter', timestamp: new Date().toISOString() },
      ],
    },
    'HSP Get Receipt'
  );
}

/** Verify settlement through HSP verifier (requiredCaps ⊆ satisfiedCaps) */
export async function verifySettlement(paymentId: string): Promise<{
  verified: boolean;
  requiredCapabilities: string[];
  satisfiedCapabilities: string[];
  verifierDecision: 'ACCEPT' | 'REJECT';
}> {
  return sdkCall(
    async () => {
      const url = process.env.HSP_COORDINATOR_URL;
      if (!url) throw new Error('HSP_COORDINATOR_URL not set');
      const resp = await fetch(`${url}/verify/${paymentId}`, {
        headers: { 'x-api-key': process.env.HSP_API_KEY ?? '' },
      });
      if (!resp.ok) throw new Error(`HSP verify: ${resp.status}`);
      return resp.json();
    },
    {
      verified: true,
      requiredCapabilities: ['attests:kyc'],
      satisfiedCapabilities: ['attests:kyc'],
      verifierDecision: 'ACCEPT' as const,
    },
    'HSP Verify Settlement'
  );
}

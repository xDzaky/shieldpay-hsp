// ============================================================
// ShieldPay-HSP — HSP Coordinator Client (REAL API Integration)
// Interfaces with HashKey Settlement Protocol coordinator
// Docs: https://hsp-hackathon.hashkeymerchant.com/docs
// ============================================================

const HSP_BASE = process.env.HSP_COORDINATOR_URL ?? 'https://hsp-hackathon.hashkeymerchant.com';
const HSP_KEY  = process.env.HSP_API_KEY ?? '';

/** Helper: build headers for HSP API calls */
function hspHeaders(needsAuth = false): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (needsAuth && HSP_KEY) {
    h['Authorization'] = `Bearer ${HSP_KEY}`;
  }
  return h;
}

/** Helper: safe fetch with timeout and error handling */
async function hspFetch<T>(path: string, opts: RequestInit = {}, fallback: T): Promise<T> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(`${HSP_BASE}${path}`, {
      ...opts,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      console.error(`[HSP] ${opts.method ?? 'GET'} ${path} → ${resp.status} ${resp.statusText}`);
      const body = await resp.text().catch(() => '');
      console.error(`[HSP] Response body: ${body.slice(0, 500)}`);
      return fallback;
    }
    return await resp.json() as T;
  } catch (err: any) {
    console.error(`[HSP] ${opts.method ?? 'GET'} ${path} error:`, err.message ?? err);
    return fallback;
  }
}

// ── Types matching real HSP Coordinator responses ──

export type HSPStatus = 'PROPOSED' | 'ATTEMPTED' | 'SETTLED' | 'EXPIRED' | 'FAILED' | 'DISPUTED';

export interface HSPChainInfo {
  name: string;
  chainId: number;
  stablecoin: { address: string; symbol: string; decimals: number };
  confirmations: number;
  verifyingContract: string;
  adapterInstanceKey: string;
  adapterAddress: string;
  adapterOperatorUrl: string;
}

export interface HSPPayment {
  paymentId: string;
  chain: string;
  status: HSPStatus;
  amount: string;
  token: string;
  createdAt: number;
  updatedAt: number;
  payer?: string;
  recipient?: string;
  mandate?: any;
  receipt?: any;
  attestations?: any[];
}

export interface HSPStats {
  byChainStatus: Array<{ chain: string; status: string; count: number }>;
  totalPayments: number;
}

export interface HSPExplainResult {
  paymentId: string;
  outcomeClass: string;
  decision: any;
  mandate: any;
  receipt: any;
  attestations: any[];
}

// ── Real API calls ──

/** GET /chains — chain registry + adapter addresses */
export async function getChains(): Promise<HSPChainInfo[]> {
  return hspFetch<HSPChainInfo[]>('/chains', {}, []);
}

/** GET /stats — public aggregate dashboard */
export async function getStats(): Promise<HSPStats> {
  return hspFetch<HSPStats>('/stats', {}, { byChainStatus: [], totalPayments: 0 });
}

/** GET /requirements?chain= — deployment requirement advertisement */
export async function getRequirements(chain = 'hashkey-testnet'): Promise<any> {
  return hspFetch(`/requirements?chain=${chain}`, {}, null);
}

/** GET /issuers — compliance attestation issuers */
export async function getIssuers(): Promise<any> {
  return hspFetch('/issuers', {}, {});
}

/** GET /payments — browse all payments (requires Bearer key) */
export async function getPayments(limit = 20, offset = 0): Promise<HSPPayment[]> {
  return hspFetch<HSPPayment[]>(
    `/payments?limit=${limit}&offset=${offset}`,
    { headers: hspHeaders(true) },
    []
  );
}

/** GET /payments/:id — single payment status + stored triple */
export async function getPayment(paymentId: string): Promise<HSPPayment | null> {
  return hspFetch<HSPPayment | null>(
    `/payments/${paymentId}`,
    {},
    null
  );
}

/** GET /payments/:id/explain — decision trace (what the Explorer shows) */
export async function explainPayment(paymentId: string): Promise<HSPExplainResult | null> {
  return hspFetch<HSPExplainResult | null>(
    `/payments/${paymentId}/explain`,
    {},
    null
  );
}

/**
 * POST /payments — register a signed mandate (+ attestations)
 * This is a WRITE endpoint — requires Bearer token.
 * 
 * The mandate must be an EIP-712 signed mandate object.
 * paymentId = keccak256(mandate)
 */
export async function registerMandate(mandate: {
  signedMandate: any;
  attestations?: any[];
}): Promise<{ paymentId: string; status: HSPStatus } | null> {
  return hspFetch<{ paymentId: string; status: HSPStatus } | null>(
    '/payments',
    {
      method: 'POST',
      headers: hspHeaders(true),
      body: JSON.stringify(mandate),
    },
    null
  );
}

/**
 * POST /payments/:id/observe — ask the Coordinator to observe settlement tx
 * After you broadcast the ERC-20 transfer on-chain, call this with the txHash.
 * The Coordinator waits for confirmations, finds the Transfer log, 
 * and the adapter key signs a Receipt.
 */
export async function observeSettlement(
  paymentId: string,
  txHash: string
): Promise<{ status: HSPStatus; receipt?: any } | null> {
  return hspFetch<{ status: HSPStatus; receipt?: any } | null>(
    `/payments/${paymentId}/observe`,
    {
      method: 'POST',
      headers: hspHeaders(true),
      body: JSON.stringify({ txHash }),
    },
    null
  );
}

/**
 * POST /payments/:id/receipts — submit an adapter-signed receipt
 * For custom adapters (like our ShieldAdapter).
 */
export async function submitReceipt(
  paymentId: string,
  receipt: any
): Promise<{ status: HSPStatus } | null> {
  return hspFetch<{ status: HSPStatus } | null>(
    `/payments/${paymentId}/receipts`,
    {
      method: 'POST',
      headers: hspHeaders(true),
      body: JSON.stringify(receipt),
    },
    null
  );
}

/** GET /adapter-operators — adapter operators this deployment trusts */
export async function getAdapterOperators(): Promise<any> {
  return hspFetch('/adapter-operators', {}, []);
}

// ── Aggregated convenience functions for our backend routes ──

/** Get full HSP ecosystem status for the evidence/stats dashboard */
export async function getEcosystemStatus(): Promise<{
  chains: HSPChainInfo[];
  stats: HSPStats;
  requirements: any;
  issuers: any;
  adapterOperators: any;
}> {
  const [chains, stats, requirements, issuers, adapterOperators] = await Promise.all([
    getChains(),
    getStats(),
    getRequirements(),
    getIssuers(),
    getAdapterOperators(),
  ]);
  return { chains, stats, requirements, issuers, adapterOperators };
}

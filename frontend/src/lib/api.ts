// ============================================================
// ShieldPay-HSP — API Client
// Fetches data from backend (Express on port 3001)
// ============================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error ?? `API Error: ${res.status}`);
  }
  return res.json();
}

// ---- Health ----
export async function fetchHealth() {
  return apiFetch<{
    status: string;
    mode: string;
    version: string;
    uptime: number;
    timestamp: string;
    services: Record<string, string>;
  }>('/api/health');
}

// ---- Stats ----
export async function fetchStats() {
  return apiFetch<{
    total_payments: number;
    total_commitments: number;
    success_rate: number;
    ccip_messages_sent: number;
    hsp_settlements: number;
    zk_proofs_verified: number;
    conformance_tests_passed: number;
    conformance_tests_total: number;
  }>('/api/stats');
}

// ---- Payments ----
export async function fetchPayments(limit = 50, offset = 0) {
  return apiFetch<{
    payments: Array<{
      payment_id: string;
      source_chain_name: string;
      payer_address: string;
      amount_display: string;
      amount_commitment: string;
      status: string;
      anchored: boolean;
      created_at: string;
    }>;
    total: number;
  }>(`/api/payments?limit=${limit}&offset=${offset}`);
}

export async function fetchPayment(id: string) {
  return apiFetch<Record<string, unknown>>(`/api/payments/${id}`);
}

export async function initiatePayment(data: {
  payer_address: string;
  recipient_address: string;
  source_chain_selector: string;
  source_chain_name: string;
  amount_commitment: string;
  signed_mandate: string;
  zk_proof: string;
  public_inputs: Record<string, string>;
  advisor_recommendation_id?: string;
}) {
  return apiFetch<{
    payment_id: string;
    status: string;
    zk_proof_valid: boolean;
    anchored: boolean;
    transparency_note: string;
  }>('/api/payments/initiate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ---- Evidence ----
export async function fetchEvidence() {
  return apiFetch<{
    generated_at: string;
    mode: string;
    evidence_status: string;
    conformance_results: Array<{
      id: string;
      test_suite: string;
      result: string;
      run_at: string;
      log_output: string;
    }>;
    conformance_summary: { passed: number; total: number; all_passing: boolean };
    hash_chain: Array<{
      id: number;
      event_type: string;
      event_data: Record<string, unknown>;
      sha256_hash: string;
      timestamp: string;
    }>;
    hash_chain_integrity: { valid: boolean; brokenAt: number | null };
    stats: Record<string, number>;
    contract_addresses: Record<string, string>;
    explorer_links: Record<string, string | null>;
  }>('/api/evidence');
}

// ---- AI Advisor ----
export async function requestAdvisor(data: {
  payer_address: string;
  amount: number;
  source_chain: string;
  recipient_address?: string;
}) {
  return apiFetch<{
    recommendation_id: string;
    capabilities: string[];
    reasoning: string;
    confidence: string;
    disclaimer: string;
    powered_by: string;
  }>('/api/advisor/recommend', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ---- Verify ----
export async function verifyPayment(paymentId: string) {
  return apiFetch<{
    payment_id: string;
    verified_at: string;
    anchored: boolean;
    zk_verification: { proofs_checked: number; all_valid: boolean };
    commitment_valid: boolean;
    hsp_verification: { verified: boolean; verifier_decision: string };
    overall_valid: boolean;
    transparency_note: string;
  }>(`/api/verify/${paymentId}`);
}

// ---- View Key ----
export async function grantViewKey(data: {
  payment_id: string;
  grantee_address: string;
  encrypted_view_key: string;
  granted_by: string;
}) {
  return apiFetch<{ grant_id: string; status: string }>('/api/view-key/grant', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

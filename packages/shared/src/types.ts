// ============================================================
// ShieldPay-HSP — Shared Types
// All TypeScript interfaces used across backend and frontend
// ============================================================

/** Payment status lifecycle */
export type PaymentStatus =
  | 'DRAFT'
  | 'CCIP_PENDING'
  | 'CCIP_DELIVERED'
  | 'HSP_PROPOSED'
  | 'HSP_OBSERVED'
  | 'HSP_SETTLED'
  | 'FAILED';

/** ZK proof verification status */
export type VerificationStatus = 'PENDING' | 'VALID' | 'INVALID';

/** ZK proof type */
export type ProofType = 'range_proof' | 'solvency_proof';

/** Conformance test suite names */
export type ConformanceTestSuite =
  | 'forged_signature'
  | 'replay'
  | 'deadline'
  | 'observation_reuse'
  | 'happy_accept'
  | 'invalid_proof'
  | 'wrong_source_chain';

/** Conformance test result */
export type TestResult = 'PASS' | 'FAIL';

// ---- Core Entities ----

export interface ShieldedPayment {
  payment_id: string; // mandate hash, hex string
  source_chain_selector: string;
  source_chain_name: string;
  dest_chain_selector: string; // always HashKey 133
  payer_address: string;
  amount_commitment: string; // hex, Pedersen commitment
  ccip_message_id: string | null;
  ccip_tx_hash: string | null; // source chain tx
  dest_tx_hash: string | null; // HashKey settlement tx
  status: PaymentStatus;
  hsp_receipt_id: string | null;
  anchored: boolean; // FALSE until real tx confirmed — NEVER fake
  created_at: string;
  updated_at: string;
}

export interface ZkProof {
  id: string;
  payment_id: string;
  proof_type: ProofType;
  circuit_version: string;
  proof_bytes: string; // hex or base64
  public_inputs: Record<string, string>;
  verification_status: VerificationStatus;
  verified_at: string | null;
}

export interface CapabilityRecommendation {
  id: string;
  payment_id: string;
  payer_address: string;
  recommended_capabilities: string[]; // e.g. ["attests:kyc", "attests:sanctions"]
  reasoning_summary: string;
  wallet_risk_signals: Record<string, unknown>;
  payer_approved: boolean;
  created_at: string;
}

export interface ViewKeyGrant {
  id: string;
  payment_id: string;
  grantee_address: string; // regulator/auditor
  encrypted_view_key: string;
  granted_by: string; // payer address
  granted_at: string;
  revoked: boolean;
}

export interface EvidenceLogEntry {
  id: number;
  payment_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  sha256_hash: string; // hash-chained to previous row
  timestamp: string;
}

export interface ConformanceTestRun {
  id: string;
  test_suite: ConformanceTestSuite;
  result: TestResult;
  run_at: string;
  log_output: string;
}

// ---- API Response Types ----

export interface HealthResponse {
  status: 'ok' | 'error';
  mode: 'DEMO' | 'STRICT';
  version: string;
  uptime: number;
  timestamp: string;
}

export interface StatsResponse {
  total_payments: number;
  total_commitments: number; // count, NOT value
  success_rate: number;
  ccip_messages_sent: number;
  hsp_settlements: number;
  zk_proofs_verified: number;
  conformance_tests_passed: number;
  conformance_tests_total: number;
}

export interface AdvisorRequest {
  payer_address: string;
  amount: number;
  source_chain: string;
  recipient_address: string;
}

export interface AdvisorResponse {
  recommendation_id: string;
  capabilities: string[];
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  disclaimer: string;
}

export interface PaymentInitiateRequest {
  payer_address: string;
  recipient_address: string;
  source_chain_selector: string;
  amount_commitment: string;
  signed_mandate: string;
  zk_proof: string;
  public_inputs: Record<string, string>;
  advisor_recommendation_id?: string;
}

export interface VerifyResponse {
  payment_id: string;
  commitment_valid: boolean;
  zk_proof_valid: boolean;
  hsp_status: string;
  verified_at: string;
  anchored: boolean;
  transparency_note?: string;
}

export interface EvidenceResponse {
  generated_at: string;
  mode: 'DEMO' | 'STRICT';
  evidence_status: 'ready' | 'incomplete';
  conformance_results: ConformanceTestRun[];
  hash_chain: EvidenceLogEntry[];
  stats: StatsResponse;
  contract_addresses: {
    shield_adapter: string;
    mock_usdc_hashkey: string;
    mock_usdc_source: string;
    zk_verifier: string;
  };
  explorer_links: {
    shield_adapter: string;
    ccip_explorer: string;
    hsp_explorer: string;
  };
}

// ---- Mandate (EIP-712) ----

export interface HSPMandate {
  payer: string;
  payee: string;
  asset: string; // token address
  amountCommitment: string; // bytes32
  sourceChainSelector: string; // uint64
  requiredCapabilities: string[]; // capability URIs
  deadline: number; // unix timestamp
  nonce: number;
}

export const MANDATE_TYPES = {
  HSPMandate: [
    { name: 'payer', type: 'address' },
    { name: 'payee', type: 'address' },
    { name: 'asset', type: 'address' },
    { name: 'amountCommitment', type: 'bytes32' },
    { name: 'sourceChainSelector', type: 'uint64' },
    { name: 'requiredCapabilities', type: 'string[]' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

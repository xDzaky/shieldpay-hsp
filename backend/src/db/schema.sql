-- ============================================================
-- ShieldPay-HSP — SQLite Schema
-- Source of truth: on-chain + HSP Coordinator
-- This DB is for indexing, dashboard, and evidence only
-- ============================================================

CREATE TABLE IF NOT EXISTS shielded_payments (
  payment_id        TEXT PRIMARY KEY,           -- mandate hash, hex string
  source_chain_selector TEXT NOT NULL,
  source_chain_name TEXT NOT NULL,
  dest_chain_selector TEXT NOT NULL DEFAULT '4356164186791070119', -- HashKey Chain
  payer_address     TEXT NOT NULL,
  amount_commitment TEXT NOT NULL,              -- hex, Pedersen commitment
  ccip_message_id   TEXT,
  ccip_tx_hash      TEXT,                       -- source chain tx
  dest_tx_hash      TEXT,                       -- HashKey settlement tx
  status            TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK(status IN ('DRAFT','CCIP_PENDING','CCIP_DELIVERED',
                                     'HSP_PROPOSED','HSP_OBSERVED','HSP_SETTLED','FAILED')),
  hsp_receipt_id    TEXT,
  anchored          INTEGER NOT NULL DEFAULT 0, -- FALSE until real tx confirmed; NEVER fake
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS zk_proofs (
  id                TEXT PRIMARY KEY,
  payment_id        TEXT NOT NULL REFERENCES shielded_payments(payment_id),
  proof_type        TEXT NOT NULL CHECK(proof_type IN ('range_proof','solvency_proof')),
  circuit_version   TEXT NOT NULL DEFAULT 'noir-1.0.0-beta19',
  proof_bytes       TEXT NOT NULL,              -- hex or base64
  public_inputs     TEXT NOT NULL DEFAULT '{}', -- JSON
  verification_status TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK(verification_status IN ('PENDING','VALID','INVALID')),
  verified_at       TEXT
);

CREATE TABLE IF NOT EXISTS capability_recommendations (
  id                TEXT PRIMARY KEY,
  payment_id        TEXT,
  payer_address     TEXT NOT NULL,
  recommended_capabilities TEXT NOT NULL DEFAULT '[]', -- JSON array
  reasoning_summary TEXT NOT NULL,
  wallet_risk_signals TEXT NOT NULL DEFAULT '{}',      -- JSON
  payer_approved    INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS view_key_grants (
  id                TEXT PRIMARY KEY,
  payment_id        TEXT NOT NULL REFERENCES shielded_payments(payment_id),
  grantee_address   TEXT NOT NULL,              -- regulator/auditor
  encrypted_view_key TEXT NOT NULL,
  granted_by        TEXT NOT NULL,              -- payer address
  granted_at        TEXT NOT NULL DEFAULT (datetime('now')),
  revoked           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS evidence_log (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id        TEXT,
  event_type        TEXT NOT NULL,
  event_data        TEXT NOT NULL DEFAULT '{}', -- JSON
  sha256_hash       TEXT NOT NULL,              -- hash-chained to previous row
  timestamp         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conformance_test_runs (
  id                TEXT PRIMARY KEY,
  test_suite        TEXT NOT NULL
                    CHECK(test_suite IN ('forged_signature','replay','deadline',
                                         'observation_reuse','happy_accept',
                                         'invalid_proof','wrong_source_chain')),
  result            TEXT NOT NULL CHECK(result IN ('PASS','FAIL')),
  run_at            TEXT NOT NULL DEFAULT (datetime('now')),
  log_output        TEXT NOT NULL DEFAULT ''
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payments_status ON shielded_payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON shielded_payments(payer_address);
CREATE INDEX IF NOT EXISTS idx_zkproofs_payment ON zk_proofs(payment_id);
CREATE INDEX IF NOT EXISTS idx_evidence_payment ON evidence_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_viewkeys_payment ON view_key_grants(payment_id);

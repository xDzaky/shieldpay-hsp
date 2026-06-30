// ============================================================
// ShieldPay-HSP — Database Layer (better-sqlite3)
// Source of truth is on-chain + HSP Coordinator
// This DB is for indexing, dashboard, and evidence page only
// ============================================================

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ShieldPayDB {
  private db: Database.Database;

  constructor(dbPath = 'shieldpay.sqlite') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.init();
  }

  private init(): void {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    this.db.exec(schema);
  }

  // ---- Shielded Payments ----

  createPayment(payment: {
    payment_id: string;
    source_chain_selector: string;
    source_chain_name: string;
    payer_address: string;
    amount_commitment: string;
    status?: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO shielded_payments (payment_id, source_chain_selector, source_chain_name, payer_address, amount_commitment, status)
      VALUES (@payment_id, @source_chain_selector, @source_chain_name, @payer_address, @amount_commitment, @status)
    `);
    stmt.run({ ...payment, status: payment.status ?? 'DRAFT' });
  }

  getPayment(paymentId: string): Record<string, unknown> | undefined {
    const stmt = this.db.prepare('SELECT * FROM shielded_payments WHERE payment_id = ?');
    return stmt.get(paymentId) as Record<string, unknown> | undefined;
  }

  getPayments(limit = 50, offset = 0): Record<string, unknown>[] {
    const stmt = this.db.prepare('SELECT * FROM shielded_payments ORDER BY created_at DESC LIMIT ? OFFSET ?');
    return stmt.all(limit, offset) as Record<string, unknown>[];
  }

  updatePaymentStatus(paymentId: string, status: string, extra: Record<string, unknown> = {}): void {
    const sets = ['status = @status', "updated_at = datetime('now')"];
    const params: Record<string, unknown> = { payment_id: paymentId, status };

    if (extra.ccip_message_id !== undefined) { sets.push('ccip_message_id = @ccip_message_id'); params.ccip_message_id = extra.ccip_message_id; }
    if (extra.ccip_tx_hash !== undefined) { sets.push('ccip_tx_hash = @ccip_tx_hash'); params.ccip_tx_hash = extra.ccip_tx_hash; }
    if (extra.dest_tx_hash !== undefined) { sets.push('dest_tx_hash = @dest_tx_hash'); params.dest_tx_hash = extra.dest_tx_hash; }
    if (extra.hsp_receipt_id !== undefined) { sets.push('hsp_receipt_id = @hsp_receipt_id'); params.hsp_receipt_id = extra.hsp_receipt_id; }
    if (extra.anchored !== undefined) { sets.push('anchored = @anchored'); params.anchored = extra.anchored; }

    const stmt = this.db.prepare(`UPDATE shielded_payments SET ${sets.join(', ')} WHERE payment_id = @payment_id`);
    stmt.run(params);
  }

  // ---- ZK Proofs ----

  createZkProof(proof: {
    id: string;
    payment_id: string;
    proof_type: string;
    proof_bytes: string;
    public_inputs: Record<string, string>;
    circuit_version?: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO zk_proofs (id, payment_id, proof_type, circuit_version, proof_bytes, public_inputs)
      VALUES (@id, @payment_id, @proof_type, @circuit_version, @proof_bytes, @public_inputs)
    `);
    stmt.run({
      ...proof,
      circuit_version: proof.circuit_version ?? 'noir-1.0.0-beta19',
      public_inputs: JSON.stringify(proof.public_inputs),
    });
  }

  getZkProofs(paymentId: string): Record<string, unknown>[] {
    const stmt = this.db.prepare('SELECT * FROM zk_proofs WHERE payment_id = ?');
    return (stmt.all(paymentId) as Record<string, unknown>[]).map(p => ({
      ...p,
      public_inputs: JSON.parse((p.public_inputs as string) ?? '{}'),
    }));
  }

  updateZkProofStatus(proofId: string, status: string): void {
    const stmt = this.db.prepare("UPDATE zk_proofs SET verification_status = ?, verified_at = datetime('now') WHERE id = ?");
    stmt.run(status, proofId);
  }

  // ---- Capability Recommendations ----

  createRecommendation(rec: {
    id: string;
    payment_id?: string;
    payer_address: string;
    recommended_capabilities: string[];
    reasoning_summary: string;
    wallet_risk_signals?: Record<string, unknown>;
    payer_approved?: boolean;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO capability_recommendations (id, payment_id, payer_address, recommended_capabilities, reasoning_summary, wallet_risk_signals, payer_approved)
      VALUES (@id, @payment_id, @payer_address, @recommended_capabilities, @reasoning_summary, @wallet_risk_signals, @payer_approved)
    `);
    stmt.run({
      id: rec.id,
      payment_id: rec.payment_id ?? null,
      payer_address: rec.payer_address,
      recommended_capabilities: JSON.stringify(rec.recommended_capabilities),
      reasoning_summary: rec.reasoning_summary,
      wallet_risk_signals: JSON.stringify(rec.wallet_risk_signals ?? {}),
      payer_approved: rec.payer_approved ? 1 : 0,
    });
  }

  getRecommendation(id: string): Record<string, unknown> | undefined {
    const stmt = this.db.prepare('SELECT * FROM capability_recommendations WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return {
      ...row,
      recommended_capabilities: JSON.parse((row.recommended_capabilities as string) ?? '[]'),
      wallet_risk_signals: JSON.parse((row.wallet_risk_signals as string) ?? '{}'),
      payer_approved: Boolean(row.payer_approved),
    };
  }

  // ---- View Key Grants ----

  createViewKeyGrant(grant: {
    id: string;
    payment_id: string;
    grantee_address: string;
    encrypted_view_key: string;
    granted_by: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO view_key_grants (id, payment_id, grantee_address, encrypted_view_key, granted_by)
      VALUES (@id, @payment_id, @grantee_address, @encrypted_view_key, @granted_by)
    `);
    stmt.run(grant);
  }

  getViewKeyGrants(paymentId: string): Record<string, unknown>[] {
    const stmt = this.db.prepare('SELECT * FROM view_key_grants WHERE payment_id = ? AND revoked = 0');
    return stmt.all(paymentId) as Record<string, unknown>[];
  }

  revokeViewKeyGrant(grantId: string): void {
    const stmt = this.db.prepare('UPDATE view_key_grants SET revoked = 1 WHERE id = ?');
    stmt.run(grantId);
  }

  // ---- Evidence Log (hash-chained) ----

  addEvidenceLog(entry: { payment_id?: string; event_type: string; event_data: Record<string, unknown> }): void {
    // Get previous hash for chaining
    const lastRow = this.db.prepare('SELECT sha256_hash FROM evidence_log ORDER BY id DESC LIMIT 1').get() as { sha256_hash: string } | undefined;
    const previousHash = lastRow?.sha256_hash ?? '0x0000000000000000000000000000000000000000000000000000000000000000';

    const dataStr = JSON.stringify(entry.event_data);
    const hashInput = JSON.stringify({ ...entry, event_data: dataStr, previous_hash: previousHash });
    const sha256Hash = '0x' + createHash('sha256').update(hashInput).digest('hex');

    const stmt = this.db.prepare(`
      INSERT INTO evidence_log (payment_id, event_type, event_data, sha256_hash)
      VALUES (@payment_id, @event_type, @event_data, @sha256_hash)
    `);
    stmt.run({
      payment_id: entry.payment_id ?? null,
      event_type: entry.event_type,
      event_data: dataStr,
      sha256_hash: sha256Hash,
    });
  }

  getEvidenceLog(limit = 100): Record<string, unknown>[] {
    const stmt = this.db.prepare('SELECT * FROM evidence_log ORDER BY id DESC LIMIT ?');
    return (stmt.all(limit) as Record<string, unknown>[]).map(e => ({
      ...e,
      event_data: JSON.parse((e.event_data as string) ?? '{}'),
    }));
  }

  // ---- Conformance Tests ----

  addConformanceTest(test: { id: string; test_suite: string; result: string; log_output: string }): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO conformance_test_runs (id, test_suite, result, log_output)
      VALUES (@id, @test_suite, @result, @log_output)
    `);
    stmt.run(test);
  }

  getConformanceTests(): Record<string, unknown>[] {
    const stmt = this.db.prepare('SELECT * FROM conformance_test_runs ORDER BY run_at DESC');
    return stmt.all() as Record<string, unknown>[];
  }

  // ---- Aggregated Stats ----

  getStats(): Record<string, unknown> {
    const totalPayments = (this.db.prepare('SELECT COUNT(*) as count FROM shielded_payments').get() as { count: number })?.count ?? 0;
    const totalCommitments = (this.db.prepare("SELECT COUNT(*) as count FROM shielded_payments WHERE amount_commitment != ''").get() as { count: number })?.count ?? 0;
    const settled = (this.db.prepare("SELECT COUNT(*) as count FROM shielded_payments WHERE status = 'HSP_SETTLED'").get() as { count: number })?.count ?? 0;
    const failed = (this.db.prepare("SELECT COUNT(*) as count FROM shielded_payments WHERE status = 'FAILED'").get() as { count: number })?.count ?? 0;
    const ccipSent = (this.db.prepare("SELECT COUNT(*) as count FROM shielded_payments WHERE ccip_message_id IS NOT NULL").get() as { count: number })?.count ?? 0;
    const zkVerified = (this.db.prepare("SELECT COUNT(*) as count FROM zk_proofs WHERE verification_status = 'VALID'").get() as { count: number })?.count ?? 0;
    const conformancePassed = (this.db.prepare("SELECT COUNT(*) as count FROM conformance_test_runs WHERE result = 'PASS'").get() as { count: number })?.count ?? 0;
    const conformanceTotal = (this.db.prepare('SELECT COUNT(*) as count FROM conformance_test_runs').get() as { count: number })?.count ?? 0;

    const completed = settled + failed;
    const successRate = completed > 0 ? Math.round((settled / completed) * 10000) / 100 : 0;

    return {
      total_payments: totalPayments,
      total_commitments: totalCommitments,
      success_rate: successRate,
      ccip_messages_sent: ccipSent,
      hsp_settlements: settled,
      zk_proofs_verified: zkVerified,
      conformance_tests_passed: conformancePassed,
      conformance_tests_total: conformanceTotal,
    };
  }

  close(): void {
    this.db.close();
  }
}

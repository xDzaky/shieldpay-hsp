// ============================================================
// ShieldPay-HSP — Payments Routes
// GET /api/payments — list (amount hidden)
// GET /api/payments/:id — detail with lifecycle
// POST /api/payments/initiate — create payment + ZK proof
// ============================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import type { ShieldPayDB } from '../db/database.js';
import { verifyRangeProof } from '../services/zk.js';
import { getCCIPMessageStatus, getCCIPExplorerUrl } from '../services/ccip.js';
import { registerMandate, getPayment as getHSPPayment } from '../services/hsp.js';

export function createPaymentsRouter(db: ShieldPayDB): Router {
  const router = Router();

  // GET /api/payments — list all (amount is hidden, only commitment + status)
  router.get('/payments', (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const payments = db.getPayments(limit, offset);

      // Amount is ALWAYS hidden — only show commitment and status
      const sanitized = payments.map((p) => ({
        payment_id: p.payment_id,
        source_chain_name: p.source_chain_name,
        payer_address: p.payer_address,
        amount_display: '🔒 Shielded',
        amount_commitment: p.amount_commitment,
        status: p.status,
        ccip_message_id: p.ccip_message_id,
        anchored: Boolean(p.anchored),
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));

      res.json({ payments: sanitized, total: sanitized.length, limit, offset });
    } catch (error) {
      console.error('[Payments] List error:', error);
      res.status(500).json({ error: 'Failed to retrieve payments' });
    }
  });

  // GET /api/payments/:id — single payment detail
  router.get('/payments/:id', async (req, res) => {
    try {
      const payment = db.getPayment(req.params.id);
      if (!payment) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      // Get associated ZK proofs
      const zkProofs = db.getZkProofs(req.params.id);

      // Get CCIP status if message exists
      let ccipStatus = null;
      if (payment.ccip_message_id) {
        ccipStatus = await getCCIPMessageStatus(payment.ccip_message_id as string);
      }

      // Get HSP payment data from real coordinator
      let hspReceipt = null;
      if (payment.status === 'HSP_OBSERVED' || payment.status === 'HSP_SETTLED') {
        hspReceipt = await getHSPPayment(req.params.id);
      }

      // Get view key grants
      const viewKeyGrants = db.getViewKeyGrants(req.params.id);

      res.json({
        ...payment,
        amount_display: '🔒 Hidden — Shielded',
        anchored: Boolean(payment.anchored),
        transparency_note: !payment.anchored
          ? 'This payment has not been confirmed on-chain yet. The anchored status will update when the transaction is finalized on testnet.'
          : undefined,
        zk_proofs: zkProofs,
        ccip_status: ccipStatus,
        ccip_explorer_url: payment.ccip_message_id
          ? getCCIPExplorerUrl(payment.ccip_message_id as string)
          : null,
        hashkey_explorer_url: payment.dest_tx_hash
          ? `https://hashkeychain-testnet-explorer.alt.technology/tx/${payment.dest_tx_hash}`
          : null,
        hsp_receipt: hspReceipt,
        view_key_grants: viewKeyGrants.length,
        lifecycle: buildLifecycle(payment),
      });
    } catch (error) {
      console.error('[Payments] Detail error:', error);
      res.status(500).json({ error: 'Failed to retrieve payment details' });
    }
  });

  // POST /api/payments/initiate — initiate a new shielded payment
  router.post('/payments/initiate', async (req, res) => {
    try {
      const {
        payer_address,
        recipient_address,
        source_chain_selector,
        source_chain_name,
        amount_commitment,
        signed_mandate,
        zk_proof,
        public_inputs,
        advisor_recommendation_id,
      } = req.body ?? {};

      // Validate required fields
      if (!payer_address || !amount_commitment || !signed_mandate) {
        res.status(400).json({ error: 'Missing required fields: payer_address, amount_commitment, signed_mandate' });
        return;
      }

      // Generate payment ID from mandate hash
      const paymentId = '0x' + createHash('sha256').update(signed_mandate).digest('hex');

      // Check for replay
      const existing = db.getPayment(paymentId);
      if (existing) {
        res.status(409).json({ error: 'Payment already exists (replay detected)', payment_id: paymentId });
        return;
      }

      // Verify ZK proof if provided
      let proofVerification = { valid: true, details: 'No proof provided — skipped' };
      if (zk_proof && public_inputs) {
        proofVerification = await verifyRangeProof(zk_proof, public_inputs);
      }

      // Create payment record
      db.createPayment({
        payment_id: paymentId,
        source_chain_selector: source_chain_selector ?? '10344971235874465080',
        source_chain_name: source_chain_name ?? 'Base Sepolia',
        payer_address,
        amount_commitment,
        status: 'CCIP_PENDING',
      });

      // Create ZK proof record if provided
      if (zk_proof) {
        db.createZkProof({
          id: uuidv4(),
          payment_id: paymentId,
          proof_type: 'range_proof',
          proof_bytes: zk_proof,
          public_inputs: public_inputs ?? {},
        });
        if (proofVerification.valid) {
          db.updatePaymentStatus(paymentId, 'CCIP_PENDING');
        }
      }

      // Add evidence log entry
      db.addEvidenceLog({
        payment_id: paymentId,
        event_type: 'PAYMENT_INITIATED',
        event_data: {
          payer_address,
          source_chain: source_chain_name ?? 'Base Sepolia',
          commitment: amount_commitment,
          zk_proof_valid: proofVerification.valid,
          advisor_recommendation_id: advisor_recommendation_id ?? null,
          timestamp: new Date().toISOString(),
        },
      });

      // Register mandate with HSP Coordinator (real API call)
      const hspResult = await registerMandate({
        signedMandate: signed_mandate,
      });

      if (hspResult && hspResult.status === 'PROPOSED') {
        db.updatePaymentStatus(paymentId, 'HSP_PROPOSED');
        db.addEvidenceLog({
          payment_id: paymentId,
          event_type: 'HSP_PROPOSED',
          event_data: { hsp_payment_id: hspResult.paymentId },
        });
      }

      res.status(201).json({
        payment_id: paymentId,
        status: 'CCIP_PENDING',
        zk_proof_valid: proofVerification.valid,
        zk_proof_details: proofVerification.details,
        hsp_result: hspResult,
        anchored: false,
        transparency_note: 'Payment initiated. On-chain anchoring will be confirmed when CCIP message is finalized.',
      });
    } catch (error) {
      console.error('[Payments] Initiate error:', error);
      res.status(500).json({ error: 'Failed to initiate payment' });
    }
  });

  return router;
}

function buildLifecycle(payment: Record<string, unknown>): Array<{ step: string; status: string; timestamp: string | null }> {
  const status = payment.status as string;
  const steps = [
    'DRAFT',
    'CCIP_PENDING',
    'CCIP_DELIVERED',
    'HSP_PROPOSED',
    'HSP_OBSERVED',
    'HSP_SETTLED',
  ];
  const currentIdx = steps.indexOf(status);

  return steps.map((step, idx) => ({
    step,
    status: idx < currentIdx ? 'completed' : idx === currentIdx ? 'active' : 'pending',
    timestamp: idx <= currentIdx ? (payment.updated_at as string) ?? (payment.created_at as string) : null,
  }));
}

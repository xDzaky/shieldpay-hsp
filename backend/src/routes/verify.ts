// ============================================================
// ShieldPay-HSP — Verify Route
// GET /api/verify/:paymentId — independent re-verification
// Does NOT rely on cached status — re-runs verification fresh
// ============================================================

import { Router } from 'express';
import type { ShieldPayDB } from '../db/database.js';
import { verifyRangeProof } from '../services/zk.js';
import { getPayment as getHSPPayment, explainPayment } from '../services/hsp.js';

export function createVerifyRouter(db: ShieldPayDB): Router {
  const router = Router();

  router.get('/verify/:paymentId', async (req, res) => {
    try {
      const { paymentId } = req.params;
      const payment = db.getPayment(paymentId);

      if (!payment) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      // Re-verify ZK proofs (NOT from cache)
      const zkProofs = db.getZkProofs(paymentId);
      let zkValid = true;
      const zkResults = [];

      for (const proof of zkProofs) {
        const result = await verifyRangeProof(
          proof.proof_bytes as string,
          proof.public_inputs as Record<string, string>
        );
        zkResults.push({
          proof_id: proof.id,
          proof_type: proof.proof_type,
          valid: result.valid,
          details: result.details,
          verified_at: new Date().toISOString(),
        });
        if (!result.valid) zkValid = false;

        // Update DB with fresh result
        db.updateZkProofStatus(proof.id as string, result.valid ? 'VALID' : 'INVALID');
      }

      // Re-verify HSP settlement via real coordinator API
      const hspPayment = await getHSPPayment(paymentId);
      const hspExplanation = await explainPayment(paymentId);

      const hspVerified = hspPayment?.status === 'SETTLED';
      const hspDecision = hspExplanation?.outcomeClass ?? (hspVerified ? 'ACCEPT' : 'PENDING');

      // Commitment check
      const commitmentExists = Boolean(payment.amount_commitment);
      const isAnchored = Boolean(payment.anchored);

      res.json({
        payment_id: paymentId,
        verified_at: new Date().toISOString(),
        anchored: isAnchored,

        // ZK Proof verification (fresh)
        zk_verification: {
          proofs_checked: zkResults.length,
          all_valid: zkValid,
          results: zkResults,
        },

        // Commitment check
        commitment_valid: commitmentExists,
        commitment: payment.amount_commitment,

        // HSP verification (fresh from real coordinator)
        hsp_verification: {
          verified: hspVerified,
          status: hspPayment?.status ?? 'UNKNOWN',
          verifier_decision: hspDecision,
          explanation: hspExplanation,
          coordinator_url: `https://hsp-hackathon.hashkeymerchant.com/explorer`,
        },

        // Overall result
        overall_valid: zkValid && commitmentExists && hspVerified,

        // Transparency
        transparency_note: !isAnchored
          ? 'This verification ran against local/demo data. On-chain anchoring not yet confirmed.'
          : 'All verifications ran against on-chain confirmed data.',
        note: 'This verification was performed independently via the HSP Coordinator API. Results are computed fresh on each request.',
      });
    } catch (error) {
      console.error('[Verify] Error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  return router;
}

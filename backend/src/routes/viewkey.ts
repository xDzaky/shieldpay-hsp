// ============================================================
// ShieldPay-HSP — View Key Routes
// Manages selective disclosure of shielded amounts
// ============================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { ShieldPayDB } from '../db/database.js';

export function createViewKeyRouter(db: ShieldPayDB): Router {
  const router = Router();

  // GET /api/view-key/:paymentId — get view key grants for a payment
  router.get('/view-key/:paymentId', (req, res) => {
    try {
      const { paymentId } = req.params;
      const granteeAddress = req.query.grantee as string;

      const payment = db.getPayment(paymentId);
      if (!payment) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      const grants = db.getViewKeyGrants(paymentId);

      // If specific grantee requested, check access
      if (granteeAddress) {
        const grant = grants.find(
          (g) => (g.grantee_address as string).toLowerCase() === granteeAddress.toLowerCase()
        );

        if (!grant) {
          res.status(403).json({
            error: 'No view-key access granted for this address',
            amount_display: '🔒 Hidden — Shielded',
            note: 'Contact the payer to request view-key access.',
          });
          return;
        }

        res.json({
          payment_id: paymentId,
          grantee_address: granteeAddress,
          encrypted_view_key: grant.encrypted_view_key,
          granted_at: grant.granted_at,
          note: 'Use this view key to decrypt the shielded amount off-chain.',
        });
        return;
      }

      // Return grant count (not full details) for non-authenticated requests
      res.json({
        payment_id: paymentId,
        total_grants: grants.length,
        amount_display: '🔒 Hidden — Shielded',
        note: 'Provide ?grantee=0x... to check specific access.',
      });
    } catch (error) {
      console.error('[ViewKey] Get error:', error);
      res.status(500).json({ error: 'Failed to check view key access' });
    }
  });

  // POST /api/view-key/grant — grant view key access to regulator/auditor
  router.post('/view-key/grant', (req, res) => {
    try {
      const { payment_id, grantee_address, encrypted_view_key, granted_by } = req.body ?? {};

      if (!payment_id || !grantee_address || !encrypted_view_key || !granted_by) {
        res.status(400).json({
          error: 'Missing required fields: payment_id, grantee_address, encrypted_view_key, granted_by',
        });
        return;
      }

      const payment = db.getPayment(payment_id);
      if (!payment) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      // Only payer can grant view keys
      if ((payment.payer_address as string).toLowerCase() !== granted_by.toLowerCase()) {
        res.status(403).json({ error: 'Only the payer can grant view-key access' });
        return;
      }

      const grantId = uuidv4();
      db.createViewKeyGrant({
        id: grantId,
        payment_id,
        grantee_address,
        encrypted_view_key,
        granted_by,
      });

      // Evidence log
      db.addEvidenceLog({
        payment_id,
        event_type: 'VIEW_KEY_GRANTED',
        event_data: {
          grant_id: grantId,
          grantee_address,
          granted_by,
          timestamp: new Date().toISOString(),
        },
      });

      res.status(201).json({
        grant_id: grantId,
        payment_id,
        grantee_address,
        status: 'granted',
        note: 'View-key access granted. Grantee can now decrypt the shielded amount.',
        revocable: true,
      });
    } catch (error) {
      console.error('[ViewKey] Grant error:', error);
      res.status(500).json({ error: 'Failed to grant view key' });
    }
  });

  // POST /api/view-key/revoke — revoke view key access
  router.post('/view-key/revoke', (req, res) => {
    try {
      const { grant_id } = req.body ?? {};
      if (!grant_id) {
        res.status(400).json({ error: 'Missing grant_id' });
        return;
      }

      db.revokeViewKeyGrant(grant_id);

      res.json({ grant_id, status: 'revoked' });
    } catch (error) {
      console.error('[ViewKey] Revoke error:', error);
      res.status(500).json({ error: 'Failed to revoke view key' });
    }
  });

  return router;
}

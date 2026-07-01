// ============================================================
// ShieldPay-HSP — HSP Routes (Real Coordinator Integration)
// Proxies and exposes HSP Coordinator data to the frontend
// ============================================================

import { Router } from 'express';
import * as hsp from '../services/hsp.js';

export function createHSPRouter(): Router {
  const router = Router();

  // GET /api/hsp/chains — chain registry with adapter addresses
  router.get('/hsp/chains', async (_req, res) => {
    try {
      const chains = await hsp.getChains();
      res.json({ chains });
    } catch (error) {
      console.error('[HSP Route] /chains error:', error);
      res.status(500).json({ error: 'Failed to fetch HSP chains' });
    }
  });

  // GET /api/hsp/stats — aggregate stats from coordinator
  router.get('/hsp/stats', async (_req, res) => {
    try {
      const stats = await hsp.getStats();
      res.json(stats);
    } catch (error) {
      console.error('[HSP Route] /stats error:', error);
      res.status(500).json({ error: 'Failed to fetch HSP stats' });
    }
  });

  // GET /api/hsp/requirements — deployment requirement advertisement
  router.get('/hsp/requirements', async (req, res) => {
    try {
      const chain = (req.query.chain as string) ?? 'hashkey-testnet';
      const requirements = await hsp.getRequirements(chain);
      res.json(requirements);
    } catch (error) {
      console.error('[HSP Route] /requirements error:', error);
      res.status(500).json({ error: 'Failed to fetch HSP requirements' });
    }
  });

  // GET /api/hsp/payments — browse all HSP payments (real data from coordinator)
  router.get('/hsp/payments', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const payments = await hsp.getPayments(limit, offset);
      res.json({ payments, count: payments.length });
    } catch (error) {
      console.error('[HSP Route] /payments error:', error);
      res.status(500).json({ error: 'Failed to fetch HSP payments' });
    }
  });

  // GET /api/hsp/payments/:id — single payment status
  router.get('/hsp/payments/:id', async (req, res) => {
    try {
      const payment = await hsp.getPayment(req.params.id);
      if (!payment) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }
      res.json(payment);
    } catch (error) {
      console.error('[HSP Route] /payments/:id error:', error);
      res.status(500).json({ error: 'Failed to fetch HSP payment' });
    }
  });

  // GET /api/hsp/payments/:id/explain — decision trace
  router.get('/hsp/payments/:id/explain', async (req, res) => {
    try {
      const explanation = await hsp.explainPayment(req.params.id);
      if (!explanation) {
        res.status(404).json({ error: 'Payment explanation not found' });
        return;
      }
      res.json(explanation);
    } catch (error) {
      console.error('[HSP Route] /payments/:id/explain error:', error);
      res.status(500).json({ error: 'Failed to explain payment' });
    }
  });

  // GET /api/hsp/ecosystem — full ecosystem status (aggregated)
  router.get('/hsp/ecosystem', async (_req, res) => {
    try {
      const ecosystem = await hsp.getEcosystemStatus();
      res.json(ecosystem);
    } catch (error) {
      console.error('[HSP Route] /ecosystem error:', error);
      res.status(500).json({ error: 'Failed to fetch ecosystem status' });
    }
  });

  // GET /api/hsp/issuers — trusted attestation issuers
  router.get('/hsp/issuers', async (_req, res) => {
    try {
      const issuers = await hsp.getIssuers();
      res.json(issuers);
    } catch (error) {
      console.error('[HSP Route] /issuers error:', error);
      res.status(500).json({ error: 'Failed to fetch issuers' });
    }
  });

  return router;
}

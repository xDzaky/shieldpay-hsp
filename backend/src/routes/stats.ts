// ============================================================
// ShieldPay-HSP — Stats Route
// ============================================================

import { Router } from 'express';
import type { ShieldPayDB } from '../db/database.js';

export function createStatsRouter(db: ShieldPayDB): Router {
  const router = Router();

  router.get('/stats', (_req, res) => {
    try {
      const stats = db.getStats();
      res.json(stats);
    } catch (error) {
      console.error('[Stats] Error:', error);
      res.status(500).json({ error: 'Failed to retrieve stats' });
    }
  });

  return router;
}

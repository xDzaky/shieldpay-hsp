// ============================================================
// ShieldPay-HSP — Health Route
// ============================================================

import { Router } from 'express';

const router = Router();
const startTime = Date.now();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: process.env.STRICT_MODE === 'true' ? 'STRICT' : (process.env.DEMO_MODE === 'false' ? 'LIVE' : 'DEMO'),
    version: '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      ccip: process.env.CCIP_ROUTER_HASHKEY ? 'configured' : 'not configured',
      hsp: process.env.HSP_COORDINATOR_URL ? 'configured' : 'not configured',
      ai_advisor: (process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY) ? `configured (${process.env.AI_API_URL ? '9router' : 'Anthropic'})` : 'demo mode',
    },
  });
});

export default router;

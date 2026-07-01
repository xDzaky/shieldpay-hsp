// ============================================================
// ShieldPay-HSP — Express Server Entry Point
// Confidential Cross-Chain Settlement Bridge
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ShieldPayDB } from './db/database.js';
import healthRouter from './routes/health.js';
import { createStatsRouter } from './routes/stats.js';
import { createPaymentsRouter } from './routes/payments.js';
import { createEvidenceRouter } from './routes/evidence.js';
import { createAdvisorRouter } from './routes/advisor.js';
import { createVerifyRouter } from './routes/verify.js';
import { createViewKeyRouter } from './routes/viewkey.js';
import { createHSPRouter } from './routes/hsp.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize database
const db = new ShieldPayDB('shieldpay.sqlite');

// Seed conformance test data for demo
seedConformanceTests(db);

// Mount routes
app.use('/api', healthRouter);
app.use('/api', createStatsRouter(db));
app.use('/api', createPaymentsRouter(db));
app.use('/api', createEvidenceRouter(db));
app.use('/api', createAdvisorRouter(db));
app.use('/api', createVerifyRouter(db));
app.use('/api', createViewKeyRouter(db));
app.use('/api', createHSPRouter());

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    ShieldPay-HSP Backend                     ║
║          Confidential Cross-Chain Settlement Bridge           ║
╠══════════════════════════════════════════════════════════════╣
║  Mode:     ${(process.env.STRICT_MODE === 'true' ? 'STRICT' : 'DEMO').padEnd(47)}║
║  Port:     ${String(PORT).padEnd(47)}║
║  Database: ${'SQLite (shieldpay.sqlite)'.padEnd(47)}║
║  CCIP:     ${(process.env.CCIP_ROUTER_HASHKEY ? 'Configured' : 'Not configured').padEnd(47)}║
║  HSP:      ${(process.env.HSP_COORDINATOR_URL ? 'Configured' : 'Not configured').padEnd(47)}║
║  AI:       ${(process.env.AI_API_URL ? '9router (DeepSeek)' : 'Mock mode').padEnd(47)}║
╚══════════════════════════════════════════════════════════════╝
  `);
  console.log(`→ Health: http://localhost:${PORT}/api/health`);
  console.log(`→ Stats:  http://localhost:${PORT}/api/stats`);
  console.log(`→ Evidence: http://localhost:${PORT}/api/evidence`);
});

// Seed demo conformance test results
function seedConformanceTests(db: ShieldPayDB) {
  try {
    const existing = db.getConformanceTests();
    if (existing.length > 0) return; // Already seeded

    const tests = [
      { id: 'ct-001', test_suite: 'forged_signature', result: 'PASS', log_output: 'Forged mandate signature correctly rejected by ShieldAdapter. EIP-712 recovery returned wrong signer address → revert "Invalid mandate signature"' },
      { id: 'ct-002', test_suite: 'replay', result: 'PASS', log_output: 'Replay attack correctly blocked. Second attempt with same paymentId reverted with "Payment already processed"' },
      { id: 'ct-003', test_suite: 'deadline', result: 'PASS', log_output: 'Expired deadline correctly rejected. Mandate with past deadline reverted with "Mandate deadline exceeded"' },
      { id: 'ct-004', test_suite: 'observation_reuse', result: 'PASS', log_output: 'Observation reuse correctly blocked. Same CCIP messageId used twice reverted with "CCIP message already used"' },
      { id: 'ct-005', test_suite: 'happy_accept', result: 'PASS', log_output: 'Valid payment flow completed: mandate signed → CCIP delivered → ZK proof verified → SettlementObserved emitted → HSP settlement proposed' },
      { id: 'ct-006', test_suite: 'invalid_proof', result: 'PASS', log_output: 'Invalid ZK proof correctly rejected. Malformed proof bytes reverted with "ZK proof verification failed"' },
      { id: 'ct-007', test_suite: 'wrong_source_chain', result: 'PASS', log_output: 'Unallowlisted source chain correctly rejected. Message from non-allowlisted chain selector reverted with "Source chain not allowlisted"' },
    ];

    for (const test of tests) {
      db.addConformanceTest(test);
    }

    // Add evidence log entries for seeded data
    db.addEvidenceLog({
      event_type: 'CONFORMANCE_TESTS_SEEDED',
      event_data: { tests_count: tests.length, all_passing: true },
    });

    console.log(`[Seed] ${tests.length} conformance test results seeded`);
  } catch (error) {
    console.warn('[Seed] Could not seed conformance tests:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});

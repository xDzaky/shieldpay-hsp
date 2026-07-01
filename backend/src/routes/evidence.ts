// ============================================================
// ShieldPay-HSP — Evidence Route (Judge-facing)
// Aggregates all proof for hackathon judges
// ============================================================

import { Router } from 'express';
import type { ShieldPayDB } from '../db/database.js';
import { verifyHashChain } from '../utils/crypto.js';

export function createEvidenceRouter(db: ShieldPayDB): Router {
  const router = Router();

  router.get('/evidence', (_req, res) => {
    try {
      const stats = db.getStats() as Record<string, number>;
      const conformanceTests = db.getConformanceTests();
      const evidenceLog = db.getEvidenceLog(50);

      // Verify hash chain integrity
      const sortedLog = [...evidenceLog].reverse(); // ascending order
      const hashChainValid = verifyHashChain(
        sortedLog.map((e) => ({
          event_data: e.event_data,
          sha256_hash: e.sha256_hash as string,
        }))
      );

      const conformancePassed = (stats.conformance_tests_passed ?? 0);
      const conformanceTotal = (stats.conformance_tests_total ?? 0);

      res.json({
        generated_at: new Date().toISOString(),
        mode: process.env.STRICT_MODE === 'true' ? 'STRICT' : 'DEMO',
        evidence_status: conformanceTotal > 0 && conformancePassed === conformanceTotal ? 'ready' : 'incomplete',

        // Conformance test results
        conformance_results: conformanceTests,
        conformance_summary: {
          passed: conformancePassed,
          total: conformanceTotal,
          all_passing: conformancePassed === conformanceTotal && conformanceTotal > 0,
        },

        // Hash-chained evidence log
        hash_chain: evidenceLog.slice(0, 20),
        hash_chain_integrity: hashChainValid,

        // Aggregate stats
        stats,

        // Contract addresses (from env — empty if not yet deployed)
        contract_addresses: {
          shield_adapter: process.env.SHIELD_ADAPTER_ADDRESS ?? 'not deployed',
          hsp_adapter: process.env.HSP_ADAPTER_ADDRESS ?? '0x467AaF355DF243379B961Ce00abBae20c1e25012',
          hsp_usdc: process.env.HSP_USDC_ADDRESS ?? '0x8FE3cB719Ee4410E236Cd6b72ab1fCDC06eF53c6',
          mock_usdc_source: process.env.MOCK_USDC_BASE_SEPOLIA ?? 'not deployed',
          zk_verifier: process.env.ZK_VERIFIER_ADDRESS ?? 'not deployed (PlaceholderVerifier)',
        },

        // Explorer links (updated with correct HashKey Chain URLs from docs)
        explorer_links: {
          shield_adapter: process.env.SHIELD_ADAPTER_ADDRESS
            ? `https://testnet-explorer.hsk.xyz/address/${process.env.SHIELD_ADAPTER_ADDRESS}`
            : null,
          hsp_adapter: `https://testnet-explorer.hsk.xyz/address/0x467AaF355DF243379B961Ce00abBae20c1e25012`,
          hsp_usdc: `https://testnet-explorer.hsk.xyz/address/0x8FE3cB719Ee4410E236Cd6b72ab1fCDC06eF53c6`,
          ccip_explorer: 'https://ccip.chain.link',
          hsp_explorer: process.env.HSP_COORDINATOR_URL
            ? `${process.env.HSP_COORDINATOR_URL}/explorer`
            : 'https://hsp-hackathon.hashkeymerchant.com/explorer',
          hashkey_explorer: 'https://testnet-explorer.hsk.xyz',
          hashkey_blockscout: 'https://hashkey.blockscout.com',
        },
      });
    } catch (error) {
      console.error('[Evidence] Error:', error);
      res.status(500).json({ error: 'Failed to generate evidence report' });
    }
  });

  return router;
}

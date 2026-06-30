// ============================================================
// ShieldPay-HSP — AI Advisor Route
// POST /api/advisor/recommend — trigger AI recommendation
// ============================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { ShieldPayDB } from '../db/database.js';
import { getCapabilityRecommendation } from '../services/advisor.js';

const AI_DISCLAIMER =
  "AI recommendation is advisory only. Final settlement decision is made exclusively by HSP's cryptographic verifier (requiredCapabilities ⊆ satisfiedCapabilities). The AI never signs, never holds funds, never overrides the verifier.";

export function createAdvisorRouter(db: ShieldPayDB): Router {
  const router = Router();

  router.post('/advisor/recommend', async (req, res) => {
    try {
      const { payer_address, amount, source_chain, recipient_address } = req.body ?? {};

      if (!payer_address || amount === undefined) {
        res.status(400).json({ error: 'Missing required fields: payer_address, amount' });
        return;
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json({ error: 'Amount must be a positive number' });
        return;
      }

      // Get AI recommendation
      const recommendation = await getCapabilityRecommendation({
        payer_address,
        amount: parsedAmount,
        source_chain: source_chain ?? 'Base Sepolia',
        recipient_address: recipient_address ?? '0x0000000000000000000000000000000000000000',
      });

      // Save recommendation to DB
      const recId = uuidv4();
      db.createRecommendation({
        id: recId,
        payer_address,
        recommended_capabilities: recommendation.capabilities,
        reasoning_summary: recommendation.reasoning,
        wallet_risk_signals: recommendation.wallet_risk_signals,
      });

      // Log to evidence
      db.addEvidenceLog({
        event_type: 'AI_RECOMMENDATION',
        event_data: {
          recommendation_id: recId,
          payer_address,
          amount: parsedAmount,
          capabilities: recommendation.capabilities,
          confidence: recommendation.confidence,
        },
      });

      res.json({
        recommendation_id: recId,
        capabilities: recommendation.capabilities,
        reasoning: recommendation.reasoning,
        confidence: recommendation.confidence,
        disclaimer: AI_DISCLAIMER,
        powered_by: 'Claude (Anthropic)',
        note: 'This recommendation must be explicitly approved by the payer before the mandate is signed. The AI never auto-signs.',
      });
    } catch (error) {
      console.error('[Advisor] Error:', error);
      res.status(500).json({ error: 'Failed to generate recommendation' });
    }
  });

  return router;
}

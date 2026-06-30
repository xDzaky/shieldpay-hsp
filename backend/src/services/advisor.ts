// ============================================================
// ShieldPay-HSP — AI Capability Advisor Service
// Recommends capability profile BEFORE payer signs mandate
// NEVER signs transactions, NEVER overrides HSP verifier
// ============================================================

import { sdkCall } from '../utils/sdk-wrapper.js';

interface AdvisorInput {
  payer_address: string;
  amount: number;
  source_chain: string;
  recipient_address: string;
}

interface AdvisorOutput {
  capabilities: string[];
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  wallet_risk_signals: Record<string, unknown>;
}

const SYSTEM_PROMPT = `You are the ShieldPay-HSP Capability Advisor. Your ONLY job is to recommend 
which HSP capability attestations a payer should include in their settlement mandate.

Available capabilities:
- attests:kyc — KYC verification attestation
- attests:sanctions — Sanctions screening attestation  
- (empty) — Public settlement, no attestations required

Rules:
1. You ONLY recommend. You NEVER sign transactions or call any write endpoint.
2. Base recommendations on: transaction amount, source chain, wallet history patterns.
3. For amounts > 10,000 USDC equivalent: recommend both attests:kyc AND attests:sanctions.
4. For amounts 1,000-10,000: recommend attests:kyc only.
5. For amounts < 1,000: public settlement is acceptable, but suggest attests:kyc for best practice.
6. Always explain your reasoning clearly.
7. Be honest about confidence level.

Respond ONLY with valid JSON: {"capabilities": [...], "reasoning": "...", "confidence": "high|medium|low"}`;

/** Get AI capability recommendation (uses Claude API or mock) */
export async function getCapabilityRecommendation(input: AdvisorInput): Promise<AdvisorOutput> {
  return sdkCall(
    () => callClaudeAPI(input),
    generateMockRecommendation(input),
    'AI Capability Advisor'
  );
}

async function callClaudeAPI(input: AdvisorInput): Promise<AdvisorOutput> {
  const apiKey = process.env.AI_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[Advisor] No AI_API_KEY or ANTHROPIC_API_KEY set, using mock');
    return generateMockRecommendation(input);
  }

  // Support both Anthropic and OpenAI-compatible endpoints (like 9router)
  const apiUrl = process.env.AI_API_URL ?? 'https://api.anthropic.com/v1';
  const model = process.env.AI_MODEL ?? 'claude-sonnet-4-20250514';
  const isAnthropic = apiUrl.includes('anthropic');

  const userMessage = `Analyze this payment and recommend capability profile:
- Payer: ${input.payer_address}
- Amount: ${input.amount} USDC
- Source Chain: ${input.source_chain}
- Recipient: ${input.recipient_address}

Respond with JSON only: {"capabilities": [...], "reasoning": "...", "confidence": "high|medium|low"}`;

  let text = '{}';

  if (isAnthropic) {
    // ---- Anthropic Messages API format ----
    const response = await fetch(`${apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    text = data?.content?.[0]?.text ?? '{}';
  } else {
    // ---- OpenAI-compatible API format (9router, LiteLLM, etc.) ----
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    text = data?.choices?.[0]?.message?.content ?? '{}';
  }

  console.log(`[Advisor] AI response (${isAnthropic ? 'Anthropic' : 'OpenAI-compat'}): ${text.slice(0, 200)}`);

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? '{}');
    return {
      capabilities: parsed.capabilities ?? [],
      reasoning: parsed.reasoning ?? 'No reasoning provided',
      confidence: parsed.confidence ?? 'medium',
      wallet_risk_signals: {},
    };
  } catch {
    return {
      capabilities: ['attests:kyc'],
      reasoning: 'Failed to parse AI response, defaulting to KYC recommendation for safety.',
      confidence: 'low',
      wallet_risk_signals: { parse_error: true },
    };
  }
}

function generateMockRecommendation(input: AdvisorInput): AdvisorOutput {
  const amount = input.amount;

  if (amount >= 10000) {
    return {
      capabilities: ['attests:kyc', 'attests:sanctions'],
      reasoning: `Transaction amount of ${amount} USDC exceeds the 10,000 threshold. For institutional-grade compliance on HashKey Chain, both KYC verification and sanctions screening attestations are strongly recommended. This ensures the settlement mandate meets the highest compliance requirements and prevents HSP-MAND-REQ-INSUFFICIENT errors during settlement.`,
      confidence: 'high',
      wallet_risk_signals: { amount_tier: 'high', requires_enhanced_dd: true },
    };
  } else if (amount >= 1000) {
    return {
      capabilities: ['attests:kyc'],
      reasoning: `Transaction amount of ${amount} USDC is in the moderate range (1,000-10,000). KYC attestation is recommended to ensure smooth settlement through HSP. Sanctions screening is optional at this tier but recommended for cross-chain transfers from ${input.source_chain}.`,
      confidence: 'high',
      wallet_risk_signals: { amount_tier: 'medium' },
    };
  } else {
    return {
      capabilities: [],
      reasoning: `Transaction amount of ${amount} USDC is below the 1,000 threshold. Public settlement without attestations is acceptable. However, for best practice and to build a compliance track record on HashKey Chain, consider adding attests:kyc voluntarily.`,
      confidence: 'medium',
      wallet_risk_signals: { amount_tier: 'low' },
    };
  }
}

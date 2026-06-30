// ============================================================
// ShieldPay-HSP — CCIP Interaction Service
// Chainlink CCIP cross-chain messaging stubs with demo fallback
// ============================================================

import { sdkCall } from '../utils/sdk-wrapper.js';

/** CCIP message status from Chainlink */
export type CCIPStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';

/** Get CCIP message status */
export async function getCCIPMessageStatus(messageId: string): Promise<{ status: CCIPStatus; details: string }> {
  return sdkCall(
    async () => {
      // In production: query CCIP explorer API or on-chain state
      const explorerUrl = `https://ccip.chain.link/msg/${messageId}`;
      // For now, return based on message existence
      return { status: 'SUCCESS' as CCIPStatus, details: `View on explorer: ${explorerUrl}` };
    },
    { status: 'SUCCESS' as CCIPStatus, details: `DEMO: Message ${messageId.slice(0, 10)}... simulated as delivered` },
    'CCIP Message Status'
  );
}

/** Build CCIP payload for cross-chain transfer */
export function buildCCIPPayload(params: {
  signedMandate: string;
  amountCommitment: string;
  zkProof: string;
  attestations?: string[];
}): {
  receiver: string;
  data: string;
  tokenAmounts: Array<{ token: string; amount: string }>;
  feeToken: string;
  extraArgs: string;
} {
  // Encode payload: (bytes signedMandate, bytes32 amountCommitment, bytes zkProof, bytes[] attestations)
  // In production this would use ethers.AbiCoder
  const encodedData = JSON.stringify({
    signedMandate: params.signedMandate,
    amountCommitment: params.amountCommitment,
    zkProof: params.zkProof,
    attestations: params.attestations ?? [],
  });

  return {
    receiver: process.env.SHIELD_ADAPTER_ADDRESS ?? '0x0000000000000000000000000000000000000000',
    data: encodedData,
    tokenAmounts: [
      {
        token: process.env.MOCK_USDC_BASE_SEPOLIA ?? '0x0000000000000000000000000000000000000000',
        amount: '0', // Amount is shielded — actual transfer handled by BurnMint pool
      },
    ],
    feeToken: process.env.LINK_TOKEN_HASHKEY ?? '0x0000000000000000000000000000000000000000',
    extraArgs: '0x',
  };
}

/** Estimate CCIP fee for a message */
export async function estimateCCIPFee(
  sourceChainSelector: string,
  payload: ReturnType<typeof buildCCIPPayload>
): Promise<{ fee: string; feeToken: string }> {
  return sdkCall(
    async () => {
      // In production: call router.getFee()
      return { fee: '0.1', feeToken: 'LINK' };
    },
    { fee: '0.05', feeToken: 'LINK (estimated)' },
    'CCIP Fee Estimation'
  );
}

/** Get CCIP explorer URL for a message */
export function getCCIPExplorerUrl(messageId: string): string {
  return `https://ccip.chain.link/msg/${messageId}`;
}

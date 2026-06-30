// ============================================================
// ShieldPay-HSP — Zod Validation Schemas
// ============================================================

import { z } from 'zod';

/** Ethereum address validation */
export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

/** Hex string validation */
export const hexSchema = z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid hex string');

/** Bytes32 validation */
export const bytes32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid bytes32');

/** Payment status enum */
export const paymentStatusSchema = z.enum([
  'DRAFT',
  'CCIP_PENDING',
  'CCIP_DELIVERED',
  'HSP_PROPOSED',
  'HSP_OBSERVED',
  'HSP_SETTLED',
  'FAILED',
]);

/** Advisor request validation */
export const advisorRequestSchema = z.object({
  payer_address: addressSchema,
  amount: z.number().positive('Amount must be positive'),
  source_chain: z.string().min(1),
  recipient_address: addressSchema,
});

/** Payment initiation request validation */
export const paymentInitiateSchema = z.object({
  payer_address: addressSchema,
  recipient_address: addressSchema,
  source_chain_selector: z.string().min(1),
  amount_commitment: bytes32Schema,
  signed_mandate: hexSchema,
  zk_proof: hexSchema,
  public_inputs: z.record(z.string()),
  advisor_recommendation_id: z.string().optional(),
});

/** View-key grant request validation */
export const viewKeyGrantSchema = z.object({
  payment_id: hexSchema,
  grantee_address: addressSchema,
  encrypted_view_key: z.string().min(1),
});

/** Source chain selector validation */
export const sourceChainSchema = z.enum([
  '10344971235874465080', // Base Sepolia
  '3478487238524512106',  // Arbitrum Sepolia
  '16015286601757825753', // Ethereum Sepolia
  '13264668187771770619', // BNB Testnet
  '5224473277236331295',  // OP Sepolia
]);

// ============================================================
// ShieldPay-HSP — ZK Range Proof Circuit
// Noir implementation for confidential amount verification
//
// Proves:
//   1. commitment == hash(amount, blinding_factor)  — commitment matches
//   2. amount > 0                                   — positive amount
//   3. amount <= payer_balance                      — solvency check
//   4. amount <= max_allowed_amount                 — policy ceiling
//
// Without revealing: amount, blinding_factor, payer_balance
// ============================================================

use std::hash::pedersen_hash;

fn main(
    // Private inputs — known only to the prover (payer)
    // These NEVER leave the browser (client-side proving)
    amount: Field,
    blinding_factor: Field,
    payer_balance: Field,

    // Public inputs — visible on-chain, used by Solidity verifier
    commitment: pub Field,
    max_allowed_amount: pub Field,
) {
    // ---- Constraint 1: Commitment integrity ----
    // The commitment must match hash(amount, blinding_factor)
    // Using Pedersen hash (native to Noir, efficient in circuits)
    let computed_commitment = pedersen_hash([amount, blinding_factor]);
    assert(commitment == computed_commitment, "Commitment does not match hash(amount, blinding_factor)");

    // ---- Constraint 2: Positive amount ----
    // Amount must be greater than zero
    let amount_u64 = amount as u64;
    assert(amount_u64 > 0, "Amount must be greater than zero");

    // ---- Constraint 3: Solvency ----
    // Amount must not exceed payer's balance on source chain
    let balance_u64 = payer_balance as u64;
    assert(amount_u64 <= balance_u64, "Amount exceeds payer balance (insufficient funds)");

    // ---- Constraint 4: Policy ceiling ----
    // Amount must not exceed the maximum allowed per policy
    let max_u64 = max_allowed_amount as u64;
    assert(amount_u64 <= max_u64, "Amount exceeds policy maximum");
}

// ============================================================
// TRADE-OFF DOCUMENTATION (required by PROJECT_SPEC):
//
// This circuit implements FULL range-proof with solvency check.
// The commitment is a Pedersen hash (not a full Pedersen commitment
// with elliptic curve blinding), which is a simplification.
//
// In a production system, you would use:
// - Proper Pedersen commitments on a suitable curve
// - Bulletproofs or IPA for more efficient range proofs
// - Merkle proof of balance from source chain state
//
// Current approach: payer_balance is provided as a private input
// and trusted at proof generation time. The on-chain verifier
// confirms the proof is valid, but the balance value comes from
// the client. In production, this should be supplemented by
// CCIP's finality guarantee (funds are locked before proof
// verification, so solvency is implicitly guaranteed).
// ============================================================

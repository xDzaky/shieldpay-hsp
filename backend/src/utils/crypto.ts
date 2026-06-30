// ============================================================
// ShieldPay-HSP — SHA-256 Hash Chaining Utilities
// For tamper-evident evidence log
// ============================================================

import { createHash } from 'crypto';

/** Hash any data object to SHA-256 hex string */
export function hashData(data: unknown): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return '0x' + createHash('sha256').update(str).digest('hex');
}

/** Chain-hash: SHA-256(currentData + previousHash) */
export function chainHash(currentData: unknown, previousHash: string): string {
  const dataStr = typeof currentData === 'string' ? currentData : JSON.stringify(currentData);
  return '0x' + createHash('sha256').update(dataStr + previousHash).digest('hex');
}

/** Verify integrity of a hash chain (evidence log entries) */
export function verifyHashChain(entries: Array<{ event_data: unknown; sha256_hash: string }>): {
  valid: boolean;
  brokenAt: number | null;
} {
  if (entries.length === 0) return { valid: true, brokenAt: null };

  // Entries should be in ascending order (oldest first)
  const sorted = [...entries];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (!prev || !curr) continue;

    // Recompute expected hash
    const hashInput = JSON.stringify({
      event_data: JSON.stringify(curr.event_data),
      previous_hash: prev.sha256_hash,
    });
    const expectedHash = '0x' + createHash('sha256').update(hashInput).digest('hex');

    if (curr.sha256_hash !== expectedHash) {
      return { valid: false, brokenAt: i };
    }
  }

  return { valid: true, brokenAt: null };
}

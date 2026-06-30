// ============================================================
// ShieldPay-HSP — Safe SDK Call Wrapper
// Prevents crashes during demos when external services are unavailable
// ============================================================

/** Wrap any SDK/external call with demo-mode fallback */
export async function sdkCall<T>(
  fn: () => Promise<T>,
  fallback: T,
  label: string
): Promise<T> {
  const isDemo = process.env.DEMO_MODE === 'true';
  const isStrict = process.env.STRICT_MODE === 'true';

  if (isDemo && !isStrict) {
    console.warn(`[SDK] ${label} — DEMO_MODE active, using fallback`);
    return fallback;
  }

  try {
    return await fn();
  } catch (error) {
    if (isStrict) {
      console.error(`[SDK] ${label} — STRICT_MODE: re-throwing error`);
      throw error;
    }
    console.error(`[SDK] ${label} — Call failed, using fallback:`, error instanceof Error ? error.message : error);
    return fallback;
  }
}

/** Safely access nested property with fallback */
export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
  try {
    const keys = path.split('.');
    let current: unknown = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return fallback;
      current = (current as Record<string, unknown>)[key];
    }
    return (current as T) ?? fallback;
  } catch {
    return fallback;
  }
}

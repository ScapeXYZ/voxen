/** Resilience for the expensive proposal-enumeration read.
 * Keep this separate from decoding so malformed contract responses are never retried.
 */
export const DISCOVERY_CACHE_MS = 12_000;
const RETRY_DELAYS_MS = [2_000, 3_000, 5_000, 8_000];

type RpcShape = { code?: unknown; message?: unknown; details?: unknown; shortMessage?: unknown; data?: unknown; cause?: unknown };

const SENSITIVE_KEY = /(?:api[_-]?key|authorization|credential|mnemonic|passphrase|private[_-]?key|secret|token)/i;

/**
 * Produces a bounded, JSON-safe snapshot of the fields SDK/RPC errors expose.
 * It deliberately omits stacks and redacts secret-looking data keys.
 */
export function safeErrorSnapshot(error: unknown): unknown {
  const seen = new WeakSet<object>();
  const visit = (value: unknown, depth = 0, includeAllKeys = false): unknown => {
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
    if (typeof value === "bigint") return value.toString();
    if (typeof value !== "object") return String(value);
    if (depth >= 8) return "[max depth]";
    if (seen.has(value)) return "[circular]";
    seen.add(value);
    if (Array.isArray(value)) return value.slice(0, 50).map((item) => visit(item, depth + 1, includeAllKeys));

    const source = value as Record<string, unknown>;
    const snapshot: Record<string, unknown> = {};
    if (includeAllKeys) {
      for (const [key, item] of Object.entries(source).slice(0, 50)) {
        snapshot[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : visit(item, depth + 1, true);
      }
      return snapshot;
    }
    for (const key of ["name", "message", "code", "details", "shortMessage", "cause", "data"]) {
      if (key in source) snapshot[key] = visit(source[key], depth + 1, key === "data");
      else if (key === "name" && value instanceof Error) snapshot.name = value.name;
      else if (key === "message" && value instanceof Error) snapshot.message = value.message;
    }
    return snapshot;
  };
  return visit(error);
}

function rpcShapes(error: unknown): RpcShape[] {
  const shapes: RpcShape[] = [];
  const pending: unknown[] = [error];
  const seen = new Set<unknown>();
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    const shape = value as RpcShape;
    shapes.push(shape);
    if (shape.cause) pending.push(shape.cause);
    if (shape.data && typeof shape.data === "object") pending.push(shape.data);
  }
  return shapes;
}

export function isServerBusyError(error: unknown): boolean {
  return rpcShapes(error).some((shape) =>
    shape.code === -32006 ||
    [shape.message, shape.details, shape.shortMessage].some((value) => /server busy/i.test(String(value ?? ""))),
  );
}

export function retryAfterSeconds(error: unknown): number | undefined {
  for (const shape of rpcShapes(error)) {
    const data = shape.data;
    if (!data || typeof data !== "object") continue;
    const value = (data as { retry_after_seconds?: unknown }).retry_after_seconds;
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  }
  return undefined;
}

export async function retryServerBusy<T>(operation: () => Promise<T>, sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isServerBusyError(error) || attempt === 4) throw error;
      const requestedDelay = retryAfterSeconds(error);
      const delay = Math.max(RETRY_DELAYS_MS[attempt], (requestedDelay ?? 0) * 1_000);
      await sleep(delay);
    }
  }
  throw new Error("Unreachable");
}

export function createDiscoveryService<T>(load: (offset: number, limit: number) => Promise<T>, cacheMs = DISCOVERY_CACHE_MS) {
  const inFlight = new Map<string, Promise<T>>();
  const cache = new Map<string, { value: T; expiresAt: number }>();
  return async (offset: number, limit = 20): Promise<T> => {
    const key = `${offset}:${limit}`;
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const active = inFlight.get(key);
    if (active) return active;
    const request = retryServerBusy(() => load(offset, limit)).then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + cacheMs });
      return value;
    }).finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  };
}

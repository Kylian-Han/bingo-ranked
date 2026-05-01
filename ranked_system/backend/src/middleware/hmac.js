import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

// Mod-to-backend authentication via HMAC-SHA256.
//
// The mod sends:
//   X-Signature: hex(HMAC_SHA256(key, "<timestamp>.<rawBody>"))
//   X-Timestamp: unix-ms
//   X-Nonce:     random per-request value
//
// We verify:
//   * timestamp is within the freshness window (5 min) → blocks replay across reboots
//   * signature matches → proves the sender holds the shared key
//   * nonce was not seen recently → blocks tight replay attacks
//
// This is intentionally stateless aside from the in-memory nonce cache; for a single
// trusted MC server that's sufficient. If we ever scale to many servers we'd swap
// the cache for Redis or a per-server key table.

const FRESHNESS_MS = 5 * 60 * 1000;
const seenNonces = new Map(); // nonce → expiresAt

function pruneNonces(now) {
  if (seenNonces.size < 1000) return;
  for (const [nonce, exp] of seenNonces) {
    if (exp <= now) seenNonces.delete(nonce);
  }
}

export function verifyModHmac(req, res, next) {
  const signature = req.get('X-Signature');
  const timestampHeader = req.get('X-Timestamp');
  const nonce = req.get('X-Nonce');

  if (!signature || !timestampHeader || !nonce) {
    return res.status(401).json({ error: 'missing_signature_headers' });
  }

  const timestamp = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestamp)) {
    return res.status(401).json({ error: 'bad_timestamp' });
  }

  const now = Date.now();
  if (Math.abs(now - timestamp) > FRESHNESS_MS) {
    return res.status(401).json({ error: 'stale_request' });
  }

  if (typeof nonce !== 'string' || nonce.length < 8 || nonce.length > 128) {
    return res.status(401).json({ error: 'bad_nonce' });
  }
  pruneNonces(now);
  if (seenNonces.has(nonce)) {
    return res.status(401).json({ error: 'replayed_nonce' });
  }

  // req.rawBody is captured by the express.json verify hook in index.js.
  const raw = req.rawBody ?? '';
  const payload = `${timestamp}.${nonce}.${raw}`;
  const expected = createHmac('sha256', config.modHmacKey).update(payload).digest();

  let provided;
  try {
    provided = Buffer.from(signature, 'hex');
  } catch {
    return res.status(401).json({ error: 'bad_signature' });
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: 'bad_signature' });
  }

  seenNonces.set(nonce, now + FRESHNESS_MS);
  next();
}

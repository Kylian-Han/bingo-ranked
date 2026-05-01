import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import { config } from '../config.js';

export function signAccessToken(userId) {
  return jwt.sign({ sub: String(userId), kind: 'access' }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, config.jwt.accessSecret, { algorithms: ['HS256'] });
  if (payload.kind !== 'access') throw new Error('Wrong token kind');
  return payload;
}

// Refresh tokens are opaque random bytes (not JWTs), stored hashed in DB.
// This way a DB read leak never reveals usable tokens.
export function generateRefreshToken() {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

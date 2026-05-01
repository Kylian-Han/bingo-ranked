import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db/database.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../utils/jwt.js';
import { registerSchema, loginSchema } from '../utils/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { config } from '../config.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

const insertUser = db.prepare(`
  INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)
`);
const findUserByUsername = db.prepare(`
  SELECT id, username, email, password_hash FROM users WHERE username = ? COLLATE NOCASE
`);
const findUserById = db.prepare(`
  SELECT id, username, email, created_at FROM users WHERE id = ?
`);
const findMcAccount = db.prepare(`
  SELECT mc_uuid, mc_username, linked_at FROM mc_accounts WHERE user_id = ?
`);
const insertRefresh = db.prepare(`
  INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)
`);
const findRefresh = db.prepare(`
  SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ?
`);
const revokeRefresh = db.prepare(`
  UPDATE refresh_tokens SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?
`);
const revokeAllForUser = db.prepare(`
  UPDATE refresh_tokens SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE user_id = ? AND revoked_at IS NULL
`);

function issueRefresh(userId) {
  const token = generateRefreshToken();
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + config.jwt.refreshTtl * 1000).toISOString();
  insertRefresh.run(userId, tokenHash, expiresAt);
  return { token, expiresAt };
}

function buildAuthResponse(user) {
  const accessToken = signAccessToken(user.id);
  const { token: refreshToken, expiresAt: refreshExpiresAt } = issueRefresh(user.id);
  return {
    user: { id: user.id, username: user.username, email: user.email ?? null },
    accessToken,
    accessTokenExpiresIn: config.jwt.accessTtl,
    refreshToken,
    refreshTokenExpiresAt: refreshExpiresAt,
  };
}

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = registerSchema.parse(req.body);

    if (findUserByUsername.get(username)) {
      throw new HttpError(409, 'username_taken');
    }

    const hash = await hashPassword(password);
    let result;
    try {
      result = insertUser.run(username, null, hash);
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) {
        // Either username (already checked) or email collision.
        throw new HttpError(409, 'registration_conflict');
      }
      throw e;
    }
    const user = findUserById.get(result.lastInsertRowid);
    res.status(201).json(buildAuthResponse(user));
  } catch (e) {
    next(e);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const row = findUserByUsername.get(username);

    // Always run argon2 verify (against a dummy hash if user missing) to keep
    // the timing roughly constant and avoid revealing whether the user exists.
    const dummyHash =
      '$argon2id$v=19$m=19456,t=2,p=1$YWFhYWFhYWFhYWFhYWFhYQ$3y3hX2K8jYnQ6cWzqjJUXxQ8Ee1LmGv3ipAZpcHfRqI';
    const ok = await verifyPassword(row?.password_hash ?? dummyHash, password);

    if (!row || !ok) {
      throw new HttpError(401, 'invalid_credentials');
    }
    res.json(buildAuthResponse(row));
  } catch (e) {
    next(e);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = String(req.body?.refreshToken ?? '');
    if (!refreshToken || refreshToken.length < 20) {
      throw new HttpError(401, 'invalid_refresh');
    }
    const tokenHash = hashRefreshToken(refreshToken);
    const row = findRefresh.get(tokenHash);
    if (!row || row.revoked_at) throw new HttpError(401, 'invalid_refresh');
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new HttpError(401, 'expired_refresh');
    }
    const user = findUserById.get(row.user_id);
    if (!user) throw new HttpError(401, 'invalid_refresh');

    // Rotate: revoke old, mint a fresh pair. If the old refresh ever appears
    // again it will be rejected (revoked_at non-null) — classic detection.
    revokeRefresh.run(row.id);
    res.json(buildAuthResponse(user));
  } catch (e) {
    next(e);
  }
});

router.post('/logout', requireAuth, (req, res, next) => {
  try {
    revokeAllForUser.run(req.user.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAuth, (req, res, next) => {
  try {
    const user = findUserById.get(req.user.id);
    const mc = findMcAccount.get(req.user.id);
    res.json({
      user: { id: user.id, username: user.username, email: user.email, created_at: user.created_at },
      mc_account: mc ?? null,
    });
  } catch (e) {
    next(e);
  }
});

export default router;

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db/database.js';
import { generateLinkCode } from '../utils/codes.js';
import { linkRedeemSchema, linkRequestSchema } from '../utils/validation.js';
import { verifyModHmac } from '../middleware/hmac.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

const CODE_TTL_MS = 5 * 60 * 1000;

const insertCode = db.prepare(`
  INSERT INTO link_codes (code, mc_uuid, mc_username, expires_at) VALUES (?, ?, ?, ?)
`);
const findActiveCodeForUuid = db.prepare(`
  SELECT code, expires_at FROM link_codes
  WHERE mc_uuid = ? AND used_at IS NULL AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ORDER BY id DESC LIMIT 1
`);
const expireOldCodesForUuid = db.prepare(`
  UPDATE link_codes SET used_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE mc_uuid = ? AND used_at IS NULL
`);
const findCode = db.prepare(`
  SELECT id, code, mc_uuid, mc_username, expires_at, used_at FROM link_codes WHERE code = ?
`);
const consumeCode = db.prepare(`
  UPDATE link_codes SET used_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND used_at IS NULL
`);
const findMcByUuid = db.prepare(`SELECT user_id FROM mc_accounts WHERE mc_uuid = ?`);
const findMcByUserId = db.prepare(`SELECT mc_uuid FROM mc_accounts WHERE user_id = ?`);
const insertMcAccount = db.prepare(`
  INSERT INTO mc_accounts (user_id, mc_uuid, mc_username) VALUES (?, ?, ?)
`);
const deleteMcAccount = db.prepare(`DELETE FROM mc_accounts WHERE user_id = ?`);

// --- Mod → backend: generate a fresh link code for a player. -----------------
//
// Authenticated by HMAC. The mod calls this when a player runs /link in-game.
// Any previously issued, still-active code for that UUID is invalidated so a
// player can only have one outstanding code at a time.
router.post('/request', verifyModHmac, (req, res, next) => {
  try {
    const { mc_uuid, mc_username } = linkRequestSchema.parse(req.body);

    // If they already have a linked site account, refuse — they need to /unlink first.
    const existing = findMcByUuid.get(mc_uuid);
    if (existing) {
      return res.status(409).json({
        error: 'already_linked',
        message: 'This Minecraft account is already linked to a site account.',
      });
    }

    expireOldCodesForUuid.run(mc_uuid);

    // Retry on the (extremely unlikely) UNIQUE collision on `code`.
    let code;
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateLinkCode(8);
      try {
        const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
        insertCode.run(code, mc_uuid, mc_username, expiresAt);
        return res.status(201).json({ code, expires_in_seconds: CODE_TTL_MS / 1000 });
      } catch (e) {
        if (!String(e.message).includes('UNIQUE')) throw e;
      }
    }
    throw new HttpError(500, 'code_generation_failed');
  } catch (e) {
    next(e);
  }
});

// --- Web → backend: redeem a code to link the logged-in user to an MC UUID. --
const redeemLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

router.post('/redeem', requireAuth, redeemLimiter, (req, res, next) => {
  try {
    const { code } = linkRedeemSchema.parse(req.body);

    const tx = db.transaction(() => {
      // Already linked? require unlink first.
      if (findMcByUserId.get(req.user.id)) {
        throw new HttpError(409, 'account_already_linked');
      }

      const row = findCode.get(code);
      if (!row || row.used_at) throw new HttpError(404, 'code_not_found');
      if (new Date(row.expires_at).getTime() < Date.now()) {
        throw new HttpError(410, 'code_expired');
      }

      // Race: another user took this MC UUID between code issue and redeem.
      if (findMcByUuid.get(row.mc_uuid)) {
        throw new HttpError(409, 'mc_already_linked');
      }

      const consumed = consumeCode.run(row.id);
      if (consumed.changes !== 1) throw new HttpError(409, 'code_already_used');

      insertMcAccount.run(req.user.id, row.mc_uuid, row.mc_username);
      return { mc_uuid: row.mc_uuid, mc_username: row.mc_username };
    });

    const result = tx();
    res.json({ ok: true, mc_account: result });
  } catch (e) {
    next(e);
  }
});

router.delete('/', requireAuth, (req, res, next) => {
  try {
    const result = deleteMcAccount.run(req.user.id);
    res.json({ ok: true, removed: result.changes > 0 });
  } catch (e) {
    next(e);
  }
});

export default router;

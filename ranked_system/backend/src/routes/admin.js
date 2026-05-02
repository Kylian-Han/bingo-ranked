import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();
router.use(requireAdmin);

// ── Prepared statements ───────────────────────────────────────────────────────

const listUsers = db.prepare(`
  SELECT
    u.id, u.username, u.email, u.is_admin, u.created_at,
    mc.mc_uuid, mc.mc_username, mc.linked_at,
    COUNT(DISTINCT gp.game_id) AS games,
    SUM(CASE WHEN gp.is_winner THEN 1 ELSE 0 END) AS wins
  FROM users u
  LEFT JOIN mc_accounts mc ON mc.user_id = u.id
  LEFT JOIN game_participants gp ON gp.mc_uuid = mc.mc_uuid
  GROUP BY u.id
  ORDER BY u.created_at DESC
`);

const getUser = db.prepare(`
  SELECT
    u.id, u.username, u.email, u.is_admin, u.created_at,
    mc.mc_uuid, mc.mc_username, mc.linked_at
  FROM users u
  LEFT JOIN mc_accounts mc ON mc.user_id = u.id
  WHERE u.id = ?
`);

const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
const deleteRefreshTokens = db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?');
const deleteMcAccount = db.prepare('DELETE FROM mc_accounts WHERE user_id = ?');

const listGames = db.prepare(`
  SELECT
    g.id, g.game_uuid, g.mode, g.started_at, g.ended_at,
    g.duration_seconds, g.winning_team, g.win_condition
  FROM bingo_games g
  ORDER BY g.ended_at DESC
  LIMIT ? OFFSET ?
`);
const countGames = db.prepare('SELECT COUNT(*) AS total FROM bingo_games');

const getGameParticipants = db.prepare(`
  SELECT mc_uuid, mc_username, team, is_winner
  FROM game_participants
  WHERE game_id = ?
  ORDER BY team, mc_username
`);

const deleteGame = db.prepare('DELETE FROM bingo_games WHERE id = ?');
const deleteGameParticipants = db.prepare('DELETE FROM game_participants WHERE game_id = ?');

const unlinkMc = db.prepare('DELETE FROM mc_accounts WHERE user_id = ?');
const resetParticipants = db.prepare('DELETE FROM game_participants WHERE mc_uuid = ?');

// ── GET /api/admin/users ──────────────────────────────────────────────────────

router.get('/users', (_req, res) => {
  const users = listUsers.all();
  res.json({ users });
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────

router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid_id' });

  const user = getUser.get(id);
  if (!user) return res.status(404).json({ error: 'not_found' });
  if (user.is_admin) return res.status(403).json({ error: 'cannot_delete_admin' });

  db.transaction(() => {
    deleteRefreshTokens.run(id);
    deleteMcAccount.run(id);
    deleteUser.run(id);
  })();

  res.json({ ok: true });
});

// ── DELETE /api/admin/users/:id/stats ────────────────────────────────────────

router.delete('/users/:id/stats', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid_id' });

  const user = getUser.get(id);
  if (!user) return res.status(404).json({ error: 'not_found' });
  if (!user.mc_uuid) return res.status(400).json({ error: 'not_linked' });

  const { changes } = resetParticipants.run(user.mc_uuid);
  res.json({ ok: true, deleted: changes });
});

// ── DELETE /api/admin/users/:id/link ─────────────────────────────────────────

router.delete('/users/:id/link', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid_id' });

  const user = getUser.get(id);
  if (!user) return res.status(404).json({ error: 'not_found' });
  if (!user.mc_uuid) return res.status(400).json({ error: 'not_linked' });

  unlinkMc.run(id);
  res.json({ ok: true });
});

// ── GET /api/admin/games ──────────────────────────────────────────────────────

router.get('/games', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const { total } = countGames.get();
  const games = listGames.all(limit, offset);

  const result = games.map((g) => ({
    ...g,
    participants: getGameParticipants.all(g.id),
  }));

  res.json({ games: result, total, limit, offset });
});

// ── DELETE /api/admin/games/:id ───────────────────────────────────────────────

router.delete('/games/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid_id' });

  db.transaction(() => {
    deleteGameParticipants.run(id);
    deleteGame.run(id);
  })();

  res.json({ ok: true });
});

// ── GET /api/admin/me ─────────────────────────────────────────────────────────
// Lets the frontend verify admin status without a separate request.

router.get('/me', (req, res) => {
  res.json({ id: req.user.id, username: req.user.username });
});

export default router;

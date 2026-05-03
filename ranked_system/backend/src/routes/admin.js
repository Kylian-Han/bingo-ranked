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
const resetEloHistory = db.prepare('DELETE FROM elo_history WHERE mc_uuid = ?');
const resetRating = db.prepare('DELETE FROM player_ratings WHERE mc_uuid = ?');

// Players whose Elo curve depends on a given game (used to recompute their
// current rating after the game is deleted).
const participantsOfGame = db.prepare(
  'SELECT mc_uuid FROM game_participants WHERE game_id = ?',
);
// Last Elo entry per (player, mode) after a game deletion.
const lastEloAfterStmt = db.prepare(`
  SELECT eh.elo_after, eh.mode
  FROM elo_history eh
  JOIN bingo_games g ON g.id = eh.game_id
  WHERE eh.mc_uuid = ? AND eh.mode = ?
  ORDER BY g.ended_at DESC, eh.id DESC
  LIMIT 1
`);
// All modes a player has history in (to rebuild each one after a deletion).
const modesForUuidStmt = db.prepare(`
  SELECT DISTINCT mode FROM elo_history WHERE mc_uuid = ?
`);
const aggregatesForUuidMode = db.prepare(`
  SELECT
    COUNT(*) AS games,
    SUM(p.is_winner) AS wins,
    MAX(eh.elo_after) AS peak_elo
  FROM game_participants p
  JOIN bingo_games g ON g.id = p.game_id
  LEFT JOIN elo_history eh ON eh.game_id = p.game_id AND eh.mc_uuid = p.mc_uuid
  WHERE p.mc_uuid = ? AND g.mode = ?
`);
const upsertRatingFromAggregate = db.prepare(`
  INSERT INTO player_ratings (mc_uuid, mode, elo, peak_elo, games, wins, updated_at)
  VALUES (@mc_uuid, @mode, @elo, @peak_elo, @games, @wins, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  ON CONFLICT(mc_uuid, mode) DO UPDATE SET
    elo = excluded.elo,
    peak_elo = excluded.peak_elo,
    games = excluded.games,
    wins = excluded.wins,
    updated_at = excluded.updated_at
`);
const deleteRatingForMode = db.prepare('DELETE FROM player_ratings WHERE mc_uuid = ? AND mode = ?');

function rebuildRatingFromHistory(mcUuid) {
  // Rebuild each mode's rating independently from the remaining elo_history.
  // If no history remains for a mode, drop that mode's rating row.
  const modes = modesForUuidStmt.all(mcUuid).map((r) => r.mode);
  for (const mode of modes) {
    const last = lastEloAfterStmt.get(mcUuid, mode);
    const agg = aggregatesForUuidMode.get(mcUuid, mode);
    if (!last || !agg || agg.games === 0) {
      deleteRatingForMode.run(mcUuid, mode);
      continue;
    }
    upsertRatingFromAggregate.run({
      mc_uuid: mcUuid,
      mode,
      elo: last.elo_after,
      peak_elo: agg.peak_elo ?? last.elo_after,
      games: agg.games,
      wins: agg.wins ?? 0,
    });
  }
}

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

  const result = db.transaction(() => {
    const { changes } = resetParticipants.run(user.mc_uuid);
    resetEloHistory.run(user.mc_uuid);
    resetRating.run(user.mc_uuid);
    return changes;
  })();

  res.json({ ok: true, deleted: result });
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
    const affected = participantsOfGame.all(id).map((r) => r.mc_uuid);
    deleteGameParticipants.run(id);
    deleteGame.run(id);
    // bingo_games delete cascades to elo_history; refresh each affected
    // player's current rating from their remaining history.
    for (const mcUuid of affected) rebuildRatingFromHistory(mcUuid);
  })();

  res.json({ ok: true });
});

// ── GET /api/admin/me ─────────────────────────────────────────────────────────
// Lets the frontend verify admin status without a separate request.

router.get('/me', (req, res) => {
  res.json({ id: req.user.id, username: req.user.username });
});

export default router;

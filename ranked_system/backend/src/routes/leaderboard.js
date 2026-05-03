import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/database.js';

const router = Router();

const querySchema = z.object({
  mode: z.string().min(1).max(40).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Page principale (sans filtre mode) : classement par victoires toutes modes confondues.
const leaderboardWinsStmt = db.prepare(`
  SELECT
    p.mc_uuid,
    (SELECT mc_username FROM game_participants
       WHERE mc_uuid = p.mc_uuid ORDER BY id DESC LIMIT 1) AS mc_username,
    u.username AS site_username,
    COUNT(*) AS games,
    SUM(p.is_winner) AS wins,
    ROUND(CAST(SUM(p.is_winner) AS REAL) * 100.0 / COUNT(*), 1) AS win_rate
  FROM game_participants p
  LEFT JOIN mc_accounts m ON m.mc_uuid = p.mc_uuid
  LEFT JOIN users u ON u.id = m.user_id
  GROUP BY p.mc_uuid
  HAVING games > 0
  ORDER BY wins DESC, mc_username ASC
  LIMIT @limit OFFSET @offset
`);

// Filtre par mode : classement par Elo du mode sélectionné.
const leaderboardByModeStmt = db.prepare(`
  SELECT
    pr.mc_uuid,
    (SELECT mc_username FROM game_participants
       WHERE mc_uuid = pr.mc_uuid ORDER BY id DESC LIMIT 1) AS mc_username,
    u.username AS site_username,
    pr.elo,
    pr.peak_elo,
    pr.games,
    pr.wins,
    ROUND(CAST(pr.wins AS REAL) * 100.0 / NULLIF(pr.games, 0), 1) AS win_rate
  FROM player_ratings pr
  LEFT JOIN mc_accounts m ON m.mc_uuid = pr.mc_uuid
  LEFT JOIN users u ON u.id = m.user_id
  WHERE pr.mode = @mode AND pr.games > 0
  ORDER BY pr.elo DESC, mc_username ASC
  LIMIT @limit OFFSET @offset
`);

const totalGamesStmt = db.prepare(`
  SELECT COUNT(DISTINCT g.id) AS total_games,
         COUNT(DISTINCT p.mc_uuid) AS total_players
  FROM bingo_games g
  JOIN game_participants p ON p.game_id = g.id
  WHERE (@mode IS NULL OR g.mode = @mode)
`);

const modesStmt = db.prepare(`
  SELECT mode, COUNT(*) AS games FROM bingo_games GROUP BY mode ORDER BY games DESC
`);

router.get('/', (req, res, next) => {
  try {
    const { mode, limit, offset } = querySchema.parse(req.query);
    const rows = mode
      ? leaderboardByModeStmt.all({ mode, limit, offset })
      : leaderboardWinsStmt.all({ limit, offset });
    const totals = totalGamesStmt.get({ mode: mode ?? null });
    res.json({
      mode: mode ?? null,
      limit,
      offset,
      totals,
      players: rows,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/modes', (req, res, next) => {
  try {
    res.json({ modes: modesStmt.all() });
  } catch (e) {
    next(e);
  }
});

export default router;

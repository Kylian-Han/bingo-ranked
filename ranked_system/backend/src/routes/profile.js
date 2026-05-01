import { Router } from 'express';
import { db } from '../db/database.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

// Resolve identifier (site username, MC username, or MC UUID) to a canonical mc_uuid.
// Site username is preferred — it maps to a stable mc_uuid through mc_accounts.
const findUuidBySiteUsername = db.prepare(`
  SELECT m.mc_uuid
  FROM users u
  JOIN mc_accounts m ON m.user_id = u.id
  WHERE u.username = ? COLLATE NOCASE
`);
const findUuidByMcUsername = db.prepare(`
  SELECT mc_uuid FROM game_participants
  WHERE mc_username = ? COLLATE NOCASE
  ORDER BY id DESC LIMIT 1
`);

const summaryStmt = db.prepare(`
  SELECT
    p.mc_uuid,
    (SELECT mc_username FROM game_participants
      WHERE mc_uuid = p.mc_uuid ORDER BY id DESC LIMIT 1) AS mc_username,
    u.username AS site_username,
    u.created_at AS site_created_at,
    m.linked_at,
    COUNT(*) AS games,
    SUM(p.is_winner) AS wins
  FROM game_participants p
  LEFT JOIN mc_accounts m ON m.mc_uuid = p.mc_uuid
  LEFT JOIN users u ON u.id = m.user_id
  WHERE p.mc_uuid = ?
  GROUP BY p.mc_uuid
`);

const winsByModeStmt = db.prepare(`
  SELECT g.mode,
         COUNT(*) AS games,
         SUM(p.is_winner) AS wins
  FROM game_participants p
  JOIN bingo_games g ON g.id = p.game_id
  WHERE p.mc_uuid = ?
  GROUP BY g.mode
  ORDER BY wins DESC, games DESC
`);

const recentGamesStmt = db.prepare(`
  SELECT g.id, g.game_uuid, g.mode, g.started_at, g.ended_at, g.duration_seconds,
         g.winning_team, g.win_condition,
         p.team AS player_team, p.is_winner AS player_won
  FROM game_participants p
  JOIN bingo_games g ON g.id = p.game_id
  WHERE p.mc_uuid = ?
  ORDER BY g.ended_at DESC
  LIMIT ?
`);

const participantsForGamesStmt = db.prepare(`
  SELECT p.game_id, p.mc_uuid, p.mc_username, p.team, p.is_winner,
         u.username AS site_username
  FROM game_participants p
  LEFT JOIN mc_accounts m ON m.mc_uuid = p.mc_uuid
  LEFT JOIN users u ON u.id = m.user_id
  WHERE p.game_id IN (SELECT value FROM json_each(?))
`);

const avgRecentDurationStmt = db.prepare(`
  SELECT AVG(duration_seconds) AS avg_seconds, COUNT(*) AS sample
  FROM (
    SELECT g.duration_seconds
    FROM game_participants p
    JOIN bingo_games g ON g.id = p.game_id
    WHERE p.mc_uuid = ?
    ORDER BY g.ended_at DESC
    LIMIT ?
  )
`);

function resolveMcUuid(identifier) {
  if (!identifier) return null;
  const id = String(identifier).trim();
  if (!id) return null;
  // UUID form (with or without dashes)
  const uuidRe = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
  if (uuidRe.test(id)) {
    const norm =
      id.length === 32
        ? `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
        : id.toLowerCase();
    return norm;
  }
  const bySite = findUuidBySiteUsername.get(id);
  if (bySite) return bySite.mc_uuid;
  const byMc = findUuidByMcUsername.get(id);
  if (byMc) return byMc.mc_uuid;
  return null;
}

router.get('/:identifier', (req, res, next) => {
  try {
    const mcUuid = resolveMcUuid(req.params.identifier);
    if (!mcUuid) throw new HttpError(404, 'player_not_found');

    const summary = summaryStmt.get(mcUuid);
    if (!summary) throw new HttpError(404, 'player_not_found');

    const winsByMode = winsByModeStmt.all(mcUuid);
    const recentGames = recentGamesStmt.all(mcUuid, 10);
    const avg = avgRecentDurationStmt.get(mcUuid, 10);

    let games = [];
    if (recentGames.length > 0) {
      const ids = recentGames.map((g) => g.id);
      const allParticipants = participantsForGamesStmt.all(JSON.stringify(ids));
      const byGameId = new Map();
      for (const p of allParticipants) {
        if (!byGameId.has(p.game_id)) byGameId.set(p.game_id, []);
        byGameId.get(p.game_id).push({
          mc_uuid: p.mc_uuid,
          mc_username: p.mc_username,
          site_username: p.site_username,
          team: p.team,
          is_winner: !!p.is_winner,
        });
      }
      games = recentGames.map((g) => ({
        game_uuid: g.game_uuid,
        mode: g.mode,
        started_at: g.started_at,
        ended_at: g.ended_at,
        duration_seconds: g.duration_seconds,
        winning_team: g.winning_team,
        win_condition: g.win_condition,
        player_team: g.player_team,
        player_won: !!g.player_won,
        participants: byGameId.get(g.id) ?? [],
      }));
    }

    res.json({
      mc_uuid: summary.mc_uuid,
      mc_username: summary.mc_username,
      site_username: summary.site_username,
      site_created_at: summary.site_created_at,
      linked_at: summary.linked_at,
      totals: {
        games: summary.games,
        wins: summary.wins,
        win_rate:
          summary.games > 0 ? Math.round((summary.wins / summary.games) * 1000) / 10 : 0,
      },
      avg_duration_seconds_last_10: avg.sample > 0 ? Math.round(avg.avg_seconds) : null,
      wins_by_mode: winsByMode,
      recent_games: games,
    });
  } catch (e) {
    next(e);
  }
});

export default router;

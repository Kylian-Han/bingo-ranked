import { Router } from 'express';
import { db } from '../db/database.js';
import { gameReportSchema } from '../utils/validation.js';
import { verifyModHmac } from '../middleware/hmac.js';
import { HttpError } from '../middleware/error.js';
import { computeEloDeltas, STARTING_ELO } from '../utils/elo.js';

const router = Router();

const findGameByUuid = db.prepare(`SELECT id FROM bingo_games WHERE game_uuid = ?`);
const insertGame = db.prepare(`
  INSERT INTO bingo_games
    (game_uuid, mode, started_at, ended_at, duration_seconds, winning_team, win_condition)
  VALUES (@game_uuid, @mode, @started_at, @ended_at, @duration_seconds, @winning_team, @win_condition)
`);
const insertParticipant = db.prepare(`
  INSERT OR IGNORE INTO game_participants
    (game_id, mc_uuid, mc_username, team, is_winner)
  VALUES (?, ?, ?, ?, ?)
`);

const getRating = db.prepare(`SELECT elo, peak_elo, games, wins FROM player_ratings WHERE mc_uuid = ? AND mode = ?`);
const upsertRating = db.prepare(`
  INSERT INTO player_ratings (mc_uuid, mode, elo, peak_elo, games, wins, updated_at)
  VALUES (@mc_uuid, @mode, @elo, @peak_elo, @games, @wins, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  ON CONFLICT(mc_uuid, mode) DO UPDATE SET
    elo = excluded.elo,
    peak_elo = MAX(player_ratings.peak_elo, excluded.elo),
    games = excluded.games,
    wins = excluded.wins,
    updated_at = excluded.updated_at
`);
const insertEloHistory = db.prepare(`
  INSERT INTO elo_history (game_id, mc_uuid, mode, elo_before, elo_after, delta, is_winner)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

router.post('/', verifyModHmac, (req, res, next) => {
  try {
    const data = gameReportSchema.parse(req.body);

    // Idempotency: if the mod retries (e.g. flaky network), the game_uuid lets
    // us return the existing game id without duplicating rows.
    const existing = findGameByUuid.get(data.game_uuid);
    if (existing) {
      return res.json({ ok: true, game_id: existing.id, duplicate: true });
    }

    if (data.duration_seconds < 0) throw new HttpError(400, 'bad_duration');
    if (new Date(data.ended_at) < new Date(data.started_at)) {
      throw new HttpError(400, 'bad_time_order');
    }

    const tx = db.transaction(() => {
      const result = insertGame.run({
        game_uuid: data.game_uuid,
        mode: data.mode,
        started_at: data.started_at,
        ended_at: data.ended_at,
        duration_seconds: data.duration_seconds,
        winning_team: data.winning_team,
        win_condition: data.win_condition,
      });
      const gameId = result.lastInsertRowid;
      for (const p of data.participants) {
        insertParticipant.run(
          gameId,
          p.mc_uuid,
          p.mc_username,
          p.team,
          p.is_winner ? 1 : 0,
        );
      }

      // Snapshot each participant's current Elo, run the calculator, persist
      // updated ratings + per-game history. Same transaction as the game row
      // so a crash mid-write can't leave Elo and games out of sync.
      const enriched = data.participants.map((p) => {
        const r = getRating.get(p.mc_uuid, data.mode);
        return {
          mc_uuid: p.mc_uuid,
          team: p.team,
          is_winner: !!p.is_winner,
          elo: r?.elo ?? STARTING_ELO,
          games: r?.games ?? 0,
          wins: r?.wins ?? 0,
        };
      });

      const deltas = computeEloDeltas({
        participants: enriched,
        durationSeconds: data.duration_seconds,
      });
      const deltaByUuid = new Map(deltas.map((d) => [d.mc_uuid, d]));

      for (const p of enriched) {
        const d = deltaByUuid.get(p.mc_uuid);
        const newElo = d.elo_after;
        const newGames = p.games + 1;
        const newWins = p.wins + (p.is_winner ? 1 : 0);
        upsertRating.run({
          mc_uuid: p.mc_uuid,
          mode: data.mode,
          elo: newElo,
          peak_elo: Math.max(p.elo, newElo),
          games: newGames,
          wins: newWins,
        });
        insertEloHistory.run(
          gameId,
          p.mc_uuid,
          data.mode,
          d.elo_before,
          d.elo_after,
          d.delta,
          d.is_winner ? 1 : 0,
        );
      }

      return { gameId, deltas };
    });

    const { gameId, deltas } = tx();
    res.status(201).json({ ok: true, game_id: gameId, elo_deltas: deltas });
  } catch (e) {
    next(e);
  }
});

export default router;

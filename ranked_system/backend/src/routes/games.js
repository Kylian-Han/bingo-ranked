import { Router } from 'express';
import { db } from '../db/database.js';
import { gameReportSchema } from '../utils/validation.js';
import { verifyModHmac } from '../middleware/hmac.js';
import { HttpError } from '../middleware/error.js';

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
      return gameId;
    });

    const gameId = tx();
    res.status(201).json({ ok: true, game_id: gameId });
  } catch (e) {
    next(e);
  }
});

export default router;

-- Elo / MMR system (replaces wins as the primary ranking).
-- Elo lives on the MC account (mc_uuid), not on the site user, so unlinked
-- players still get rated and a relink keeps the same history.

-- Per-player current rating + cached counters. Rows are created lazily the
-- first time a player participates in a game (default 300, see elo.md §1).
CREATE TABLE IF NOT EXISTS player_ratings (
  mc_uuid       TEXT    PRIMARY KEY,
  elo           INTEGER NOT NULL DEFAULT 300,
  peak_elo      INTEGER NOT NULL DEFAULT 300,
  games         INTEGER NOT NULL DEFAULT 0,
  wins          INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_player_ratings_elo ON player_ratings(elo DESC);

-- One row per (game, player). Lets us draw an Elo curve over time per player
-- and audit how a given match moved the ladder.
CREATE TABLE IF NOT EXISTS elo_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id     INTEGER NOT NULL REFERENCES bingo_games(id) ON DELETE CASCADE,
  mc_uuid     TEXT    NOT NULL,
  elo_before  INTEGER NOT NULL,
  elo_after   INTEGER NOT NULL,
  delta       INTEGER NOT NULL,
  is_winner   INTEGER NOT NULL CHECK (is_winner IN (0, 1)),
  recorded_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(game_id, mc_uuid)
);
CREATE INDEX IF NOT EXISTS idx_elo_history_uuid ON elo_history(mc_uuid);
CREATE INDEX IF NOT EXISTS idx_elo_history_game ON elo_history(game_id);

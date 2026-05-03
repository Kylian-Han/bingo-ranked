-- Elo devient par (mc_uuid, mode) au lieu de global par joueur.
-- On migre les données existantes : chaque ligne player_ratings devient "normal"
-- (mode par défaut), et elo_history hérite du mode de la partie associée.

PRAGMA foreign_keys = OFF;

-- Nouvelle table player_ratings avec clé (mc_uuid, mode)
CREATE TABLE IF NOT EXISTS player_ratings_new (
  mc_uuid    TEXT    NOT NULL,
  mode       TEXT    NOT NULL,
  elo        INTEGER NOT NULL DEFAULT 300,
  peak_elo   INTEGER NOT NULL DEFAULT 300,
  games      INTEGER NOT NULL DEFAULT 0,
  wins       INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (mc_uuid, mode)
);

-- Migration : les ratings existants deviennent le mode "normal"
INSERT INTO player_ratings_new (mc_uuid, mode, elo, peak_elo, games, wins, updated_at)
SELECT mc_uuid, 'normal', elo, peak_elo, games, wins, updated_at
FROM player_ratings;

DROP TABLE player_ratings;
ALTER TABLE player_ratings_new RENAME TO player_ratings;

CREATE INDEX IF NOT EXISTS idx_player_ratings_mode_elo ON player_ratings(mode, elo DESC);
CREATE INDEX IF NOT EXISTS idx_player_ratings_uuid ON player_ratings(mc_uuid);

-- elo_history : ajouter colonne mode (déduite de la partie)
ALTER TABLE elo_history ADD COLUMN mode TEXT NOT NULL DEFAULT 'normal';

-- Remplir le mode depuis bingo_games pour les lignes existantes
UPDATE elo_history SET mode = (
  SELECT g.mode FROM bingo_games g WHERE g.id = elo_history.game_id
) WHERE mode = 'normal';

PRAGMA foreign_keys = ON;

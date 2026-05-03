// Elo / MMR calculator for asymmetric Bingo Speedrun matches.
// Spec: elo.md (winner-takes-all, 1–4 teams, up to 5 players/team, base 300).

export const STARTING_ELO = 300;

const SCALING_DIVISOR = 50;
const SPEEDRUN_THRESHOLD_SECONDS = 5 * 60;
const SPEEDRUN_BONUS = 3;
const UNDERDOG_PER_PLAYER = 0.20;

function basePoints(numTeams, isWinner) {
  const duel = numTeams === 2;
  if (isWinner) return duel ? 20 : 35;
  return duel ? -20 : -11;
}

// "Partie entière supérieure" — elo.md §3 explicitly requires ceil, including
// for negatives where ceil(-3.6) = -3 (toward zero).
function ceil(x) {
  return Math.ceil(x);
}

function mean(values) {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/**
 * Compute per-player Elo deltas for one finished game.
 *
 * @param {Object} input
 * @param {Array<{mc_uuid: string, team: string, is_winner: boolean, elo: number}>} input.participants
 *   All participants with their current Elo rating.
 * @param {number} input.durationSeconds
 * @returns {Array<{mc_uuid: string, delta: number, elo_before: number, elo_after: number, is_winner: boolean}>}
 */
export function computeEloDeltas({ participants, durationSeconds }) {
  if (!participants || participants.length === 0) return [];

  const teams = new Map();
  for (const p of participants) {
    if (!teams.has(p.team)) teams.set(p.team, []);
    teams.get(p.team).push(p);
  }
  const numTeams = teams.size;

  // No-op edge cases: a single team in the game (nothing to rate against)
  // or no winners declared (e.g. abandoned match logged with winning_team=null).
  if (numTeams < 2) {
    return participants.map((p) => ({
      mc_uuid: p.mc_uuid,
      delta: 0,
      elo_before: p.elo,
      elo_after: p.elo,
      is_winner: !!p.is_winner,
    }));
  }

  const hasWinner = participants.some((p) => p.is_winner);
  if (!hasWinner) {
    return participants.map((p) => ({
      mc_uuid: p.mc_uuid,
      delta: 0,
      elo_before: p.elo,
      elo_after: p.elo,
      is_winner: false,
    }));
  }

  const nMax = Math.max(...[...teams.values()].map((t) => t.length));
  const speedrun = durationSeconds < SPEEDRUN_THRESHOLD_SECONDS;

  return participants.map((p) => {
    const myTeam = teams.get(p.team);
    const opponents = participants.filter((q) => q.team !== p.team);
    const eOpp = mean(opponents.map((q) => q.elo));

    const base = basePoints(numTeams, !!p.is_winner);
    const baseGain = base + (eOpp - p.elo) / SCALING_DIVISOR;

    let delta;
    if (p.is_winner) {
      const nTeam = myTeam.length;
      // Underdog multiplier only applies to the winning team's gain.
      const multiplier = nTeam < nMax
        ? 1 + UNDERDOG_PER_PLAYER * (nMax - nTeam)
        : 1;
      let multiplied = ceil(baseGain * multiplier);
      if (speedrun) multiplied += SPEEDRUN_BONUS;
      delta = multiplied;
    } else {
      // Losers: no multiplier, no speedrun bonus. Ceil on a negative
      // number rounds toward zero (e.g. ceil(-3.6) = -3) per spec §3.B.
      delta = ceil(baseGain);
    }

    const eloAfter = p.elo + delta;
    return {
      mc_uuid: p.mc_uuid,
      delta,
      elo_before: p.elo,
      elo_after: eloAfter,
      is_winner: !!p.is_winner,
    };
  });
}

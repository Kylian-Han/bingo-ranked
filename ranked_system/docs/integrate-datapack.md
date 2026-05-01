# Hook the bingo datapack to the ranked system

The mod doesn't watch the bingo state directly — it has no way to know when a
game starts or ends. Instead, the existing bingo datapack calls into a small
companion datapack (`ranked_hooks/`) at the right moments. Those hooks run the
mod's `/rankedreport` command, which builds the report and POSTs it.

## 1. Install the companion datapack

Copy `ranked_system/datapack/ranked_hooks/` into the world's
`datapacks/` folder. So the structure becomes:

```
<world>/datapacks/
├── base_generated/        (existing)
├── bingo_manual/          (existing)
├── normal_set/            (existing)
└── ranked_hooks/          ← new
```

Run `/reload` (or restart the world). Verify with `/datapack list` — you should
see `[file/ranked_hooks]` in the enabled list.

## 2. Wire it into the bingo functions

You only need to add **one or two lines** to the existing bingo functions.

### a) At game start (state 0/1 → 2)

Find the function that flips the game into the playing state. In the existing
pack it's typically something like `flytre:start_game` or whatever sets the
`lockout` / stage scoreboard to `2`. **At the bottom of that function**, add:

```mcfunction
function ranked:on_start_normal
```

(Or `ranked:on_start_lockout`, `ranked:on_start_nether`, etc. — match the mode
the player picked. If you're not sure, just call `ranked:on_start` which uses
`"normal"` as the mode label.)

### b) At each team's win

The win-detection chain ends in a per-team function (e.g.
`flytre:win/red.mcfunction`). **At the top of each color's win function**, add
the matching hook:

```mcfunction
# bingo_manual/data/flytre/function/win/red.mcfunction
function ranked:on_win_red
... rest of the existing red-win logic ...
```

Repeat for yellow / green / blue. Add the call **before** the function clears
scoreboards or returns players to lobby — the mod needs the team rosters to
still be intact.

### c) (Optional) On game cancel / abort

If your pack has a "cancel game" path (e.g. an admin command or a vote), call
`ranked:on_cancel` from there so we don't keep stale game state in memory.

## 3. What gets reported

When `ranked:on_win_red` fires, the mod looks at every currently-online player
who is on a Minecraft team named `red` / `yellow` / `green` / `blue`, snapshots
their UUID + username + team, marks the winning team, and POSTs the whole
roster to the backend.

This means **players must still be online and on their team when the win fires**.
That's the case in practice — the win detection runs immediately on item
completion, before any cleanup. If you have a "transition" period where teams
get unassigned before the report could fire, move the `function ranked:on_win_*`
call earlier in the chain.

## 4. Mode names

The default hooks emit these mode labels:

| Hook function | Mode label |
|---------------|------------|
| `ranked:on_start_normal` | `normal` |
| `ranked:on_start_nether` | `nether` |
| `ranked:on_start_speed`  | `speed`  |
| `ranked:on_start_lockout`| `lockout`|

These show up in the leaderboard's mode filter. If you have a custom mode, copy
one of those `.mcfunction` files in `ranked_hooks/data/ranked/function/` and
edit the literal name — they're one-liners.

## 5. Verify end-to-end

1. Start a real bingo game on the server.
2. Watch the server console — you should see
   `[ranked] Tracking game <uuid> (mode: normal)` from `/rankedreport start`.
3. Have someone win.
4. Console should show `[ranked] Reported game (N players, winner: red)`.
5. Visit your website's leaderboard — the win should be there immediately.

## Troubleshooting

- **No "Tracking game" log**: the bingo function isn't reaching `ranked:on_start_*`.
  Add `say DEBUG: starting hook` next to the call to confirm it fires.
- **"No active game to end" error**: the win hook fired without a prior start
  hook. Either start was missed or the cancel hook ran in between.
- **Game reported but 0 winners**: players are not on a Minecraft team named
  `red`/`yellow`/`green`/`blue`. The bingo pack assigns these — check
  `/team list` while a game is running.
- **HTTP 401 `bad_signature` in mod log**: the mod's `hmacKey` and the backend's
  `MOD_HMAC_KEY` don't match. Re-paste both from the same source.

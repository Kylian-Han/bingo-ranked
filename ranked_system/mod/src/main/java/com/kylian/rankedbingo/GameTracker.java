package com.kylian.rankedbingo;

import com.kylian.rankedbingo.api.Dtos;
import net.minecraft.scoreboard.Team;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Holds the in-memory state for a single bingo game between /rankedreport start and end.
 *
 * On start we snapshot every online player and their team — this is our authoritative
 * roster. Mid-game disconnects don't drop them from the report; mid-game joins aren't
 * included (rare in bingo, and a clean rule beats fuzzy attribution).
 */
public class GameTracker {
    private static final Set<String> VALID_TEAMS = Set.of("red", "yellow", "green", "blue");

    private record PlayerSnapshot(UUID uuid, String name, String team) {}

    private String gameUuid;
    private String mode;
    private Instant startedAt;
    private final Map<UUID, PlayerSnapshot> roster = new LinkedHashMap<>();

    public synchronized boolean isRunning() {
        return gameUuid != null;
    }

    public synchronized String start(String mode, MinecraftServer server) {
        this.gameUuid = UUID.randomUUID().toString();
        this.mode = mode;
        this.startedAt = Instant.now();
        this.roster.clear();
        snapshotPlayers(server);
        return this.gameUuid;
    }

    private void snapshotPlayers(MinecraftServer server) {
        for (ServerPlayerEntity p : server.getPlayerManager().getPlayerList()) {
            Team team = p.getScoreboardTeam();
            if (team == null) continue;
            String teamName = team.getName().toLowerCase();
            if (!VALID_TEAMS.contains(teamName)) continue;
            roster.put(p.getUuid(), new PlayerSnapshot(p.getUuid(), p.getName().getString(), teamName));
        }
    }

    /**
     * Augment the roster with anyone currently online on a valid team but not yet
     * captured. Called at end-time to catch late joiners we still want to credit.
     */
    public synchronized void refreshOnline(MinecraftServer server) {
        for (ServerPlayerEntity p : server.getPlayerManager().getPlayerList()) {
            if (roster.containsKey(p.getUuid())) continue;
            Team team = p.getScoreboardTeam();
            if (team == null) continue;
            String teamName = team.getName().toLowerCase();
            if (!VALID_TEAMS.contains(teamName)) continue;
            roster.put(p.getUuid(), new PlayerSnapshot(p.getUuid(), p.getName().getString(), teamName));
        }
    }

    public synchronized Dtos.GameReport finish(String winningTeam, String winCondition, MinecraftServer server) {
        if (gameUuid == null) return null;

        refreshOnline(server);

        String winning = (winningTeam == null || winningTeam.isBlank() || "none".equalsIgnoreCase(winningTeam))
                ? null
                : winningTeam.toLowerCase();
        String condition = (winCondition == null || winCondition.isBlank() || "none".equalsIgnoreCase(winCondition))
                ? null
                : winCondition.toLowerCase();

        Instant endedAt = Instant.now();
        long duration = Math.max(0, endedAt.getEpochSecond() - startedAt.getEpochSecond());

        List<Dtos.Participant> participants = new ArrayList<>(roster.size());
        for (PlayerSnapshot snap : roster.values()) {
            boolean won = winning != null && snap.team.equals(winning);
            participants.add(new Dtos.Participant(
                    formatUuid(snap.uuid),
                    snap.name,
                    snap.team,
                    won
            ));
        }

        Dtos.GameReport report = new Dtos.GameReport(
                gameUuid,
                mode,
                startedAt.toString(),
                endedAt.toString(),
                duration,
                winning,
                condition,
                participants
        );

        // Reset for the next game.
        this.gameUuid = null;
        this.mode = null;
        this.startedAt = null;
        this.roster.clear();

        return report;
    }

    public synchronized void cancel() {
        this.gameUuid = null;
        this.mode = null;
        this.startedAt = null;
        this.roster.clear();
    }

    public synchronized String currentMode() { return mode; }
    public synchronized String currentGameUuid() { return gameUuid; }

    private static String formatUuid(UUID uuid) {
        return uuid.toString();
    }
}

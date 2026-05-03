package com.kylian.rankedbingo.api;

import java.util.List;

/** Plain-data containers serialized to JSON for backend requests. */
public final class Dtos {
    private Dtos() {}

    public record LinkRequest(String mc_uuid, String mc_username) {}

    public record LinkResponse(String code, Long expires_in_seconds) {}

    public record GameReport(
            String game_uuid,
            String mode,
            String started_at,
            String ended_at,
            long duration_seconds,
            String winning_team,
            String win_condition,
            List<Participant> participants
    ) {}

    public record Participant(
            String mc_uuid,
            String mc_username,
            String team,
            boolean is_winner
    ) {}

    public record EloDelta(
            String mc_uuid,
            int elo_before,
            int elo_after,
            int delta,
            boolean is_winner
    ) {}

    public record GameReportResponse(
            boolean ok,
            long game_id,
            java.util.List<EloDelta> elo_deltas
    ) {}
}

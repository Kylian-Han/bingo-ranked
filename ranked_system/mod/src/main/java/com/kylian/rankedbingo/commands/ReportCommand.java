package com.kylian.rankedbingo.commands;

import com.google.gson.Gson;
import com.kylian.rankedbingo.RankedBingo;
import com.kylian.rankedbingo.api.Dtos;
import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.StringArgumentType;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.command.CommandManager;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;

import java.util.List;
import java.util.UUID;

/**
 * /rankedreport — internal command called by the bingo datapack.
 *
 * Permission level 2 means only ops or commands run by the server itself
 * (functions invoked from /tick or /reload-time scripts) can call it. Players
 * cannot trigger fake game results.
 *
 * Subcommands:
 *   /rankedreport start <mode>
 *   /rankedreport end   <winning_team> <win_condition>
 *
 * winning_team: red | yellow | green | blue | none
 * win_condition: row | column | diagonal | blackout | majority | manhunt | race | none
 */
public class ReportCommand {
    private static final Gson GSON = new Gson();
    public static void register(CommandDispatcher<ServerCommandSource> dispatcher) {
        dispatcher.register(CommandManager.literal("rankedreport")
                .requires(src -> src.hasPermissionLevel(2))
                .then(CommandManager.literal("start")
                        .then(CommandManager.argument("mode", StringArgumentType.word())
                                .executes(ctx -> handleStart(ctx.getSource(), StringArgumentType.getString(ctx, "mode")))
                        )
                )
                .then(CommandManager.literal("end")
                        .then(CommandManager.argument("winning_team", StringArgumentType.word())
                                .then(CommandManager.argument("win_condition", StringArgumentType.word())
                                        .executes(ctx -> handleEnd(
                                                ctx.getSource(),
                                                StringArgumentType.getString(ctx, "winning_team"),
                                                StringArgumentType.getString(ctx, "win_condition")
                                        ))
                                )
                        )
                )
                .then(CommandManager.literal("cancel")
                        .executes(ctx -> {
                            RankedBingo.GAME_TRACKER.cancel();
                            ctx.getSource().sendFeedback(() -> Text.literal("[ranked] Game tracking cancelled.").formatted(Formatting.GRAY), false);
                            return 1;
                        })
                )
        );
    }

    private static int handleStart(ServerCommandSource src, String mode) {
        if (RankedBingo.GAME_TRACKER.isRunning()) {
            // Auto-cancel a stale run rather than refusing — better than getting wedged.
            RankedBingo.LOGGER.warn("[ranked_bingo] /rankedreport start while a previous game was still tracked; cancelling stale state.");
            RankedBingo.GAME_TRACKER.cancel();
        }
        String id = RankedBingo.GAME_TRACKER.start(mode, src.getServer());
        src.sendFeedback(() -> Text.literal("[ranked] Tracking game " + id + " (mode: " + mode + ")").formatted(Formatting.GRAY), false);
        return 1;
    }

    private static int handleEnd(ServerCommandSource src, String winningTeam, String winCondition) {
        if (!RankedBingo.GAME_TRACKER.isRunning()) {
            src.sendError(Text.literal("[ranked] No active game to end."));
            return 0;
        }
        Dtos.GameReport report = RankedBingo.GAME_TRACKER.finish(winningTeam, winCondition, src.getServer());
        if (report == null) {
            src.sendError(Text.literal("[ranked] Failed to build game report."));
            return 0;
        }

        if (!RankedBingo.CONFIG.reportingEnabled || !RankedBingo.CONFIG.isUsable()) {
            src.sendFeedback(() -> Text.literal("[ranked] Reporting disabled, skipping POST.").formatted(Formatting.GRAY), false);
            return 1;
        }

        MinecraftServer server = src.getServer();
        RankedBingo.BACKEND.postSigned("/games", report)
                .thenAccept(res -> {
                    if (res.statusCode() == 201 || res.statusCode() == 200) {
                        RankedBingo.LOGGER.info("[ranked_bingo] Game {} reported ({} participants).", report.game_uuid(), report.participants().size());
                        try {
                            Dtos.GameReportResponse resp = GSON.fromJson(res.body(), Dtos.GameReportResponse.class);
                            if (resp != null && resp.elo_deltas() != null) {
                                broadcastEloDeltas(server, resp.elo_deltas());
                            }
                        } catch (Exception e) {
                            RankedBingo.LOGGER.warn("[ranked_bingo] Failed to parse game response: {}", e.toString());
                        }
                    } else {
                        RankedBingo.LOGGER.warn("[ranked_bingo] Game report rejected ({}): {}", res.statusCode(), res.body());
                    }
                })
                .exceptionally(err -> {
                    RankedBingo.LOGGER.warn("[ranked_bingo] Game report failed: {}", err.toString());
                    return null;
                });

        src.sendFeedback(() -> Text.literal("[ranked] Reported game (" + report.participants().size() + " players, winner: " + report.winning_team() + ")").formatted(Formatting.GRAY), false);
        return 1;
    }

    private static void broadcastEloDeltas(MinecraftServer server, List<Dtos.EloDelta> deltas) {
        for (Dtos.EloDelta d : deltas) {
            try {
                ServerPlayerEntity player = server.getPlayerManager().getPlayer(UUID.fromString(d.mc_uuid()));
                if (player == null) continue;
                String sign = d.delta() >= 0 ? "+" : "";
                String arrow = d.delta() >= 0 ? "▲" : "▼";
                Formatting color = d.delta() >= 0 ? Formatting.GREEN : Formatting.RED;
                Text msg = Text.literal("[ranked] Elo : " + d.elo_before() + " → " + d.elo_after()
                        + "  (" + arrow + sign + d.delta() + ")").formatted(color);
                player.sendMessage(msg, false);
            } catch (Exception ignored) {}
        }
    }
}

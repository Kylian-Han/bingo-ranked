package com.kylian.rankedbingo.commands;

import com.google.gson.Gson;
import com.kylian.rankedbingo.FreezeManager;
import com.kylian.rankedbingo.RankedBingo;
import com.kylian.rankedbingo.api.Dtos;
import com.mojang.brigadier.CommandDispatcher;
import net.minecraft.server.command.CommandManager;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;

/**
 * /link — generates a one-time code linking the player's MC account to the website.
 *
 * Anyone can use it. The backend rejects accounts that are already linked.
 */
public class LinkCommand {
    private static final Gson GSON = new Gson();
    private static final org.slf4j.Logger LOGGER = org.slf4j.LoggerFactory.getLogger("RankedBingo/Link");

    public static void register(CommandDispatcher<ServerCommandSource> dispatcher) {
        dispatcher.register(CommandManager.literal("link").executes(ctx -> {
            ServerCommandSource src = ctx.getSource();
            ServerPlayerEntity player = src.getPlayer();
            if (player == null) {
                src.sendError(Text.literal("/link must be run by a player."));
                return 0;
            }
            if (!RankedBingo.CONFIG.isUsable()) {
                src.sendError(Text.literal("Ranked Bingo backend is not configured. Ask an admin."));
                return 0;
            }

            Dtos.LinkRequest body = new Dtos.LinkRequest(
                    player.getUuid().toString(),
                    player.getName().getString()
            );

            LOGGER.info("[ranked_bingo] /link invoked by {}, config usable={}", player.getName().getString(), RankedBingo.CONFIG.isUsable());
            // Capture server reference now, on the server thread, before going async.
            net.minecraft.server.MinecraftServer mcServer = src.getServer();
            RankedBingo.BACKEND.postSigned("/link/request", body)
                    .thenAccept(res -> {
                        int status = res.statusCode();
                        String responseBody = res.body();
                        LOGGER.info("[ranked_bingo] thenAccept fired, status={}", status);
                        if (status == 201) {
                            String code = extractJsonString(responseBody, "code");
                            long ttl = extractJsonLong(responseBody, "expires_in_seconds", 300L);
                            if (code == null) {
                                LOGGER.warn("[ranked_bingo] could not extract code from: {}", responseBody);
                                mcServer.execute(() ->
                                        player.sendMessage(net.minecraft.text.Text.literal("Backend returned an unreadable response.").formatted(net.minecraft.util.Formatting.RED), false));
                                return;
                            }
                            RankedBingo.FREEZE_MANAGER.watchForLink(player.getUuid());
                            mcServer.execute(() -> sendCodeMessage(player, code, ttl));
                        } else if (status == 409) {
                            // Already linked — update cache in case they joined before the check resolved.
                            RankedBingo.LINK_CACHE.markLinked(player.getUuid());
                            mcServer.execute(() -> {
                                FreezeManager.unfreeze(player);
                                player.sendMessage(net.minecraft.text.Text.literal("Your Minecraft account is already linked. Use the website to unlink first.").formatted(net.minecraft.util.Formatting.RED), false);
                            });
                        } else {
                            LOGGER.warn("[ranked_bingo] /link returned {} — {}", status, responseBody);
                            mcServer.execute(() ->
                                    player.sendMessage(net.minecraft.text.Text.literal("Could not generate a link code. Try again later.").formatted(net.minecraft.util.Formatting.RED), false));
                        }
                    })
                    .exceptionally(err -> {
                        LOGGER.warn("[ranked_bingo] /link exceptionally: {}", err.toString());
                        mcServer.execute(() ->
                                player.sendMessage(net.minecraft.text.Text.literal("Could not reach the ranked website.").formatted(net.minecraft.util.Formatting.RED), false));
                        return null;
                    });

            src.sendFeedback(() -> Text.literal("Generating link code...").formatted(Formatting.GRAY), false);
            return 1;
        }));
    }

    private static String extractJsonString(String json, String key) {
        String search = "\"" + key + "\":\"";
        int start = json.indexOf(search);
        if (start < 0) return null;
        start += search.length();
        int end = json.indexOf('"', start);
        if (end < 0) return null;
        return json.substring(start, end);
    }

    private static long extractJsonLong(String json, String key, long fallback) {
        String search = "\"" + key + "\":";
        int start = json.indexOf(search);
        if (start < 0) return fallback;
        start += search.length();
        int end = start;
        while (end < json.length() && (Character.isDigit(json.charAt(end)) || json.charAt(end) == '-')) end++;
        try { return Long.parseLong(json.substring(start, end)); } catch (Exception e) { return fallback; }
    }

    private static void sendCodeMessage(ServerPlayerEntity player, String code, long ttlSec) {
        long minutes = ttlSec / 60;
        String siteUrl = RankedBingo.CONFIG.siteUrl;
        Text codePart = Text.literal(code).formatted(Formatting.AQUA, Formatting.BOLD);
        Text line1 = Text.literal("Your link code: ").formatted(Formatting.GREEN).append(codePart);
        Text line2 = Text.literal("Paste it on the website within " + minutes + " minutes: " + siteUrl)
                .formatted(Formatting.GRAY);
        player.sendMessage(line1, false);
        player.sendMessage(line2, false);
    }
}

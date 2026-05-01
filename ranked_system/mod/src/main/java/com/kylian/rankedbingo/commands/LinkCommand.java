package com.kylian.rankedbingo.commands;

import com.google.gson.Gson;
import com.kylian.rankedbingo.RankedBingo;
import com.kylian.rankedbingo.api.Dtos;
import com.mojang.brigadier.CommandDispatcher;
import net.minecraft.server.command.CommandManager;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.ClickEvent;
import net.minecraft.text.HoverEvent;
import net.minecraft.text.Style;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;

/**
 * /link — generates a one-time code linking the player's MC account to the website.
 *
 * Anyone can use it. The backend rejects accounts that are already linked.
 */
public class LinkCommand {
    private static final Gson GSON = new Gson();

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
                    player.getGameProfile().getName()
            );

            // The execute() method sends the request asynchronously and replies
            // to the player on completion — so the command exits immediately.
            RankedBingo.BACKEND.postSigned("/link/request", body)
                    .thenAccept(res -> {
                        // Run on the server thread so chat sends are safe.
                        player.getServer().execute(() -> {
                            if (res.statusCode() == 201) {
                                Dtos.LinkResponse resp;
                                try {
                                    resp = GSON.fromJson(res.body(), Dtos.LinkResponse.class);
                                } catch (Exception e) {
                                    player.sendMessage(Text.literal("Backend returned an unreadable response.").formatted(Formatting.RED), false);
                                    return;
                                }
                                sendCodeMessage(player, resp.code(), resp.expires_in_seconds());
                            } else if (res.statusCode() == 409) {
                                player.sendMessage(Text.literal("Your Minecraft account is already linked. Use the website to unlink first.").formatted(Formatting.RED), false);
                            } else {
                                player.sendMessage(Text.literal("Could not generate a link code. Try again later.").formatted(Formatting.RED), false);
                                RankedBingo.LOGGER.warn("[ranked_bingo] /link returned {} — {}", res.statusCode(), res.body());
                            }
                        });
                    })
                    .exceptionally(err -> {
                        player.getServer().execute(() ->
                                player.sendMessage(Text.literal("Could not reach the ranked website.").formatted(Formatting.RED), false)
                        );
                        return null;
                    });

            src.sendFeedback(() -> Text.literal("Generating link code...").formatted(Formatting.GRAY), false);
            return 1;
        }));
    }

    private static void sendCodeMessage(ServerPlayerEntity player, String code, Long ttlSec) {
        long minutes = (ttlSec == null ? 300 : ttlSec) / 60;
        Text codePart = Text.literal(code).setStyle(Style.EMPTY
                .withColor(Formatting.AQUA)
                .withBold(true)
                .withClickEvent(new ClickEvent(ClickEvent.Action.COPY_TO_CLIPBOARD, code))
                .withHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT, Text.literal("Click to copy")))
        );
        Text line1 = Text.literal("Your link code: ").formatted(Formatting.GREEN).append(codePart);
        Text line2 = Text.literal("Paste it on the website within " + minutes + " minutes.").formatted(Formatting.GRAY);
        player.sendMessage(line1, false);
        player.sendMessage(line2, false);
    }
}

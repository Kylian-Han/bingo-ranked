package com.kylian.rankedbingo;

import com.kylian.rankedbingo.api.BackendClient;
import com.kylian.rankedbingo.commands.LinkCommand;
import com.kylian.rankedbingo.commands.ReportCommand;
import net.fabricmc.api.DedicatedServerModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.server.network.ServerPlayerEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.UUID;

public class RankedBingo implements DedicatedServerModInitializer {
    public static final Logger LOGGER = LoggerFactory.getLogger("RankedBingo");

    public static Config CONFIG;
    public static BackendClient BACKEND;
    public static GameTracker GAME_TRACKER;
    public static PlayerLinkCache LINK_CACHE;
    public static FreezeManager FREEZE_MANAGER;

    @Override
    public void onInitializeServer() {
        CONFIG = Config.load();
        BACKEND = new BackendClient(CONFIG);
        GAME_TRACKER = new GameTracker();
        LINK_CACHE = new PlayerLinkCache();
        FREEZE_MANAGER = new FreezeManager();

        if (!CONFIG.isUsable()) {
            LOGGER.warn("[ranked_bingo] Config missing/invalid — set hmacKey and backendUrl in config/ranked_bingo.json then /reload.");
        } else {
            LOGGER.info("[ranked_bingo] Loaded. Backend: {}", CONFIG.backendUrl);
        }

        CommandRegistrationCallback.EVENT.register((dispatcher, registryAccess, environment) -> {
            LinkCommand.register(dispatcher);
            ReportCommand.register(dispatcher);
        });

        // At join, async-check the backend to populate the link cache.
        ServerPlayConnectionEvents.JOIN.register((handler, sender, server) -> {
            if (!CONFIG.freezeUnlinkedPlayers || !CONFIG.isUsable()) return;
            ServerPlayerEntity player = handler.getPlayer();
            UUID uuid = player.getUuid();
            String path = "/link/status/" + uuid;
            BACKEND.getSigned(path).thenAccept(res -> {
                if (res.statusCode() == 200 && res.body().contains("\"linked\":true")) {
                    LINK_CACHE.markLinked(uuid);
                    LOGGER.info("[ranked_bingo] {} is linked", player.getName().getString());
                } else {
                    LINK_CACHE.markUnlinked(uuid);
                    LOGGER.info("[ranked_bingo] {} is NOT linked — freezing", player.getName().getString());
                }
            }).exceptionally(err -> {
                // Can't reach backend → assume not linked so we stay safe.
                LINK_CACHE.markUnlinked(uuid);
                LOGGER.warn("[ranked_bingo] link-status check failed for {}: {}", uuid, err.toString());
                return null;
            });
        });

        // At disconnect, clean up the cache entry.
        ServerPlayConnectionEvents.DISCONNECT.register((handler, server) -> {
            LINK_CACHE.remove(handler.getPlayer().getUuid());
        });

        ServerTickEvents.END_SERVER_TICK.register(server -> FREEZE_MANAGER.onServerTick(server));
    }
}

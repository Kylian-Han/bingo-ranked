package com.kylian.rankedbingo;

import com.kylian.rankedbingo.api.BackendClient;
import com.kylian.rankedbingo.commands.LinkCommand;
import com.kylian.rankedbingo.commands.ReportCommand;
import net.fabricmc.api.DedicatedServerModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RankedBingo implements DedicatedServerModInitializer {
    public static final Logger LOGGER = LoggerFactory.getLogger("RankedBingo");

    public static Config CONFIG;
    public static BackendClient BACKEND;
    public static GameTracker GAME_TRACKER;

    @Override
    public void onInitializeServer() {
        CONFIG = Config.load();
        BACKEND = new BackendClient(CONFIG);
        GAME_TRACKER = new GameTracker();

        if (!CONFIG.isUsable()) {
            LOGGER.warn("[ranked_bingo] Config missing/invalid — set hmacKey and backendUrl in config/ranked_bingo.json then /reload.");
        } else {
            LOGGER.info("[ranked_bingo] Loaded. Backend: {}", CONFIG.backendUrl);
        }

        CommandRegistrationCallback.EVENT.register((dispatcher, registryAccess, environment) -> {
            LinkCommand.register(dispatcher);
            ReportCommand.register(dispatcher);
        });
    }
}

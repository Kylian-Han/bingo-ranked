package com.kylian.rankedbingo;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Server-side mod configuration loaded from config/ranked_bingo.json on first launch.
 *
 * The HMAC key here MUST match MOD_HMAC_KEY in the backend's environment.
 * If they ever drift, the backend will reject every game-end POST.
 */
public class Config {
    private static final Logger LOGGER = LoggerFactory.getLogger("RankedBingo");
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    public String backendUrl = "http://localhost:3000/api";
    public String hmacKey = "REPLACE_WITH_SHARED_SECRET";
    public boolean reportingEnabled = true;

    public static Config load() {
        Path path = FabricLoader.getInstance().getConfigDir().resolve("ranked_bingo.json");
        try {
            if (!Files.exists(path)) {
                Config defaults = new Config();
                Files.writeString(path, GSON.toJson(defaults));
                LOGGER.warn("[ranked_bingo] Wrote default config to {} — set hmacKey before going live.", path);
                return defaults;
            }
            return GSON.fromJson(Files.readString(path), Config.class);
        } catch (IOException e) {
            LOGGER.error("[ranked_bingo] Failed to load config, using defaults", e);
            return new Config();
        }
    }

    public boolean isUsable() {
        return backendUrl != null
            && !backendUrl.isBlank()
            && hmacKey != null
            && !hmacKey.isBlank()
            && !"REPLACE_WITH_SHARED_SECRET".equals(hmacKey);
    }
}

package com.kylian.rankedbingo;

import net.minecraft.entity.effect.StatusEffectInstance;
import net.minecraft.entity.effect.StatusEffects;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import net.minecraft.world.World;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Every tick, teleports any unlinked player who has drifted >1 block from spawn back
 * to spawn — so the TP triggers on movement, not on a polling interval.
 * Effects (Slowness + Mining Fatigue 255) are renewed every 20 ticks (1 s).
 * A reminder message is sent every 200 ticks (10 s).
 * Backend re-poll every 600 ticks (30 s) normally, every 2 s after /link until confirmed.
 * All of this is skipped while a bingo game is running.
 */
public class FreezeManager {
    private static final int EFFECT_INTERVAL_TICKS  = 20;
    private static final int MESSAGE_INTERVAL_TICKS  = 200;
    private static final int RECHECK_INTERVAL_TICKS  = 600;
    private static final int FAST_RECHECK_TICKS      = 40;   // 2 s
    private static final int FAST_RECHECK_DURATION   = 2400; // 2 min total

    private int tickCounter = 0;

    // uuid → tick at which fast-recheck was requested
    private final Map<UUID, Integer> pendingLink = new ConcurrentHashMap<>();

    /** Call after /link so the backend is polled every 2 s until confirmed. */
    public void watchForLink(UUID uuid) {
        pendingLink.put(uuid, tickCounter);
    }

    public void onServerTick(MinecraftServer server) {
        if (!RankedBingo.CONFIG.freezeUnlinkedPlayers) return;
        if (RankedBingo.GAME_TRACKER.isRunning()) return;

        tickCounter++;

        ServerWorld overworld = server.getWorld(World.OVERWORLD);
        if (overworld == null) return;

        boolean renewEffects = (tickCounter % EFFECT_INTERVAL_TICKS == 0);
        boolean sendMessage  = (tickCounter % MESSAGE_INTERVAL_TICKS == 0);
        boolean slowRecheck  = (tickCounter % RECHECK_INTERVAL_TICKS == 0);

        for (ServerPlayerEntity player : server.getPlayerManager().getPlayerList()) {
            UUID uuid = player.getUuid();
            if (RankedBingo.LINK_CACHE.isLinked(uuid)) {
                pendingLink.remove(uuid);
                continue;
            }

            // Fast recheck every 2 s for players who just did /link.
            Integer watchedSince = pendingLink.get(uuid);
            boolean fastRecheck = false;
            if (watchedSince != null) {
                int elapsed = tickCounter - watchedSince;
                if (elapsed > FAST_RECHECK_DURATION) {
                    pendingLink.remove(uuid); // timed out
                } else {
                    fastRecheck = (tickCounter % FAST_RECHECK_TICKS == 0);
                }
            }

            if ((slowRecheck || fastRecheck) && RankedBingo.CONFIG.isUsable()) {
                recheckLinkStatus(player, server);
            }

            teleportIfDrifted(player);

            if (renewEffects) applyFreezeEffects(player);

            if (sendMessage) {
                player.sendMessage(
                    Text.literal("Lie ton compte sur https://kylian-han.github.io/bingo-ranked/ pour jouer !")
                        .formatted(Formatting.RED),
                    false
                );
            }
        }
    }

    private void recheckLinkStatus(ServerPlayerEntity player, MinecraftServer server) {
        UUID uuid = player.getUuid();
        RankedBingo.BACKEND.getSigned("/link/status/" + uuid).thenAccept(res -> {
            if (res.statusCode() == 200 && res.body().contains("\"linked\":true")) {
                RankedBingo.LINK_CACHE.markLinked(uuid);
                pendingLink.remove(uuid);
                server.execute(() -> unfreeze(player));
            }
        }).exceptionally(err -> {
            RankedBingo.LOGGER.warn("[ranked_bingo] recheck failed for {}: {}", uuid, err.toString());
            return null;
        });
    }

    private void teleportIfDrifted(ServerPlayerEntity player) {
        Config cfg = RankedBingo.CONFIG;
        double dx = player.getX() - cfg.spawnX;
        double dy = player.getY() - cfg.spawnY;
        double dz = player.getZ() - cfg.spawnZ;
        if (dx * dx + dy * dy + dz * dz > 1.0) {
            player.requestTeleport(cfg.spawnX, cfg.spawnY, cfg.spawnZ);
        }
    }

    private void applyFreezeEffects(ServerPlayerEntity player) {
        // Duration slightly longer than the renewal interval so they never flicker off.
        player.addStatusEffect(new StatusEffectInstance(
            StatusEffects.SLOWNESS, EFFECT_INTERVAL_TICKS + 5, 255, false, false, false));
        player.addStatusEffect(new StatusEffectInstance(
            StatusEffects.MINING_FATIGUE, EFFECT_INTERVAL_TICKS + 5, 255, false, false, false));
    }

    /** Call when a player is confirmed linked so effects are cleared immediately. */
    public static void unfreeze(ServerPlayerEntity player) {
        player.removeStatusEffect(StatusEffects.SLOWNESS);
        player.removeStatusEffect(StatusEffects.MINING_FATIGUE);
        player.sendMessage(
            Text.literal("Compte lié ! Tu peux maintenant jouer.").formatted(Formatting.GREEN),
            false
        );
    }
}

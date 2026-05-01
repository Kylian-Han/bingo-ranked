package com.kylian.rankedbingo;

import net.minecraft.entity.effect.StatusEffectInstance;
import net.minecraft.entity.effect.StatusEffects;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;

import java.util.UUID;

/**
 * Every 20 ticks (1 s), teleports and re-freezes every online player whose UUID
 * is not in the link cache — unless a bingo game is currently running, in which
 * case we leave them alone so they can play.
 *
 * Freeze is implemented with Slowness 255 + Mining Fatigue 255 (both short-duration,
 * renewed every cycle) so the player cannot move or break blocks.
 *
 * Every 600 ticks (30 s) we re-poll the backend for each frozen player so that a
 * link completed on the website while the player is already online takes effect
 * without requiring a reconnect.
 */
public class FreezeManager {
    private static final int CHECK_INTERVAL_TICKS = 20;
    private static final int MESSAGE_INTERVAL_TICKS = 200;  // 10 s
    private static final int RECHECK_INTERVAL_TICKS = 600;  // 30 s

    private int tickCounter = 0;

    public void onServerTick(MinecraftServer server) {
        if (!RankedBingo.CONFIG.freezeUnlinkedPlayers) return;
        tickCounter++;

        if (tickCounter % CHECK_INTERVAL_TICKS != 0) return;

        // Don't interrupt an ongoing bingo game.
        if (RankedBingo.GAME_TRACKER.isRunning()) return;

        ServerWorld overworld = server.getWorld(World.OVERWORLD);
        if (overworld == null) return;

        boolean sendMessage = (tickCounter % MESSAGE_INTERVAL_TICKS == 0);
        boolean recheck = (tickCounter % RECHECK_INTERVAL_TICKS == 0);

        for (ServerPlayerEntity player : server.getPlayerManager().getPlayerList()) {
            UUID uuid = player.getUuid();

            if (RankedBingo.LINK_CACHE.isLinked(uuid)) continue;

            // Async re-poll so a web-side link is picked up without reconnect.
            if (recheck && RankedBingo.CONFIG.isUsable()) {
                recheckLinkStatus(player, server);
            }

            teleportToSpawn(player, overworld);
            applyFreezeEffects(player);

            if (sendMessage) {
                player.sendMessage(
                    Text.literal("Lie ton compte Minecraft sur le site pour jouer ! (/link)")
                        .formatted(Formatting.RED),
                    true // action bar
                );
            }
        }
    }

    private void recheckLinkStatus(ServerPlayerEntity player, MinecraftServer server) {
        UUID uuid = player.getUuid();
        RankedBingo.BACKEND.getSigned("/link/status/" + uuid).thenAccept(res -> {
            if (res.statusCode() == 200 && res.body().contains("\"linked\":true")) {
                RankedBingo.LINK_CACHE.markLinked(uuid);
                server.execute(() -> unfreeze(player));
            }
        }).exceptionally(err -> {
            RankedBingo.LOGGER.warn("[ranked_bingo] recheck failed for {}: {}", uuid, err.toString());
            return null;
        });
    }

    private void teleportToSpawn(ServerPlayerEntity player, ServerWorld overworld) {
        Config cfg = RankedBingo.CONFIG;
        if (player.getWorld() != overworld) {
            player.teleport(overworld, cfg.spawnX, cfg.spawnY, cfg.spawnZ, cfg.spawnYaw, cfg.spawnPitch);
        } else {
            Vec3d pos = player.getPos();
            double dx = pos.x - cfg.spawnX;
            double dy = pos.y - cfg.spawnY;
            double dz = pos.z - cfg.spawnZ;
            // Only tp if they've drifted more than 1 block to avoid constant micro-tp.
            if (dx * dx + dy * dy + dz * dz > 1.0) {
                player.teleport(overworld, cfg.spawnX, cfg.spawnY, cfg.spawnZ, cfg.spawnYaw, cfg.spawnPitch);
            }
        }
    }

    private void applyFreezeEffects(ServerPlayerEntity player) {
        // Renew every tick cycle so the effects never expire.
        player.addStatusEffect(new StatusEffectInstance(
            StatusEffects.SLOWNESS, CHECK_INTERVAL_TICKS + 5, 255, false, false, false));
        player.addStatusEffect(new StatusEffectInstance(
            StatusEffects.MINING_FATIGUE, CHECK_INTERVAL_TICKS + 5, 255, false, false, false));
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

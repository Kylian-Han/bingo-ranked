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
 * Every tick, teleports any unlinked player who has drifted >1 block from spawn back
 * to spawn — so the TP triggers on movement, not on a polling interval.
 * Effects (Slowness + Mining Fatigue 255) are renewed every 20 ticks (1 s).
 * A reminder message is sent every 200 ticks (10 s).
 * Backend re-poll every 600 ticks (30 s) so a web-side link is picked up without reconnect.
 * All of this is skipped while a bingo game is running.
 */
public class FreezeManager {
    private static final int EFFECT_INTERVAL_TICKS = 20;
    private static final int MESSAGE_INTERVAL_TICKS = 200;
    private static final int RECHECK_INTERVAL_TICKS = 600;

    private int tickCounter = 0;

    public void onServerTick(MinecraftServer server) {
        if (!RankedBingo.CONFIG.freezeUnlinkedPlayers) return;
        if (RankedBingo.GAME_TRACKER.isRunning()) return;

        tickCounter++;

        ServerWorld overworld = server.getWorld(World.OVERWORLD);
        if (overworld == null) return;

        boolean renewEffects = (tickCounter % EFFECT_INTERVAL_TICKS == 0);
        boolean sendMessage  = (tickCounter % MESSAGE_INTERVAL_TICKS == 0);
        boolean recheck      = (tickCounter % RECHECK_INTERVAL_TICKS == 0);

        for (ServerPlayerEntity player : server.getPlayerManager().getPlayerList()) {
            UUID uuid = player.getUuid();
            if (RankedBingo.LINK_CACHE.isLinked(uuid)) continue;

            if (recheck && RankedBingo.CONFIG.isUsable()) {
                recheckLinkStatus(player, server);
            }

            // TP immediately whenever the player has moved >1 block from spawn.
            teleportIfDrifted(player, overworld);

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
                server.execute(() -> unfreeze(player));
            }
        }).exceptionally(err -> {
            RankedBingo.LOGGER.warn("[ranked_bingo] recheck failed for {}: {}", uuid, err.toString());
            return null;
        });
    }

    private void teleportIfDrifted(ServerPlayerEntity player, ServerWorld overworld) {
        Config cfg = RankedBingo.CONFIG;
        if (player.getWorld() != overworld) {
            player.teleport(overworld, cfg.spawnX, cfg.spawnY, cfg.spawnZ, cfg.spawnYaw, cfg.spawnPitch);
            return;
        }
        Vec3d pos = player.getPos();
        double dx = pos.x - cfg.spawnX;
        double dy = pos.y - cfg.spawnY;
        double dz = pos.z - cfg.spawnZ;
        if (dx * dx + dy * dy + dz * dz > 1.0) {
            player.teleport(overworld, cfg.spawnX, cfg.spawnY, cfg.spawnZ, cfg.spawnYaw, cfg.spawnPitch);
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

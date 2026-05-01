package com.kylian.rankedbingo;

import java.util.Collections;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe in-memory set of MC UUIDs that are known to be linked to a site
 * account. Populated at login via a backend check; updated immediately when a
 * /link succeeds so the player is unfrozen without waiting for the next poll.
 */
public class PlayerLinkCache {
    private final Set<UUID> linked = Collections.newSetFromMap(new ConcurrentHashMap<>());

    public void markLinked(UUID uuid) {
        linked.add(uuid);
    }

    public void markUnlinked(UUID uuid) {
        linked.remove(uuid);
    }

    public boolean isLinked(UUID uuid) {
        return linked.contains(uuid);
    }

    public void remove(UUID uuid) {
        linked.remove(uuid);
    }
}

# Build & deploy the Fabric mod

The mod runs on your Minecraft server. It does two things:

- Registers `/link` for players (calls the backend, returns a code).
- Registers `/rankedreport` for ops/datapacks (called from the bingo pack at
  game start and end; it gathers participants and POSTs to the backend).

## 1. Match versions

Open `mod/gradle.properties` and set the three top values to match your server:

```properties
minecraft_version=1.21.1
yarn_mappings=1.21.1+build.3
loader_version=0.16.5
fabric_version=0.102.0+1.21.1
```

Pick versions from https://fabricmc.net/develop/ — `minecraft_version`,
`yarn_mappings` and `fabric_version` must agree on the same Minecraft release.

## 2. Build the JAR

Requires JDK 21 installed (https://adoptium.net).

```bash
cd mod
./gradlew build         # macOS/Linux
gradlew.bat build       # Windows
```

> First run? The wrapper isn't included. Run `gradle wrapper --gradle-version 8.10`
> once (requires a system-wide gradle, https://gradle.org/install/), then use
> `./gradlew` from then on.

The built mod lands in `build/libs/ranked-bingo-0.1.0.jar`. The `-sources.jar`
next to it is for IDEs only — don't upload it to the server.

## 3. Configure the mod

Drop the JAR into the server's `mods/` folder and start the server **once** so
the mod can write `config/ranked_bingo.json`. Stop the server, edit that file:

```json
{
  "backendUrl": "https://your-app-name.fly.dev/api",
  "hmacKey": "<the-MOD_HMAC_KEY-you-saved-during-backend-deploy>",
  "reportingEnabled": true
}
```

The `hmacKey` MUST match `MOD_HMAC_KEY` in the backend's environment, byte for
byte. If they differ, the backend rejects every POST with `bad_signature`.

Restart the server. You should see in the log:
```
[ranked_bingo] Loaded. Backend: https://your-app-name.fly.dev/api
```

## 4. Aternos specifics

Aternos supports Fabric servers and custom mods:

1. Server panel → **Software** → switch to **Fabric** matching your bingo's MC version.
2. Server panel → **Files** → **Mods** → upload the `ranked-bingo-x.y.z.jar`.
   Also make sure **Fabric API** is uploaded (download from
   https://modrinth.com/mod/fabric-api matching your MC version).
3. Start the server once to generate the config.
4. Server panel → **Files** → `config/ranked_bingo.json` → edit it as above.
5. Save and start.

Aternos lets outbound HTTPS through, so the mod can reach Fly.io fine.

## 5. Test it

In-game, run `/link` as any player. You should see a code in chat. Pick it up
on the website's dashboard.

Run `/rankedreport start normal` and `/rankedreport end red none` as an op.
Check the backend log — you should see `Game ... reported (...)` and the new
game on the leaderboard.

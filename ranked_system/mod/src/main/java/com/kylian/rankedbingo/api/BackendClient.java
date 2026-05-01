package com.kylian.rankedbingo.api;

import com.google.gson.Gson;
import com.kylian.rankedbingo.Config;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.HexFormat;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;

/**
 * HTTP client for the ranked backend. All requests carry an HMAC-SHA256 signature
 * over "{timestamp}.{nonce}.{body}" so the backend can verify they came from this
 * mod and weren't replayed.
 *
 * Calls are async (CompletableFuture) so we never block the server thread on
 * network I/O. Failures are logged but never thrown back into Minecraft.
 */
public class BackendClient {
    private static final Logger LOGGER = LoggerFactory.getLogger("RankedBingo/Backend");
    private static final Gson GSON = new Gson();
    private static final SecureRandom RANDOM = new SecureRandom();

    private final HttpClient http;
    private final Config config;

    public BackendClient(Config config) {
        this.config = config;
        this.http = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(10))
                .executor(Executors.newSingleThreadExecutor(r -> {
                    Thread t = new Thread(r, "ranked-bingo-http");
                    t.setDaemon(true);
                    return t;
                }))
                .build();
    }

    public CompletableFuture<HttpResponse<String>> postSigned(String path, Object payload) {
        if (!config.isUsable()) {
            CompletableFuture<HttpResponse<String>> failed = new CompletableFuture<>();
            failed.completeExceptionally(new IllegalStateException("RankedBingo not configured"));
            return failed;
        }
        String body = GSON.toJson(payload);
        long timestamp = System.currentTimeMillis();
        String nonce = randomHex(16);
        String signature = sign(timestamp, nonce, body);

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(config.backendUrl + path))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .header("X-Timestamp", Long.toString(timestamp))
                .header("X-Nonce", nonce)
                .header("X-Signature", signature)
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();

        return http.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                .whenComplete((res, err) -> {
                    if (err != null) {
                        LOGGER.warn("[ranked_bingo] {} request failed: {}", path, err.toString());
                    } else if (res.statusCode() >= 400) {
                        LOGGER.warn("[ranked_bingo] {} returned {} — {}", path, res.statusCode(), res.body());
                    }
                });
    }

    private String sign(long timestamp, String nonce, String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(config.hmacKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String payload = timestamp + "." + nonce + "." + body;
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException("HMAC failed", e);
        }
    }

    private static String randomHex(int bytes) {
        byte[] buf = new byte[bytes];
        RANDOM.nextBytes(buf);
        return HexFormat.of().formatHex(buf);
    }
}

import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value || value.startsWith('replace-me')) {
    throw new Error(`Missing or placeholder env var: ${name}. See .env.example.`);
  }
  return value;
}

function int(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) throw new Error(`Env var ${name} must be an integer`);
  return n;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: int('PORT', 3000),
  dbPath: process.env.DB_PATH ?? './data/ranked.db',

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTtl: int('ACCESS_TOKEN_TTL_SECONDS', 3600),
    refreshTtl: int('REFRESH_TOKEN_TTL_SECONDS', 60 * 60 * 24 * 30),
  },

  modHmacKey: required('MOD_HMAC_KEY'),

  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  rateLimit: {
    authMax: int('RATE_LIMIT_AUTH_MAX', 5),
    authWindowMs: int('RATE_LIMIT_AUTH_WINDOW_MS', 10 * 60 * 1000),
  },
};

export const isProd = config.env === 'production';

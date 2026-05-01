import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config, isProd } from './config.js';
// Importing the db module (transitively, via the route files) auto-runs migrations.
import { errorHandler, notFoundHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import linkRoutes from './routes/link.js';
import gameRoutes from './routes/games.js';
import leaderboardRoutes from './routes/leaderboard.js';
import profileRoutes from './routes/profile.js';
import adminRoutes from './routes/admin.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // We sit behind Fly.io's proxy in prod.

app.use(
  helmet({
    contentSecurityPolicy: false, // Frontend is on a separate origin (GitHub Pages).
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

const corsOptions = {
  origin(origin, cb) {
    // Allow tools like curl/Postman (no Origin header) and listed origins.
    if (!origin || config.allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('cors_not_allowed'));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Signature',
    'X-Timestamp',
    'X-Nonce',
  ],
  maxAge: 86400,
};
app.use(cors(corsOptions));

// Capture raw body so HMAC middleware can verify signatures over the exact bytes
// the client sent. Must run before any route or body-parsing middleware.
app.use(
  express.json({
    limit: '64kb',
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  }),
);

app.get('/health', (_req, res) => res.json({ ok: true, env: config.env }));

app.use('/api/auth', authRoutes);
app.use('/api/link', linkRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/players', profileRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`[server] listening on :${config.port} (${config.env})`);
  if (!isProd) {
    console.log('[server] allowed origins:', config.allowedOrigins.join(', ') || '(none)');
  }
});

function shutdown(signal) {
  console.log(`[server] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

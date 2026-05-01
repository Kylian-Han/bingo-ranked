import { ZodError } from 'zod';
import { isProd } from '../config.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'not_found' });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'validation_error',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err?.status && err?.code) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }

  console.error('[error]', err);
  res.status(500).json({
    error: 'internal_error',
    ...(isProd ? {} : { message: err?.message ?? String(err) }),
  });
}

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

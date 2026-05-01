import { verifyAccessToken } from '../utils/jwt.js';
import { db } from '../db/database.js';

const findUser = db.prepare('SELECT id, username, email FROM users WHERE id = ?');

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    const user = findUser.get(Number(payload.sub));
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

import { verifyAccessToken } from '../utils/jwt.js';
import { db } from '../db/database.js';

const findUser = db.prepare('SELECT id, username, email, is_admin FROM users WHERE id = ?');

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    const user = findUser.get(Number(payload.sub));
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    // Re-checked in DB every request — revocation is immediate.
    if (!user.is_admin) return res.status(403).json({ error: 'forbidden' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

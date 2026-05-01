#!/usr/bin/env node
// Usage: node scripts/set-admin.js <username>
// Sets is_admin=1 for the given user. Run once to bootstrap yourself.

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(here, '..', 'data', 'ranked.db');

const username = process.argv[2];
if (!username) {
  console.error('Usage: node scripts/set-admin.js <username>');
  process.exit(1);
}

mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

const user = db.prepare('SELECT id, username, is_admin FROM users WHERE username = ?').get(username);
if (!user) {
  console.error(`User "${username}" not found.`);
  process.exit(1);
}

if (user.is_admin) {
  console.log(`"${username}" is already admin.`);
  process.exit(0);
}

db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(user.id);
console.log(`"${username}" is now admin.`);

// CLI entry point for running migrations explicitly (e.g. `npm run migrate`).
// In normal operation this isn't needed — importing ./database.js already runs
// pending migrations on load. Useful for CI / one-off tooling.
import './database.js';
console.log('[migrate] done');

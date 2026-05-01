# Deploy the frontend (GitHub Pages)

The frontend is a handful of static HTML/CSS/JS files. GitHub Pages is the
simplest place to host them, and they reach the backend on Fly.io over HTTPS.

## 1. Point it at your backend

Edit `frontend/js/config.js`:

```js
window.RANKED_CONFIG = {
  API_BASE: 'https://your-app-name.fly.dev/api',
  SITE_NAME: 'Bingo Ranked',
};
```

This is the only file you need to edit. No build step, no bundler.

## 2. Push to a GitHub repo

Two layouts work — pick one.

### Option A — dedicated user/site repo (cleanest URL)

If you want `https://YOURUSER.github.io/` (no path), create a repo named
**exactly** `YOURUSER.github.io` and push the contents of `frontend/` to its
`main` branch.

```bash
cd frontend
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOURUSER/YOURUSER.github.io.git
git push -u origin main
```

GitHub auto-publishes the `main` branch of that repo at your subdomain. No
extra setting needed.

### Option B — project repo (URL has a path)

Push `frontend/` into any repo (e.g. `bingo-ranked-site`). On GitHub:
**Settings → Pages → Source: Deploy from a branch → main → / (root)**.

URL becomes `https://YOURUSER.github.io/bingo-ranked-site/`.

## 3. Update CORS on the backend

GitHub Pages assigns the origin **without** a trailing slash. Tell the backend
to allow it:

```bash
fly secrets set ALLOWED_ORIGINS="https://YOURUSER.github.io"
fly deploy
```

For Option B (project subpath), the origin is still
`https://YOURUSER.github.io` (the path doesn't matter to CORS), so the same
secret works.

## 4. Verify

Open the site, register an account, log in. Then in another tab try
`/leaderboard` and `/players/<your-username>` — they should respond without
CORS errors in the console.

## Custom domain later

GitHub Pages supports custom domains. When you switch:
1. Add a `CNAME` file at the repo root with your domain.
2. Update DNS as GitHub instructs.
3. Re-run `fly secrets set ALLOWED_ORIGINS="https://yourdomain.com"`.
4. `fly deploy`.

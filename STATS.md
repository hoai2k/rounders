# Stats: who is playing, and from where

The game is a static site on GitHub Pages, so the page itself can never see a
visitor's IP or country — Pages gives no server-side hook and writes no logs you
can read. Anything that answers *"is anyone I don't know playing this?"* needs
one small thing that runs at request time.

That thing is `worker/worker.js`: a single free-tier Cloudflare Worker with a D1
database. The game beacons a page view to it, Cloudflare tells the worker which
country/region/city the request came from, and the dashboard at
**`/stats/`** ([live](https://hoai2k.github.io/rounders/stats/)) reads the
aggregates back behind a token.

Nothing is switched on until the endpoint in `js/stats-config.js` is filled in.
A fresh clone sends no network traffic at all.

## What is recorded

Per page view: timestamp, path, referring **host** (not the full URL), country,
region, city, timezone, browser family, platform, screen size, language, and a
visitor hash.

What is **not** recorded: no cookies, no localStorage identifier, no IP address
and no full user-agent string. The visitor hash is
`SHA-256(day + secret salt + IP + user agent)`, truncated — enough to count a
person once per day, useless for following them across days or back to an
address. `DNT: 1` browsers are skipped entirely, obvious bots are dropped, and
rows are deleted after 400 days.

To keep your own visits out of it, run this in the browser console once:

```js
localStorage.setItem("rounders.stats.optout", "1")
```

## Setup (about ten minutes, free)

1. **Install wrangler and log in** (a free Cloudflare account is enough — no
   domain and no card needed):

   ```bash
   npx wrangler login
   ```

2. **Create the database** and paste the id it prints into `worker/wrangler.toml`:

   ```bash
   cd worker
   npx wrangler d1 create rounders-stats
   ```

3. **Create the table** in both the remote and (optionally) local database:

   ```bash
   npx wrangler d1 execute rounders-stats --remote --file=schema.sql
   ```

4. **Set the two secrets.** `STATS_TOKEN` is the password for the dashboard,
   `HASH_SALT` is any long random string — both are just text you invent:

   ```bash
   npx wrangler secret put STATS_TOKEN
   npx wrangler secret put HASH_SALT
   ```

5. **Deploy**:

   ```bash
   npx wrangler deploy
   ```

   It prints a URL like `https://rounders-stats.<your-name>.workers.dev`.

6. **Point the game at it** — one line in `js/stats-config.js`:

   ```js
   window.ROUNDERS_STATS = {
     endpoint: "https://rounders-stats.your-name.workers.dev"
   };
   ```

   Commit and push to `main`; Pages redeploys and collection starts.

7. **Open the dashboard** at `https://hoai2k.github.io/rounders/stats/`, paste
   the same URL and your `STATS_TOKEN`. The token is kept in that browser's
   localStorage, so it is asked for once per device. Anyone without it sees the
   unlock form and nothing else.

`ALLOWED_ORIGINS` in `wrangler.toml` lists the sites allowed to send beacons and
read stats; the local server (`http://127.0.0.1:4173`) is already in the list, so
`npm start` → <http://127.0.0.1:4173/stats/> works against the deployed worker too.

## Reading the dashboard

- **Tiles** — views, unique visitors (per day), distinct countries, and how many
  places showed up for the first time inside the selected range.
- **Traffic by day** — blue bars are views, the pink inner bar is unique visitors.
- **Where from / towns and cities** — the answer to "who is out there": your own
  city will dominate, and anything else is somebody who found it.
- **Places seen for the first time** — sorted newest first and tagged `new` when
  the first sighting falls inside the range. This is the one to check.
- **Arrived from** — the referring host, so a link posted somewhere shows up.
- **Latest visits** — the last 100 hits, city by city.

The game also sends a `match_start` event when a match begins, so the "pages and
events" panel separates people who actually played from people who only looked.

## Alternatives, if a worker is too much

- **GoatCounter** (free for personal use) or **Cloudflare Web Analytics** — one
  script tag, country-level data, dashboard on their site rather than at
  `/stats/`. Neither gives city-level detail.
- **Moving hosting** to Cloudflare Pages or Netlify would let the same collector
  live at `/collect` on the game's own domain instead of a `workers.dev` one.

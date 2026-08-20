# Stats: who is playing, and from where

The game is a static site on GitHub Pages, so the page itself can never see a
visitor's country — Pages gives no server-side hook and writes no logs you can
read. Something off-site has to do the counting.

That something is [GoatCounter](https://www.goatcounter.com): free for personal
use, open source, cookieless, and no account beyond an email address. The game
loads its 3 KB `count.js`, and the dashboard at **`/stats/`**
([live](https://hoai2k.github.io/rounders/stats/)) frames your GoatCounter
dashboard so the numbers live at a Rounders URL.

Nothing is switched on until the site code in `js/stats-config.js` is filled in.
A fresh clone loads no analytics script and makes no requests at all.

## What you get

- **Locations** — country and region (US states, English counties and so on).
  GoatCounter deliberately does **not** resolve cities; country + region is as
  precise as it goes. If a play shows up from a region nobody you know lives in,
  that is a stranger who found the game.
- **Referrers** — where a visit came from, so a link posted somewhere shows up.
- **Browsers, systems, screen sizes, languages.**
- **Pages and events** — the game sends a `match_start` event when a match
  begins, so the people who played are told apart from the people who only
  looked.

## What is recorded

No cookies, no localStorage identifier, no IP address stored, no cross-site
tracking. GoatCounter keeps a country, a region, a browser, a system, a screen
size and the referring page; visitors are counted for a day with a salted hash
that is rotated and thrown away. `DNT: 1` browsers never load the script at all,
and neither do visits to `localhost` or `file://` — `npm start` cannot pollute
the real numbers.

To keep your own visits out of it, run this in the browser console once:

```js
localStorage.setItem("rounders.stats.optout", "1")
```

(Or use GoatCounter's own toggle: load the game with `#toggle-goatcounter` on
the end of the URL.)

## Setup (about five minutes, free, no card)

1. ~~**Create a site**~~ — done: the code is `hoai`, so the dashboard lives at
   <https://hoai.goatcounter.com>.

2. ~~**Point the game at it**~~ — done, in `js/stats-config.js`:

   ```js
   window.ROUNDERS_STATS = {
     site: "hoai"
   };
   ```

   Counting starts as soon as this is live on `main`.

3. **Let this site frame the dashboard.** In GoatCounter, go to
   **Settings → Sites that can embed GoatCounter** and add `hoai2k.github.io`.
   Without this the frame at `/stats/` stays blank (the dashboard still works
   at <https://hoai.goatcounter.com>).

4. **Decide who may read the stats.** Under **Settings → Dashboard viewable
   by**:
   - *Public* — anyone with the link sees the numbers, and `/stats/` needs no
     token.
   - *Logged in users, or with secret token* — copy the token and paste it into
     `/stats/` once. It is stored in that browser's localStorage only, never in
     the repository, so it is asked for once per device.

   As of writing, `hoai.goatcounter.com` redirects to a login page, so it is on
   the second setting: `/stats/` needs a token pasted in once per device, or
   flip it to public.

5. **Open `/stats/`** — the site code is already filled in, so it is only the
   token (if any) that is asked for.

## Known limits

- **Content blockers.** uBlock Origin and friends block `goatcounter.com` and
  `gc.zgo.at`, so a slice of visitors is invisible and real traffic is somewhat
  higher than reported. This is true of every hosted analytics service.
- **No city detail.** Country and region only — see above.
- **GoatCounter holds the data**, not this repository. Exports (CSV) and an API
  are available from your GoatCounter account if you ever want it locally.

## If you outgrow it

GoatCounter can be [self-hosted](https://github.com/arp242/goatcounter) as a
single Go binary if you ever want the data on your own box; set the `url` field
in `js/stats-config.js` to its base URL and both the beacon and `/stats/` follow
it. A collector running on your own hosting (Cloudflare Workers, Netlify,
Deno Deploy) is the other route, and is the only way to get city-level detail;
it needs an account with that provider, which is exactly what this setup avoids.

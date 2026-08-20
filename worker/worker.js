/**
 * Rounders stats collector — a single Cloudflare Worker.
 *
 * Two routes:
 *   POST /collect  the game beacons a page view or an event here
 *   GET  /stats    the dashboard at /stats/ reads aggregates here (token-gated)
 *
 * Cloudflare hands every request a `cf` object with the visitor's country,
 * region, city and timezone already resolved, so no IP is ever stored: the
 * only per-visitor value kept is a hash of IP + user agent salted with the
 * current day, which makes a visitor countable but not identifiable and
 * unlinkable across days.
 *
 * Setup lives in ../STATS.md.
 */

const CORS_HEADERS = {
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400"
};

const MAX_BODY = 2048;      // a beacon is a few hundred bytes; anything larger is junk
const MAX_DAYS = 365;
const RETENTION_DAYS = 400; // rows older than this are purged opportunistically

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = originAllowed(request.headers.get("origin"), env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsFor(origin) });
    }
    if (url.pathname === "/collect" && request.method === "POST") {
      return collect(request, env, ctx, origin);
    }
    if (url.pathname === "/stats" && request.method === "GET") {
      return stats(request, env, url, origin);
    }
    return json({ error: "not found" }, 404, origin);
  }
};

/* ---------------------------------------------------------------- collect */

async function collect(request, env, ctx, origin) {
  // A beacon never tells the player anything, so failures stay quiet: the
  // game must not care whether stats are up.
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ ok: true }, 200, origin);
    const body = raw ? JSON.parse(raw) : {};

    const ua = request.headers.get("user-agent") || "";
    if (looksAutomated(ua)) return json({ ok: true }, 200, origin);

    const cf = request.cf || {};
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const visitor = await visitorHash(request, ua, day, env);

    await env.DB.prepare(
      `INSERT INTO hits
         (ts, day, kind, path, referrer, country, region, city, timezone,
          browser, platform, screen, language, visitor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      now.toISOString(),
      day,
      clip(body.e, 40) || "view",
      clip(body.p, 200) || "/",
      referrerHost(body.r),
      cf.country || "??",
      clip(cf.region, 80) || "",
      clip(cf.city, 80) || "",
      clip(cf.timezone, 60) || "",
      browserFamily(ua),
      platformFamily(ua),
      clip(body.s, 20) || "",
      clip(body.l, 16) || "",
      visitor
    ).run();

    // Purge on roughly one in a hundred writes rather than on a schedule.
    if (Math.random() < 0.01) {
      ctx.waitUntil(
        env.DB.prepare("DELETE FROM hits WHERE day < ?")
          .bind(daysAgo(RETENTION_DAYS))
          .run()
      );
    }
  } catch {
    /* a dropped beacon is not worth a error to the client */
  }
  return json({ ok: true }, 200, origin);
}

/* ------------------------------------------------------------------ stats */

async function stats(request, env, url, origin) {
  const token = url.searchParams.get("token") || "";
  if (!env.STATS_TOKEN || !timingSafeEqual(token, env.STATS_TOKEN)) {
    return json({ error: "unauthorized" }, 401, origin);
  }

  const days = clampInt(url.searchParams.get("days"), 1, MAX_DAYS, 30);
  const since = daysAgo(days - 1);
  const q = (sql, ...binds) => env.DB.prepare(sql).bind(...binds).all();

  const [totals, byDay, byCountry, byCity, byReferrer, byBrowser, byPath, recent, firstSeen] =
    await Promise.all([
      q(`SELECT COUNT(*) AS views,
                COUNT(DISTINCT visitor) AS visitors,
                COUNT(DISTINCT country) AS countries
           FROM hits WHERE day >= ?`, since),
      q(`SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
           FROM hits WHERE day >= ? GROUP BY day ORDER BY day`, since),
      q(`SELECT country, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
           FROM hits WHERE day >= ? GROUP BY country
          ORDER BY visitors DESC, views DESC LIMIT 60`, since),
      q(`SELECT country, region, city,
                COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors,
                MAX(ts) AS last_seen
           FROM hits WHERE day >= ? AND city <> '' GROUP BY country, region, city
          ORDER BY visitors DESC, views DESC LIMIT 60`, since),
      q(`SELECT referrer, COUNT(*) AS views
           FROM hits WHERE day >= ? AND referrer <> '' GROUP BY referrer
          ORDER BY views DESC LIMIT 20`, since),
      q(`SELECT browser, platform, COUNT(*) AS views
           FROM hits WHERE day >= ? GROUP BY browser, platform
          ORDER BY views DESC LIMIT 20`, since),
      q(`SELECT path, kind, COUNT(*) AS views
           FROM hits WHERE day >= ? GROUP BY path, kind
          ORDER BY views DESC LIMIT 20`, since),
      q(`SELECT ts, kind, path, country, region, city, timezone, browser, platform, referrer
           FROM hits WHERE day >= ? ORDER BY ts DESC LIMIT 100`, since),
      // A visitor hash is only stable within a day, so "new" is counted by
      // the first day a city was ever seen — which is what "someone new is
      // playing" actually means here.
      q(`SELECT country, city, MIN(day) AS first_day, MAX(day) AS last_day,
                COUNT(*) AS views
           FROM hits GROUP BY country, city
          ORDER BY first_day DESC LIMIT 40`)
    ]);

  return json({
    range: { days, since, until: daysAgo(0) },
    totals: totals.results[0] || { views: 0, visitors: 0, countries: 0 },
    byDay: fillDays(byDay.results, days),
    byCountry: byCountry.results,
    byCity: byCity.results,
    byReferrer: byReferrer.results,
    byBrowser: byBrowser.results,
    byPath: byPath.results,
    recent: recent.results,
    places: firstSeen.results
  }, 200, origin);
}

/* ----------------------------------------------------------------- helpers */

function originAllowed(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (!origin) return allowed[0] || "*";
  if (allowed.length === 0 || allowed.includes("*")) return origin;
  return allowed.includes(origin) ? origin : "";
}

function corsFor(origin) {
  return origin
    ? { ...CORS_HEADERS, "access-control-allow-origin": origin, vary: "origin" }
    : { ...CORS_HEADERS, vary: "origin" };
}

function json(payload, status, origin) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsFor(origin)
    }
  });
}

async function visitorHash(request, ua, day, env) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  const salt = env.HASH_SALT || "rounders";
  const bytes = new TextEncoder().encode(`${day}|${salt}|${ip}|${ua}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest).slice(0, 8)]
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function clip(value, max) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function referrerHost(referrer) {
  if (typeof referrer !== "string" || !referrer) return "";
  try { return new URL(referrer).host.slice(0, 100); } catch { return ""; }
}

function looksAutomated(ua) {
  return !ua || /bot|crawler|spider|slurp|preview|monitor|headless|curl|wget|python-|axios|probe/i.test(ua);
}

function browserFamily(ua) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

function platformFamily(ua) {
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Other";
}

function daysAgo(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// The chart wants a row per day, including the quiet ones.
function fillDays(rows, days) {
  const seen = new Map(rows.map((r) => [r.day, r]));
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = daysAgo(i);
    out.push(seen.get(day) || { day, views: 0, visitors: 0 });
  }
  return out;
}

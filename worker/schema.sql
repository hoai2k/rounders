-- Rounders stats storage. One row per beacon; every aggregate on the
-- dashboard is a query over this table.
CREATE TABLE IF NOT EXISTS hits (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       TEXT NOT NULL,        -- ISO timestamp
  day      TEXT NOT NULL,        -- YYYY-MM-DD, the grouping key
  kind     TEXT NOT NULL,        -- "view" or an event name
  path     TEXT NOT NULL,
  referrer TEXT NOT NULL,        -- host only, never the full URL
  country  TEXT NOT NULL,        -- ISO-3166 alpha-2 from Cloudflare
  region   TEXT NOT NULL,
  city     TEXT NOT NULL,
  timezone TEXT NOT NULL,
  browser  TEXT NOT NULL,
  platform TEXT NOT NULL,
  screen   TEXT NOT NULL,
  language TEXT NOT NULL,
  visitor  TEXT NOT NULL         -- daily-salted hash, not an identifier
);

CREATE INDEX IF NOT EXISTS hits_day ON hits (day);
CREATE INDEX IF NOT EXISTS hits_day_country ON hits (day, country);
CREATE INDEX IF NOT EXISTS hits_ts ON hits (ts);

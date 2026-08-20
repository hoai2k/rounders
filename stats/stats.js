/**
 * The /stats dashboard. It is a static page like the rest of the site: the
 * numbers come from the collector worker, which only answers with a read
 * token the owner pastes in once and keeps in this browser.
 */
(function () {
  var KEY_ENDPOINT = "rounders.stats.endpoint";
  var KEY_TOKEN = "rounders.stats.token";
  var defaults = window.ROUNDERS_STATS || {};

  var el = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k) || ""; } catch (err) { return ""; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (err) {} },
    drop: function (k) { try { localStorage.removeItem(k); } catch (err) {} }
  };

  var countryNames = null;
  try { countryNames = new Intl.DisplayNames(["en"], { type: "region" }); } catch (err) {}

  function flag(code) {
    if (!code || code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return "🏴";
    return String.fromCodePoint(
      0x1f1e6 + code.charCodeAt(0) - 65,
      0x1f1e6 + code.charCodeAt(1) - 65
    );
  }

  function countryName(code) {
    if (!code || code === "??" || code === "T1") return "Unknown / Tor";
    try { return countryNames ? countryNames.of(code) : code; } catch (err) { return code; }
  }

  function endpoint() {
    return (store.get(KEY_ENDPOINT) || defaults.endpoint || "").replace(/\/+$/, "");
  }

  /* ------------------------------------------------------------ rendering */

  function rows(node, items, options) {
    node.textContent = "";
    if (!items.length) {
      var empty = document.createElement("p");
      empty.className = "muted small";
      empty.textContent = options.empty || "Nothing yet.";
      node.appendChild(empty);
      return;
    }
    var top = Math.max.apply(null, items.map(options.weight)) || 1;
    items.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "row" + (options.fresh && options.fresh(item) ? " fresh" : "");

      var fill = document.createElement("span");
      fill.className = "fill";
      fill.style.width = Math.max(2, (options.weight(item) / top) * 100) + "%";

      var label = document.createElement("span");
      label.className = "label";
      label.textContent = options.label(item);
      if (options.sub) {
        var sub = document.createElement("span");
        sub.className = "sub";
        sub.textContent = options.sub(item);
        label.appendChild(sub);
      }

      var value = document.createElement("span");
      value.className = "value";
      value.textContent = options.value(item);

      row.append(fill, label, value);
      node.appendChild(row);
    });
  }

  function chart(days) {
    var node = el("chart");
    node.textContent = "";
    var top = Math.max.apply(null, days.map(function (d) { return d.views; })) || 1;
    days.forEach(function (d) {
      var bar = document.createElement("div");
      bar.className = "bar";
      bar.title = d.day + " — " + d.views + " views, " + d.visitors + " visitors";
      var views = document.createElement("i");
      views.style.height = (d.views / top) * 100 + "%";
      var visitors = document.createElement("u");
      visitors.style.height = (d.visitors / top) * 100 + "%";
      bar.append(views, visitors);
      node.appendChild(bar);
    });
  }

  function when(ts) {
    var date = new Date(ts);
    if (Number.isNaN(date.getTime())) return ts;
    return date.toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  }

  function place(hit) {
    var parts = [hit.city, hit.region].filter(Boolean);
    return flag(hit.country) + " " + (parts.join(", ") || countryName(hit.country));
  }

  function render(data) {
    el("tViews").textContent = data.totals.views.toLocaleString();
    el("tVisitors").textContent = data.totals.visitors.toLocaleString();
    el("tCountries").textContent = data.totals.countries.toLocaleString();

    var fresh = data.places.filter(function (p) { return p.first_day >= data.range.since; });
    el("tPlaces").textContent = fresh.length.toLocaleString();

    chart(data.byDay);

    rows(el("countries"), data.byCountry, {
      weight: function (c) { return c.visitors; },
      label: function (c) { return flag(c.country) + " " + countryName(c.country); },
      value: function (c) { return c.visitors + " visitors · " + c.views + " views"; }
    });

    rows(el("cities"), data.byCity, {
      weight: function (c) { return c.visitors; },
      label: function (c) { return flag(c.country) + " " + c.city; },
      sub: function (c) { return [c.region, countryName(c.country)].filter(Boolean).join(", "); },
      value: function (c) { return c.visitors + " visitors · last " + when(c.last_seen); },
      empty: "No city-level data yet."
    });

    rows(el("places"), data.places, {
      weight: function (p) { return p.views; },
      label: function (p) { return flag(p.country) + " " + (p.city || countryName(p.country)); },
      sub: function (p) { return "first seen " + p.first_day; },
      value: function (p) { return p.views + " views · last " + p.last_day; },
      fresh: function (p) { return p.first_day >= data.range.since; },
      empty: "No visits recorded yet."
    });

    rows(el("referrers"), data.byReferrer, {
      weight: function (r) { return r.views; },
      label: function (r) { return r.referrer; },
      value: function (r) { return r.views + " views"; },
      empty: "Everyone arrived directly."
    });

    rows(el("browsers"), data.byBrowser, {
      weight: function (b) { return b.views; },
      label: function (b) { return b.browser + " on " + b.platform; },
      value: function (b) { return b.views + " views"; }
    });

    rows(el("paths"), data.byPath, {
      weight: function (p) { return p.views; },
      label: function (p) { return p.kind === "view" ? p.path : p.kind + " — " + p.path; },
      value: function (p) { return p.views + "×"; }
    });

    var body = el("recent").querySelector("tbody");
    body.textContent = "";
    data.recent.forEach(function (hit) {
      var tr = document.createElement("tr");
      [
        when(hit.ts),
        place(hit),
        hit.kind === "view" ? hit.path : hit.kind,
        hit.browser + " / " + hit.platform,
        hit.referrer || "direct"
      ].forEach(function (text) {
        var td = document.createElement("td");
        td.textContent = text;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  /* --------------------------------------------------------------- wiring */

  function fail(message) {
    var box = el("error");
    box.textContent = message;
    box.classList.remove("hidden");
  }

  function showGate(note) {
    el("gate").classList.remove("hidden");
    el("board").classList.add("hidden");
    el("signout").classList.add("hidden");
    el("gateNote").textContent = note || "";
    el("endpoint").value = endpoint();
    el("token").value = "";
  }

  async function load() {
    var base = endpoint();
    var token = store.get(KEY_TOKEN);
    if (!base || !token) {
      showGate(base
        ? "Paste the read token to see the numbers."
        : "No collector is configured yet — deploy the worker in worker/ and paste its URL here.");
      return;
    }
    el("error").classList.add("hidden");
    var url = base + "/stats?token=" + encodeURIComponent(token) +
      "&days=" + encodeURIComponent(el("range").value);
    try {
      var response = await fetch(url, { mode: "cors" });
      if (response.status === 401) {
        store.drop(KEY_TOKEN);
        showGate("That token was rejected. Try again.");
        return;
      }
      if (!response.ok) throw new Error("collector answered " + response.status);
      var data = await response.json();
      el("gate").classList.add("hidden");
      el("board").classList.remove("hidden");
      el("signout").classList.remove("hidden");
      render(data);
    } catch (err) {
      showGate("");
      fail("Could not reach the collector: " + err.message);
    }
  }

  el("unlock").addEventListener("click", function () {
    var base = el("endpoint").value.trim().replace(/\/+$/, "");
    var token = el("token").value.trim();
    if (!base || !token) { fail("Both the collector URL and the token are needed."); return; }
    store.set(KEY_ENDPOINT, base);
    store.set(KEY_TOKEN, token);
    load();
  });
  el("token").addEventListener("keydown", function (e) {
    if (e.key === "Enter") el("unlock").click();
  });
  el("refresh").addEventListener("click", load);
  el("range").addEventListener("change", load);
  el("signout").addEventListener("click", function () {
    store.drop(KEY_TOKEN);
    showGate("Signed out of this browser.");
  });

  load();
})();

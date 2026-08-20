/**
 * The /stats page. GoatCounter keeps the numbers and draws the dashboard; this
 * page frames it so the stats live at a Rounders URL, and keeps the site code
 * and any access token in this browser rather than in the repository.
 */
(function () {
  var KEY_SITE = "rounders.stats.site";
  var KEY_TOKEN = "rounders.stats.token";
  var defaults = window.ROUNDERS_STATS || {};

  var el = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k) || ""; } catch (err) { return ""; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (err) {} },
    drop: function (k) { try { localStorage.removeItem(k); } catch (err) {} }
  };

  function cleanSite(value) {
    return String(value || "").trim()
      .replace(/^https?:\/\//, "")
      .replace(/\.goatcounter\.com.*$/, "")
      .replace(/\/.*$/, "");
  }

  function dashboardUrl(site, token, framed) {
    var base = String(defaults.url || "").trim().replace(/\/+$/, "");
    var url = base ? base + "/" : "https://" + encodeURIComponent(site) + ".goatcounter.com/";
    var query = [];
    if (token) query.push("access-token=" + encodeURIComponent(token));
    if (framed) query.push("hideui=1");
    return query.length ? url + "?" + query.join("&") : url;
  }

  function showGate(note) {
    el("gate").classList.remove("hidden");
    el("board").classList.add("hidden");
    el("change").classList.add("hidden");
    el("openTab").classList.add("hidden");
    el("gateNote").textContent = note || "";
    el("site").value = store.get(KEY_SITE) || defaults.site || "";
    el("token").value = store.get(KEY_TOKEN);
  }

  function show(site, token) {
    el("error").classList.add("hidden");
    el("gate").classList.add("hidden");
    el("board").classList.remove("hidden");
    el("change").classList.remove("hidden");
    el("thisHost").textContent = location.host;

    var open = el("openTab");
    open.href = dashboardUrl(site, token, false);
    open.classList.remove("hidden");
    el("frame").src = dashboardUrl(site, token, true);
  }

  function start() {
    var site = cleanSite(store.get(KEY_SITE) || defaults.site);
    if (!site && !defaults.url) {
      showGate("No GoatCounter site is configured yet — create a free one and paste its code here.");
      return;
    }
    show(site, store.get(KEY_TOKEN));
  }

  el("unlock").addEventListener("click", function () {
    var site = cleanSite(el("site").value);
    if (!site && !defaults.url) {
      var box = el("error");
      box.textContent = "A GoatCounter site code is needed, e.g. \"rounders\".";
      box.classList.remove("hidden");
      return;
    }
    var token = el("token").value.trim();
    store.set(KEY_SITE, site);
    if (token) store.set(KEY_TOKEN, token); else store.drop(KEY_TOKEN);
    show(site, token);
  });

  el("token").addEventListener("keydown", function (e) {
    if (e.key === "Enter") el("unlock").click();
  });
  el("site").addEventListener("keydown", function (e) {
    if (e.key === "Enter") el("unlock").click();
  });
  el("change").addEventListener("click", function () {
    showGate("");
  });

  start();
})();

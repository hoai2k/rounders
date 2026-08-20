/**
 * Counts a visit with GoatCounter — a cookieless, privacy-first analytics
 * service that never sees more than a country, a region and a browser family.
 *
 * The script is only fetched when `js/stats-config.js` names a site, so an
 * unconfigured clone makes no network requests. GoatCounter itself skips
 * localhost, file:// and framed pages, so `npm start` never pollutes the real
 * numbers.
 */
(function () {
  var config = window.ROUNDERS_STATS || {};
  var site = String(config.site || "").trim().replace(/\.goatcounter\.com$/, "");
  var selfHosted = String(config.url || "").trim().replace(/\/+$/, "");
  var base = selfHosted || (site ? "https://" + site + ".goatcounter.com" : "");

  // Do-Not-Track is honoured, and so is a local opt-out for your own browser:
  // localStorage.setItem("rounders.stats.optout", "1").
  var optedOut = navigator.doNotTrack === "1" || window.doNotTrack === "1";
  try { optedOut = optedOut || localStorage.getItem("rounders.stats.optout") === "1"; } catch (err) {}

  var pending = [];

  function count(vars) {
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count(vars);
    else pending.push(vars);
  }

  window.roundersStats = {
    // roundersStats.event("match_start") shows up as an event in the dashboard,
    // which is how "someone played" is told apart from "someone looked".
    event: function (name) {
      if (optedOut || !base) return;
      var label = String(name).slice(0, 60);
      count({ path: label, title: label, event: true });
    },
    optOut: function () {
      try {
        localStorage.setItem("rounders.stats.optout", "1");
        localStorage.setItem("skipgc", "t"); // GoatCounter's own opt-out flag
      } catch (err) {}
    }
  };

  if (optedOut || !base) return;

  var script = document.createElement("script");
  script.async = true;
  script.src = selfHosted ? selfHosted + "/count.js" : "https://gc.zgo.at/count.js";
  // count.js reads the endpoint off this attribute, so it must be set before
  // the script is appended.
  script.setAttribute("data-goatcounter", base + "/count");
  script.addEventListener("load", function () {
    var queued = pending;
    pending = [];
    queued.forEach(count);
  });
  script.addEventListener("error", function () { pending = []; });
  document.head.appendChild(script);
})();

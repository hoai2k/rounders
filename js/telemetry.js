/**
 * A one-beacon-per-visit ping to the stats collector.
 *
 * No cookies, no identifiers, no third-party script: a single fire-and-forget
 * POST with the page, the referring host and the screen size. Everything about
 * where the player is comes from the edge (see worker/worker.js), never from
 * the browser, and the game never reads anything back — if the collector is
 * unset, down or blocked, this file does nothing observable.
 */
(function () {
  var config = window.ROUNDERS_STATS || {};
  var endpoint = String(config.endpoint || "").replace(/\/+$/, "");
  var sent = false;

  function send(event) {
    if (!endpoint) return;
    var payload = {
      p: location.pathname,
      r: document.referrer || "",
      s: window.screen ? screen.width + "x" + screen.height : "",
      l: navigator.language || ""
    };
    if (event) payload.e = String(event).slice(0, 40);
    var body = JSON.stringify(payload);
    try {
      // sendBeacon survives the page being closed mid-flight; fetch is the
      // fallback for browsers that refuse a beacon (some content blockers).
      if (!navigator.sendBeacon || !navigator.sendBeacon(endpoint + "/collect", body)) {
        fetch(endpoint + "/collect", {
          method: "POST",
          body: body,
          keepalive: true,
          mode: "cors"
        }).catch(function () {});
      }
    } catch (err) { /* stats must never break the game */ }
  }

  function view() {
    if (sent) return;
    sent = true;
    send(null);
  }

  // Do-Not-Track is honoured, and so is a local opt-out for the developer's
  // own browser: localStorage.setItem("rounders.stats.optout", "1").
  var optedOut = navigator.doNotTrack === "1" || window.doNotTrack === "1";
  try { optedOut = optedOut || localStorage.getItem("rounders.stats.optout") === "1"; } catch (err) {}

  window.roundersStats = {
    event: function (name) { if (!optedOut) send(name); },
    optOut: function () {
      try { localStorage.setItem("rounders.stats.optout", "1"); } catch (err) {}
    }
  };

  if (optedOut || !endpoint) return;
  if (document.readyState === "complete") view();
  else window.addEventListener("load", view, { once: true });
})();

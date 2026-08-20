/**
 * Visitor stats settings — see STATS.md.
 *
 * Counting runs through GoatCounter, cookieless and free. Emptying `site`
 * switches it off completely: no analytics script is loaded and no request is
 * made, which is what a fork of this repository should do.
 */
window.ROUNDERS_STATS = {
  // The GoatCounter site code — the dashboard is hoai.goatcounter.com.
  site: "hoai",

  // Only for a self-hosted GoatCounter: its base URL, e.g.
  // "https://stats.example.com". Leave empty for the hosted service.
  url: ""
};

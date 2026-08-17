// Rounders — which song opens which arena.
//
// EDIT THIS FILE to change the soundtrack pairings. The key is the arena `id`
// from js/levels.js; the value is a track name from js/music.js (i.e. the mp3
// filename in assets/music/ without the extension).
//
// How a board's playlist runs (see game.js):
//   1. the song chosen here starts when the board loads
//   2. if the round runs long enough for it to end, its PARTNER plays
//      ("Rounders Tango 2" → "Rounders Tango 1", and vice versa)
//   3. after that, random tracks from the whole soundtrack, never repeating a
//      song already played on this board until the pool runs dry
//
// House rules kept by the table below (a console warning fires on load if a
// change breaks one):
//   • every theme (African, Bossa Nova, Calypso, …) is used at least once
//   • no two arenas open with the same song — two arenas MAY share a theme, as
//     long as they take different numbers ("Salsa 1" here, "Salsa 2" there)
//   • "Rounders Jazz 1" is left free: it is the title/menu theme. It still
//     turns up in battle as Midnight Library's partner track and in the random
//     tail, but no board opens on it.
(() => {
  "use strict";
  window.ROUNDERS = window.ROUNDERS || {};

  const ARENA_MUSIC = {
    // arena id            track                        why
    "neon-skyline":        "Rounders Spy 1",         // rain-slick noir rooftops, collar up
    "ember-foundry":       "Rounders African 1",     // hammer-and-anvil percussion for the forge
    "frostbite-observatory": "Rounders Waltz 1",     // the whole floor is an ice rink
    "verdant-overgrowth":  "Rounders African 2",     // drums under the jungle canopy
    "orbital-drift":       "Rounders Synth 2",       // weightless pads in vacuum
    "sirocco-canyon":      "Rounders Raga 1",        // desert heat haze, modal and dry
    "saltwind-boardwalk":  "Rounders Italian Accorion 1", // accordion on the pier, gondola on time
    "glimmer-hollow":      "Rounders Raga 2",        // drone-lit mushroom cave
    "cogwork-spire":       "Rounders Reel 1",        // clockwork perpetual motion
    "prism-caverns":       "Rounders Calypso 1",     // steel pan rings like struck crystal
    "sugar-rush":          "Rounders Samba 1",       // carnival sugar and confetti
    "thunderhead-perch":   "Rounders Tango 1",       // stabbing accents to match the strikes
    "midnight-library":    "Rounders Jazz 2",        // after-hours, hushed, smoky
    "koi-temple":          "Rounders Bossa Nova 1",  // petals on still water
    "neon-grid":           "Rounders Synth 1",       // straight into the mainframe
    "bonepit-arena":       "Rounders Salsa 2",       // hot brass for a dead crowd
    "aurora-summit":       "Rounders Waltz 2",       // the sky is already dancing
    "rustyard":            "Rounders Reggae 1",      // scrapyard dub, everything clanks in time
    "hexwood-glade":       "Rounders Reel 2",        // fae fiddle, one step off the path
    "tidal-wreck":         "Rounders Calypso 2",     // Caribbean water rising over the hull
    "lantern-festival":    "Rounders Salsa 1",       // street party on the riverbank
    "magma-lift":          "Rounders Spy 2",         // tense ascent, plasma below (Ion Lift)
    "cloud-nine":          "Rounders Reggae 2",      // weightless and unbothered
    "static-circus":       "Rounders Italian Accorion 2", // big-top accordion, showtime
    "voidfall":            "Rounders Tango 2"        // a dance with something that bites
  };

  // ------------------------------------------------------------- validation
  // Dev-time only: nothing here changes playback, it just shouts in the console
  // when an edit above drifts from the house rules.
  function validate() {
    const MUSIC = window.ROUNDERS.MUSIC;
    const LEVELS = window.ROUNDERS.LEVELS;
    if (!MUSIC) return;
    const warn = msg => console.warn(`[arena-music] ${msg}`);
    const byName = MUSIC.indexByName;
    const seen = new Map();

    for (const [id, track] of Object.entries(ARENA_MUSIC)) {
      if (!byName.has(track)) warn(`arena "${id}" wants "${track}", which is not in the soundtrack`);
      if (seen.has(track)) warn(`"${track}" is used by both "${seen.get(track)}" and "${id}"`);
      seen.set(track, id);
    }
    if (LEVELS) {
      for (const level of LEVELS) {
        if (!ARENA_MUSIC[level.id]) warn(`arena "${level.id}" has no song — it will fall back to a random track`);
      }
      for (const id of Object.keys(ARENA_MUSIC)) {
        if (!LEVELS.some(l => l.id === id)) warn(`"${id}" is not an arena id`);
      }
    }
    const usedThemes = new Set();
    for (const track of seen.keys()) {
      const i = byName.get(track);
      if (i !== undefined) usedThemes.add(MUSIC.tracks[i].theme);
    }
    for (const theme of MUSIC.themes) {
      if (!usedThemes.has(theme)) warn(`theme "${theme}" is not used by any arena`);
    }
  }

  window.ROUNDERS.ARENA_MUSIC = ARENA_MUSIC;
  validate();
})();

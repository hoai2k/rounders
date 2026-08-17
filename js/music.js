// Rounders — soundtrack manifest.
// Files live in assets/music/ and are streamed (never fully preloaded) so a
// 4 MB track never stalls a frame. `title` names the track used on the title /
// selection screens; every other track can turn up in battle.
//
// Tracks come in themed pairs — "Rounders Tango 1" / "Rounders Tango 2" — and
// each track knows its theme and its partner, because a board that outlasts its
// opening song moves to that song's partner next (js/arena-music.js explains
// the full order, and holds the per-arena choices).
(() => {
  "use strict";
  window.ROUNDERS = window.ROUNDERS || {};

  const dir = "assets/music/";
  // NB: "Accorion" matches the filenames on disk — don't "fix" the spelling
  // here unless the mp3s are renamed too.
  const names = [
    "Rounders African 1",
    "Rounders African 2",
    "Rounders Bossa Nova 1",
    "Rounders Bossa Nova 2",
    "Rounders Calypso 1",
    "Rounders Calypso 2",
    "Rounders Italian Accorion 1",
    "Rounders Italian Accorion 2",
    "Rounders Jazz 1",
    "Rounders Jazz 2",
    "Rounders Raga 1",
    "Rounders Raga 2",
    "Rounders Reel 1",
    "Rounders Reel 2",
    "Rounders Reggae 1",
    "Rounders Reggae 2",
    "Rounders Salsa 1",
    "Rounders Salsa 2",
    "Rounders Samba 1",
    "Rounders Samba 2",
    "Rounders Spy 1",
    "Rounders Spy 2",
    "Rounders Synth 1",
    "Rounders Synth 2",
    "Rounders Tango 1",
    "Rounders Tango 2",
    "Rounders Waltz 1",
    "Rounders Waltz 2"
  ];

  const TITLE_TRACK = "Rounders Jazz 1";

  // "Rounders Bossa Nova 2" → theme "Bossa Nova", variant 2
  const parse = name => {
    const m = /^Rounders (.+) (\d+)$/.exec(name);
    return m ? { theme: m[1], variant: Number(m[2]) } : { theme: name, variant: 1 };
  };

  const tracks = names.map(name => {
    const { theme, variant } = parse(name);
    return {
      name, theme, variant,
      // spaces must survive the request; the directory itself is already safe
      url: dir + encodeURIComponent(`${name}.mp3`)
    };
  });

  const indexByName = new Map(tracks.map((t, i) => [t.name, i]));

  // partnerOf[i] is the other track of i's pair, or -1 for a lone track.
  const partnerOf = tracks.map((t, i) => {
    const j = tracks.findIndex((o, k) => k !== i && o.theme === t.theme);
    return j;
  });

  const themes = [...new Set(tracks.map(t => t.theme))];

  const titleIndex = Math.max(0, names.indexOf(TITLE_TRACK));

  window.ROUNDERS.MUSIC = { tracks, titleIndex, indexByName, partnerOf, themes };
})();

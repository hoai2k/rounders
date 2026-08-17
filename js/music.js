// Rounders — soundtrack manifest.
// Files live in assets/music/ and are streamed (never fully preloaded) so a
// 4 MB track never stalls a frame. `title` names the track used on the title /
// selection screens; every other track is part of the battle shuffle.
(() => {
  "use strict";
  window.ROUNDERS = window.ROUNDERS || {};

  const dir = "assets/music/";
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

  const tracks = names.map(name => ({
    name,
    // spaces must survive the request; the directory itself is already safe
    url: dir + encodeURIComponent(`${name}.mp3`)
  }));

  const titleIndex = Math.max(0, names.indexOf(TITLE_TRACK));

  window.ROUNDERS.MUSIC = { tracks, titleIndex };
})();

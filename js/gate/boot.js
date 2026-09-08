/**
 * The entry point, ahead of the game.
 *
 * This game's scripts are classic (non-module) tags that run in document order
 * and depend on that order — `game.js` is an immediate IIFE that expects
 * everything before it to have defined its globals. There is no way to *defer*
 * a classic tag past an await, so `index.html` no longer lists them: this
 * module holds the list and appends them once the visitor is through the door.
 *
 * `async = false` is the load-bearing line. A script element created by script
 * defaults to async, which would run them in whatever order they arrived off
 * the network — and this game would break in a different way on every reload.
 * Setting it false restores document-order execution.
 *
 * Nothing here waits on DOMContentLoaded, and nothing needs to: that event has
 * already fired by the time the door closes, and none of these scripts listens
 * for it (checked — `game.js` runs on load and the rest only define things).
 * If a future script does start listening for it, it will never fire, and this
 * comment is where to look.
 *
 * KEEP THIS LIST IN STEP WITH THE GAME. A script added to the game and not to
 * this list simply never loads. That is the cost of gating a no-module site,
 * and it is why the list is one array in one place rather than spread through
 * the markup.
 *
 * The door is off on localhost, so `npm start` and the audit tooling never meet
 * it — see the header of `gate.js`.
 */
import { openGate } from './gate.js';

/** In document order, exactly as index.html used to list them. */
const SCRIPTS = [
  'js/stats-config.js?v=33',
  'js/telemetry.js?v=33',
  'js/strings.js?v=32',
  'js/gameplay.js?v=32',
  'js/cards.js?v=32',
  'js/bullet-art.js?v=32',
  'js/fx-art.js?v=32',
  'js/fx.js?v=32',
  'js/chroma.js?v=32',
  'js/rig.js?v=32',
  'js/characters.js?v=32',
  'js/levels.js?v=32',
  'js/music.js?v=32',
  'js/arena-music.js?v=32',
  'game.js?v=32',
];

openGate({
  title: 'Rounders',
  blurb: 'This game is for friends of Hoai Nguyen. Use your invite link, or enter your code below.',
  game: 'rounders',
}).then(() => {
  for (const src of SCRIPTS) {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;   // document-order execution; see the header
    document.body.appendChild(s);
  }
});

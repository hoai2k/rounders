# Rounders

**Rounders** is a colorful 1–8 player local arena brawler in the spirit of ROUNDS:
short physics duels between round little fighters, where everyone who loses a round
drafts a power card — all at the same time — and comes back angrier.

## Play

**▶ Play online: https://hoai2k.github.io/rounders/**

Or run it locally — open `index.html` in a browser, or start the server:

```bash
npm start
```

Default URL: `http://127.0.0.1:4173`.

The live site redeploys automatically on every push to `main`
(`.github/workflows/deploy-pages.yml`), so dropping generated art into
`assets/images/` and pushing is all it takes to see it online.

### Stats

`/stats/` is a visitor dashboard — countries, regions, referrers and how many
people actually started a match — backed by a free
[GoatCounter](https://www.goatcounter.com) site. It loads no analytics script
and sends nothing until a site code is configured; see [`STATS.md`](STATS.md).

### Controls

| | Move | Jump | Shoot | Block / Active |
|---|---|---|---|---|
| Keyboard 1 | A / D | W | F | G |
| Keyboard 2 | ◀ / ▶ | ▲ | / | . |
| Controller | Left stick | A | RT / RB | LT / LB / B |

Menus are fully controller-navigable: **D-pad** moves between controls (and
scrolls a long panel when there is nowhere left to move), **A**/**Menu**
confirms, **B**/**View** goes back, **Menu** pauses. Dropdowns cycle with
**◀ ▶** (or step with **A**), sliders nudge with **◀ ▶**. **LB**/**RB** cycle
through the corner icon row — how to play, sound, settings, fullscreen — and
cycling past either end returns to the deselected state.
The How to Play screen has a full
Xbox controller diagram. `Esc`/`P` also pauses — pausing ducks the music and the
pause menu links to Settings, How to Play, fullscreen, and quit-to-menu.
The game opens on an arcade "PRESS START" title screen; starting from keyboard
or mouse also enters fullscreen.

Join the lobby with your **shoot** button (or any pad button), pick one of the
**24 characters** with ◀ ▶, and lock in with shoot. `M` toggles music,
`Esc`/`P` pauses.

## What's inside

- **83 hand-designed power cards** across six color-coded rarities — Common,
  Uncommon, Rare, Epic, Legendary, and **Mythic** (active abilities on their own
  button). Every card states exactly what it does, and every one is painted:
  a 256×256 emblem for the HUD chip and a full-bleed scene for the card face.
  **[`CARDS.md`](CARDS.md) lists every card and what it does**, generated from the
  card set itself. Pausing also opens each fighter's whole hand in the margin.
- **25 themed arenas**, each with its own palette, weather, and signature mechanic:
  ice, conveyors, wind gusts, low gravity, bounce pads, moving platforms,
  teleporters, crumbling floors, rising tides, timed lightning, syrup pools,
  black-hole voids, and more. Every round is a random arena (or lock one in
  Settings).
- **24 playable characters** in two waves — an indie-badass front line (Vex,
  Rook, Jinx, Diesel, Nyx, Saber, Havoc, Wraith, Blitz, Fang, Onyx, Riot) and
  the founding cheerful cast — round bodies, signature weapons, big personalities.
  Fully procedural art, with automatic upgrade to generated images when dropped
  into `assets/images/` (see `image-requests.md`). Characters whose art is split
  into body/weapon/arm parts under `assets/images/characters/render/` are drawn
  composed — the body mirrors with facing while the weapon aims exactly where the
  player aims (same reach and barrel length as the procedural art) and the arms
  bridge body to weapon. Tune the composition at `/workbench`,
  or turn the whole thing off with **Settings → Visuals → Use Procedural
  Characters** to play with the built-in vector art.
- **Simultaneous drafting** — when several players lose a round, they all draft at
  once, each with their own hand and controls. The moment someone commits, their
  stage folds into the locked-in tray in the corner and the hands still choosing
  grow into the space, until the last chooser has the whole screen to themselves.
- **Photo Finish** — with three or more fighters, the round's runner-up finds a
  special card swapped into their hand: take it instead of a power and bank half
  a round win on the spot. Two of them are a whole round, and half-scores show on
  the HUD as `1½/5`.
- **Choose Cards** (**Settings → Choose Cards**) — draft from the whole set at the
  usual rarity rates (*Default*), from the whole set with every card equally
  likely (*Equalize*), or from a set you build yourself (*Choose*): a scrollable
  grid of every card where any of them can be greyed out and taken off the table.
  A rarity heading toggles that whole block. Your selection is saved, so you can
  flip back to Default to play with everything and return to Choose later to find
  it exactly as you left it. On a controller the grid has its own cursor — hold a
  direction to move fast, **A** toggles a card, **X** its whole rarity, **LB**/**RB**
  jump between rarities.
- Bots (three difficulties), controller rumble, screen shake, synth SFX, and a
  **28-track soundtrack** — 14 themes × 2 — that plays per match. Every arena is
  cast an opening song in `js/arena-music.js`, and a match opens on the song of
  the arena it starts in. From there the playlist runs by theme: all 14 themes
  play once before any comes round again, and when one does it plays the other
  song of its pair ("Tango 2" → "Tango 1"). Picking a card leaves the song
  playing, quieter.

## Project docs

**What the cards do**

- **[`CARDS.md`](CARDS.md)** — **every card in the game**: what it does, what it
  costs you, what it asks you to press, and how likely each rarity is to turn up.
  Generated from [`js/cards.js`](js/cards.js) by `npm run cards-doc`, so it cannot
  drift from the game. The same set is browsable in game (*Settings → Choose
  Cards*) and at full size in the [card workbench](workbench/cards.html).
- [`CARD-GAP-AUDIT.md`](CARD-GAP-AUDIT.md) — our set measured against ROUNDS'
  card-for-card, and what was added to close the gaps
- [`AUDIT.md`](AUDIT.md) — variety/balance audit findings, and what was done about each

**Everything else**

- [`PROJECT-STATE.md`](PROJECT-STATE.md) — workstream tracker for the redesign
- [`image-requests.md`](image-requests.md) — open art requests (prompts + file paths)
- [`image-requests-history.md`](image-requests-history.md) — the same for art already generated and in the repo
- [`intake/README.md`](intake/README.md) — how to bring delivered art into the game
- [`STATS.md`](STATS.md) — how the visitor dashboard at `/stats/` works and how to switch it on
- [`CLAUDE.md`](CLAUDE.md) — repo policies

## Tools and workbenches

Run `npm start` first — the workbench pages are served from the same static server.

| | What it is for |
|---|---|
| [`/workbench/cards.html`](workbench/cards.html) | **Card workbench** — browse every card at full size, and run a live preview of what it actually does in a match (`js/cardsim.js`) |
| [`/workbench/`](workbench/index.html) | **Sprite workbench** — pose composed characters, drag the hand/weapon anchors, save to `rigs.json` |
| [`/workbench/intake.html`](workbench/intake.html) | **Art intake** — drop delivered art in, key its backdrop out, file it under the right name |
| `npm run cards-doc` | Rewrite [`CARDS.md`](CARDS.md) from the card set (`--check` fails if it is stale) |
| `npm run audit-arenas` | Arena geometry: gaps that look passable but are not |
| `npm run audit-holes` | Breakthrough's bored holes really are doorways, in every arena |
| `npm run audit-combos` | Plays random card builds in a live match, watching for errors, NaNs and stutter |
| `npm run audit-stats` | Sweeps thousands of random builds for where the damage tail goes |
| `npm run audit-ttk` | Time-to-kill across builds |
| `npm run audit-keys` | Scans delivered PNGs for leftover backdrop |
| `npm run bullet-colors` | Re-derives each round's trail colour from its own art |
| `npm run intake` / `npm run intake-art` | Command-line art intake |
| `npm run fitrig` | Measures hand size against the canonical art into `rigs.json` |

## Code layout

| File | Purpose |
|---|---|
| `game.js` | Engine: physics, combat, arena features, draft flow, rendering, menus |
| `js/strings.js` | **All UI wording** — every menu and in-game string in one editable file |
| [`js/cards.js`](js/cards.js) | The 83-card set + rarity metadata (→ [`CARDS.md`](CARDS.md)) |
| `js/levels.js` | The 25 arenas |
| `js/characters.js` | The 24 characters + procedural renderer |
| `js/music.js` | Soundtrack manifest: the 28 tracks, their themes and pairs |
| `js/arena-music.js` | **Which song a match opens on in each arena** — the table to edit |
| `js/rig.js` | Composed sprites: loads body/weapon/arm parts, detects anchors, draws the aimable rig |
| `js/chroma.js` | Backdrop keying (magenta/green screen → transparent), shared by intake and runtime |
| `tools/intake.mjs` | `npm run intake` — keys and files delivered art, archives the originals |
| `tools/fitrig.mjs` | `npm run fitrig` — measures hand size against the canonical art into `rigs.json` |
| `workbench/` | Sprite workbench (preview / edit handles / anchors → `rigs.json`) and art intake page |
| `index.html`, `styles.css` | UI |
| `server.mjs` | Zero-dependency static server |
| `js/telemetry.js`, `js/stats-config.js` | Cookieless GoatCounter counting; inert until a site code is set |
| `stats/` | The `/stats/` dashboard: who is playing and where from |

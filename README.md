# Rounders

**Rounders** is a colorful 1–4 player local arena brawler in the spirit of ROUNDS:
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

- **52 hand-designed power cards** across six color-coded rarities — Common,
  Uncommon, Rare, Epic, Legendary, and **Mythic** (active abilities on your block
  button). Every card states exactly what it does.
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
  once, each with their own hand and controls.
- Bots (three difficulties), controller rumble, screen shake, synth SFX, and a
  **28-track soundtrack cast per arena** — 14 themes × 2, with every arena
  matched to its opening song in `js/arena-music.js`. A board opens on its song,
  follows it with that song's partner ("Tango 2" → "Tango 1"), then keeps going
  with random non-repeating tracks. Picking a card leaves the song playing,
  quieter; the next board brings its own.

## Project docs

- `PROJECT-STATE.md` — workstream tracker for the redesign
- `image-requests.md` — open art requests (prompts + file paths)
- `image-requests-history.md` — the same for art already generated and in the repo
- `intake/README.md` — how to bring delivered art into the game
- `AUDIT.md` — variety/balance audit findings
- `CLAUDE.md` — repo policies

## Code layout

| File | Purpose |
|---|---|
| `game.js` | Engine: physics, combat, arena features, draft flow, rendering, menus |
| `js/strings.js` | **All UI wording** — every menu and in-game string in one editable file |
| `js/cards.js` | The 52-card set + rarity metadata |
| `js/levels.js` | The 25 arenas |
| `js/characters.js` | The 24 characters + procedural renderer |
| `js/music.js` | Soundtrack manifest: the 28 tracks, their themes and pairs |
| `js/arena-music.js` | **Which song opens which arena** — the table to edit |
| `js/rig.js` | Composed sprites: loads body/weapon/arm parts, detects anchors, draws the aimable rig |
| `js/chroma.js` | Backdrop keying (magenta/green screen → transparent), shared by intake and runtime |
| `tools/intake.mjs` | `npm run intake` — keys and files delivered art, archives the originals |
| `tools/fitrig.mjs` | `npm run fitrig` — measures hand size against the canonical art into `rigs.json` |
| `workbench/` | Sprite workbench (preview / edit handles / anchors → `rigs.json`) and art intake page |
| `index.html`, `styles.css` | UI |
| `server.mjs` | Zero-dependency static server |

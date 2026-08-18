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

- **77 hand-designed power cards** across six color-coded rarities — Common,
  Uncommon, Rare, Epic, Legendary, and **Mythic** (active abilities on their own
  button). Every card states exactly what it does, and every one is painted:
  a 256×256 emblem for the HUD chip and a full-bleed scene for the card face.
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
| `js/cards.js` | The 77-card set + rarity metadata |
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

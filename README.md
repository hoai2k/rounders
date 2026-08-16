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

Menus are fully controller-navigable: **D-pad** moves, **A**/**Menu** confirms,
**B**/**View** goes back, **Menu** pauses. The How to Play screen has a full
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
  composed — the body mirrors with facing while the weapon aims where the player
  aims. Tune the composition at `/workbench`.
- **Simultaneous drafting** — when several players lose a round, they all draft at
  once, each with their own hand and controls.
- Bots (three difficulties), controller rumble, screen shake, synth SFX, and a
  2-track soundtrack.

## Project docs

- `PROJECT-STATE.md` — workstream tracker for the redesign
- `image-requests.md` — prompts + file paths for all optional generated art
- `AUDIT.md` — variety/balance audit findings
- `CLAUDE.md` — repo policies

## Code layout

| File | Purpose |
|---|---|
| `game.js` | Engine: physics, combat, arena features, draft flow, rendering, menus |
| `js/cards.js` | The 52-card set + rarity metadata |
| `js/levels.js` | The 25 arenas |
| `js/characters.js` | The 24 characters + procedural renderer |
| `js/rig.js` | Composed sprites: loads body/weapon/arm parts, detects anchors, draws the aimable rig |
| `workbench/` | Sprite workbench — tune anchors and weapon/hand placement, export `rigs.json` |
| `index.html`, `styles.css` | UI |
| `server.mjs` | Zero-dependency static server |

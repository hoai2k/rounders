# ROUNDERS: Total Redesign — Project State

This document tracks every workstream ("effort") in the full redesign of Rounders,
so work can resume cleanly if interrupted. Update the status boxes as work lands.

**Working branch:** `claude/rounds-game-redesign-4z7slv` → merged to `main` when a task completes (see CLAUDE.md policy).

---

## Vision

A colorful, dynamic, professionally polished 1–4 player arena brawler in the spirit
of ROUNDS: short physics duels, loser-drafts-a-card comebacks, huge build variety.
Everything is being redesigned from scratch — cards, arenas, characters, UI — using
the old codebase only as an engine framework.

Pillars:

1. **Personality everywhere** — every card, arena, and character has a name, a face,
   a palette, and a gimmick you can describe in one sentence.
2. **Readable depth** — cards explain exactly what they do; rarity is color-coded;
   arenas telegraph their hazards.
3. **Juice** — particles, screen shake, splash banners, animated gradients,
   weather effects, rumble.

---

## Workstreams

### 1. Design foundation & docs
- [x] Research ROUNDS design patterns (draft-on-loss, stat-trade cards, arena variety)
- [x] Define rarity ladder + colors: Common (silver), Uncommon (green), Rare (blue),
      Epic (purple), Legendary (gold), Mythic (animated magenta) — Mythics grant active abilities
- [x] `image-requests.md` — prompts for all generated art (committed to main early so
      generation can start while code is built)
- [x] `CLAUDE.md` — repo policy (merge to main when a task is done)
- [x] This state document

### 2. Card system — 52 cards, designed from scratch
- [x] New card schema: id, name, rarity, tagline (flavor), description (plain-English
      explanation), effect list, tags, apply()
- [x] 14 Common / 12 Uncommon / 10 Rare / 8 Epic / 5 Legendary / 3 Mythic = **52 cards**
- [x] New combat mechanics to support them: burn DoT, chill (slow), pierce, chain
      lightning, shrapnel split, thorns, regen, rage (low-HP damage), adrenaline
      (low-HP speed), guardian save, golden first shot, kill-heal, storm block,
      warp block, 3 active Mythic abilities (Starfall Protocol, Event Horizon, Chronoshift)
- [x] File: `js/cards.js`

### 3. Arena system — 25 levels with themes & personality
- [x] Level schema: name, theme blurb, full palette (sky gradient, platform colors,
      accent), platforms, hazards, movers, features, weather particles
- [x] Engine features: moving platforms (carry riders), bounce pads, conveyors, ice
      (slippery), wind/gusts, low gravity, teleporters, timed lightning strikes,
      rising/falling tide, syrup slow-zones, phase (crumbling) platforms,
      arena bullet-bounce modifier
- [x] **25 arenas**, each with a distinct theme + 1–2 signature mechanics
- [x] File: `js/levels.js`

### 4. Characters — 24 pilots across two waves, procedural + generated art
- [x] Round 2: 12 indie-badass characters lead the roster (Vex, Rook, Jinx,
      Diesel, Nyx, Saber, Havoc, Wraith, Blitz, Fang, Onyx, Riot) — new crest,
      face, and weapon renderers; prompts in image-requests.md §6
- [x] 12 characters, all roughly circular with a signature weapon sticking out
- [x] Procedural canvas renderer per character (crest, eyes, accessory, weapon shape,
      palette) so the game is fully playable before art is generated
- [x] Image prompts for each character in `image-requests.md`; game auto-loads
      `assets/images/characters/canonical/<id>.png` when present, falls back to procedural
- [x] Character select in the lobby: each player joins, cycles characters, locks in
- [x] **Composed sprites**: when `assets/images/characters/render/<id>_body.png` +
      `_weapon.png` (+ optional `_arm.png`) exist, the character is drawn from parts —
      body mirrors with facing, weapon rotates to the aim, bullets spawn at the
      real muzzle. Anchors (body pivot/radius/mount, weapon grip/muzzle, arm
      shoulder/hand) are auto-detected from the alpha channel, whatever framing
      the parts were delivered in
- [x] **Arm attachment**: each arm sprite (drawn facing right like the weapon)
      keeps its shoulder pinned to a socket on the body and its hand on a hold
      point that rides the weapon, swinging and stretching within limits as the
      weapon tracks the aim. Round nub hands with no direction to them fall back
      to being rigidly parented to the weapon; per-arm layering is back / behind
      weapon / front. `npm run mock-parts <id>` writes placeholder parts so the
      whole path can be exercised before art arrives
- [x] `/workbench` UI for hand-tuning: character grid on the left, interactive viewer
      on the right, **character** mode (place/orient/size weapon + arms, with a
      shoulder and a hand handle per arm and a stretch-limit warning) and
      **anchor** mode (anchor points on body/weapon/arm), exports `rigs.json`
      (or `rigs.js` for `file://`) which the game merges over the auto anchors
- [x] **Art intake**: `npm run intake` takes delivered files from `intake/`, keys
      out solid backdrops (magenta/green/white screens) into transparent PNGs,
      files them into `characters/canonical/` or `characters/render/`, and keeps
      the delivered originals in `characters/archive/`. Interior color matching
      the screen survives (only backdrop connected to the border is cut) and
      already-transparent art passes through untouched. `/workbench/intake.html`
      is the visual version for stubborn cutouts; `js/chroma.js` is shared by
      both and also keys at load time as a safety net
- [x] **Art landed (24 characters)**: canonical hero images in
      `assets/images/characters/canonical/`, body/weapon/arm parts in `render/`.
      22 of the 96 delivered files arrived opaque on magenta/green/grey screens
      and were keyed at intake; the delivered originals are kept in
      `characters/archive/`
- [x] **Composed characters match the procedural geometry**: the body's ball is
      the largest circle inside its silhouette (so it lines up with the collision
      circle), the weapon is scaled to a 1.5-radius barrel with the grip riding
      0.55 radii out along the aim, and the barrel's tilt in the source art is
      cancelled — the weapon points exactly where the stick does (verified at
      0.00° off-axis across all 24 characters and eight aim angles)
- [x] **`npm run fitrig`**: the delivered parts are each drawn full-frame on
      their own canvas, so a hand arrives as a ball half the size of the body.
      The fitter matches the arm art into the canonical hero image to recover the
      hand size and grip position, and writes those to `render/rigs.json`;
      everything else stays automatic
- [x] Settings → Visuals → **Use Procedural Characters** (default off) draws the
      whole roster with the built-in vector art instead of the sprites
- [x] Files: `js/characters.js`, `js/rig.js`, `js/chroma.js`, `tools/`, `workbench/`

### 5. Game flow redesign
- [x] Random arena every round (no immediate repeats)
- [x] Settings: arena picker — Random or lock any of the 25
- [x] **Simultaneous drafting**: when multiple players lose a round, all of them
      draft at the same time, each with their own hand and their own controls
- [x] Winner banner → draft → next arena loop with splash screens
- [x] Bots pick cards and characters automatically

### 6. UI / UX overhaul
- [x] Arcade title screen (flashing PRESS START, any input begins, keyboard/mouse
      start also enters fullscreen)
- [x] Full controller menu navigation (D-pad move, A/Menu confirm, B/View back)
- [x] Pause menu: resume, settings, how-to-play, fullscreen, music, quit to menu —
      music ducks to 22% while paused
- [x] Xbox controller diagram (inline SVG) on the How to Play screen
- [x] Full visual redesign: animated gradient menu, glassmorphism panels, rarity-glow
      cards, character-portrait HUD, arena intro banner with theme blurb
- [x] Restructured settings (grouped sections, arena picker, rarity rates)
- [x] Files: `index.html`, `styles.css`

### 7. Audio & FX polish
- [x] Kept: synth SFX, rumble
- [x] New: per-mechanic SFX hooks (burn, chain, teleport, bounce pad), weather particles
- [x] Soundtrack: 16 tracks in `assets/music/` (manifest in `js/music.js`).
      "Rounders Jazz 1" is the title/selection theme; every match rolls a random
      non-title track. Streamed via byte-range requests (`server.mjs` serves 206),
      with the next track warmed in the background so skips start instantly.
- [x] Now-playing readout bottom-right with ◀ / ▶ skip buttons

### 8. Audit (agent pass)
- [x] Card balance & variety audit
- [x] Arena variety & uniqueness audit
- [x] Character personality audit
- [x] UI polish audit
- [x] Findings + applied fixes: `AUDIT.md`

### 9. Ship
- [x] Commit and push feature branch
- [x] Merge to `main` and push
- [x] Deploy live: **https://hoai2k.github.io/rounders/** (GitHub Pages via
      `.github/workflows/deploy-pages.yml`, redeploys on every push to `main`)

---

## Descoped (deliberate)

- **Online 2-player mode** (InstantDB): the old netcode synced a 2-player snapshot and
  single-player drafting; it is incompatible with 4-player simultaneous drafting and
  the new arena features. Removed in this redesign; the old implementation remains in
  git history (`rounder-online.html`, pre-redesign `game.js`) if it should return.

## Resume notes (if interrupted)

- Content lives in `js/cards.js`, `js/levels.js`, `js/characters.js`; engine in `game.js`.
- Generated art is optional: drop PNGs at the paths listed in `image-requests.md`
  and the game will use them automatically; nothing breaks when absent.

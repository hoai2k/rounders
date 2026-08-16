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
      generation can start while code is built). Delivered batches move to
      `image-requests-history.md`, so the live doc is only what is still wanted
- [x] **Card art wired in**: the 52 emblems in `assets/images/cards/` are drawn on
      the card faces in the draft hand, on the HUD card chips, and on the card a
      bot is shown taking, so a hand is recognised instead of read
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
- [x] **Level-design pass vs ROUNDS** (AUDIT.md §5): three new engine systems —
      breakable platforms (`breakable`), chain-hung platforms shot down by
      cutting their chains (`hung[]`), and pushable/climbable/destructible
      crates (`crates[]`, buoyant in water and tides, shoved by bullets and
      explosions) — plus a geometry second draft of all 25 arenas: climbable
      walls/towers everywhere (wall-jump finally has terrain), perches,
      overhangs, and asymmetric silhouettes. Per-round prop state resets in
      `resetRound`
- [ ] **Backdrop refreshes** (`image-requests.md` §1): repaints for the 6
      arenas whose silhouette changed most (Neon Skyline, Koi Temple, Tidal
      Wreck, Midnight Library, Lantern Festival, Aurora Summit)

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
- [x] **Split facing**: the body mirrors with the character's facing (movement)
      and the weapon mirrors with the aim, in two independent frames, so aiming
      behind yourself no longer draws the weapon upside down. Arms ride the
      weapon's frame; the muzzle is a weapon point and depends only on the aim
- [x] **Arm attachment**: each arm sprite (drawn facing right like the weapon)
      keeps its shoulder pinned to a socket on the body and its hand on a hold
      point that rides the weapon, swinging and stretching within limits as the
      weapon tracks the aim. Round nub hands with no direction to them fall back
      to being rigidly parented to the weapon; per-arm layering is back / behind
      weapon / front. `npm run mock-parts <id>` writes placeholder parts so the
      whole path can be exercised before art arrives
- [x] `/workbench` UI for hand-tuning: character grid on the left, viewer on the
      right, and three modes kept in the URL (`?c=vex&mode=edit`) so a reload
      resumes where you left off — **preview** (clean, gamepad aims it like a
      player would), **edit** (onscreen Body/Weapon/Hand selector, move/resize/
      turn handles mirrored as numbers in the panel, reference overlay, undo and
      redo) and **anchor** (anchor points on the source images). Preview fires
      test shots from the rig's own muzzle on the gamepad triggers (or space),
      Anchors → Arm picks None / One / Two — arms exist only once they are asked
      for — and the mode, part tab and handles survive a character change.
      Exports `rigs.json` — overrides only, so a character nobody has touched is
      absent from the file and keeps improving with the detector
- [x] **Backdrop audit**: `npm run audit-keys` finds screen colour that survived
      keying — the pockets keying can't reach, enclosed by a pipe loop, a chain
      link, a topknot. Delivered originals in `characters/archive/` make the
      call factual where they exist (`--fix` cuts those); everything else is
      reported as a colour-only suspect for eyeballing, since plenty of art is
      legitimately neon green or magenta. Seven weapons/bodies cleaned this way
      (diesel, fang, saber, blitz, havoc, luna, riot)
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
      found by fitting a circle to the outline (RANSAC + least squares + a
      hug-the-outline polish), so hats, horns and flames fall out as outliers and
      the ball lands on the collision circle; the weapon is scaled to a
      1.5-radius barrel with the grip riding
      0.55 radii out along the aim, and the barrel's tilt in the source art is
      cancelled — the weapon points exactly where the stick does (verified at
      0.00° off-axis across all 24 characters and eight aim angles)
- [x] **`npm run fitrig`**: the delivered parts are each drawn full-frame on
      their own canvas, so a hand arrives as a ball half the size of the body.
      The fitter matches the arm art into the canonical hero image to recover the
      hand size and grip position, and writes those to `render/rigs.json`;
      everything else stays automatic
- [x] **Facing follows movement, aiming follows the aim stick**: the body turns
      with the direction the player is moving (holding the last direction when
      they stop) while the weapon points wherever they aim, so a fighter can
      retreat while shooting. The workbench mirrors that split — left stick
      turns the body, right stick aims
- [x] Settings → Visuals → **Use Procedural Characters** (default off) draws the
      whole roster with the built-in vector art instead of the sprites
- [x] Files: `js/characters.js`, `js/rig.js`, `js/chroma.js`, `tools/`, `workbench/`

### 5. Game flow redesign
- [x] Random arena every round (no immediate repeats)
- [x] Settings: arena picker — Random or lock any of the 25
- [x] **Simultaneous drafting**: the two lowest-ranked losers draft at the same
      time (max 2 hands on screen — in 4-player the third loser sits out), each
      with their own hand and their own controls
- [x] **Draft stage redesign**: full-screen scene per chooser washed in their
      color, their character shown large, cards fanned like a held hand of
      playing cards (corner pips, deal-in animation, lift on select); two
      choosers split the screen side by side
- [x] **ROUNDS-style baseline**: 100 HP, no regen, damage subtracted and reset
      each round; default gun three-shots (36 dmg — one full clip is exactly
      lethal), 3 ammo, automatic whole-clip reload when empty (2s), no manual
      reload. Health stays at 100 on purpose: hazard contact, meteors,
      explosions and DoT ticks are absolute numbers weighed against that pool
- [x] **Hazards sting, not kill**: touching a hazard deals 25 damage and
      launches the player up and away (0.9s grace between hits); falling out
      of the world still kills
- [x] Winner banner → draft → next arena loop with splash screens
- [x] Bots pick cards and characters automatically
- [x] **Bots draft off-screen**: a bot never opens the card screen. Its card flies
      up over the arena and flings back into the bot that took it, and the card
      only applies when it lands. A round where only bots draft never shows the
      panel at all
- [x] **Hazards hurt instead of killing**: water ({kind:"water"} pools and the
      rising tide) is a volume you float in — small repeated bites of damage,
      each with its own flash and splash, so you can swim out — and bullets
      crossing it are dragged down. Spikes and lava still hit once and launch
      you clear

### 6. UI / UX overhaul
- [x] Character select stripped to cards only; icon row (info / sound / settings /
      fullscreen) bottom-right; Add Bot appears at 1 player, big Start Match at 2
- [x] Any pad button or WASD / arrow keys joins; slots read "Press A to join"
- [x] Pause = "Game Paused" + Resume / Settings / Quit to Menu
- [x] Spatial controller navigation (rows crossed with left/right)
- [x] All UI text extracted to `js/strings.js`
- [x] Add Bot button replaced by "(Y to add bot)" on every slot but the first
- [x] Slots are mouse-selectable: click cycles keyboard 1 → keyboard 2 → bot → empty
- [x] Arena renders at full 16:9; health rings + ammo pips ride on the fighters
      (ROUNDS-style) and player cards sit in the letterbox margins
- [x] Icon row stays bottom-right everywhere; song widget moved to bottom-left
- [x] Title always attempts fullscreen, whatever pressed start
- [x] How to Play is a full-width two-column layout that fits without scrolling
- [x] Bots read hazards and ledges instead of walking into them
- [x] Hazards damage + launch (~3 touches); the pit bounces you back twice
- [x] **Arch logo art**: `assets/images/logo-arch.png` (keyed from
      `rounders_logo_arch_v3.png`) replaces the text logo on the title screen
      and main menu; UI palette shifted to match (gunmetal panels, steel-bevel
      buttons, crystal magenta/purple accents)
- [x] Arcade title screen (flashing PRESS START, any input begins, keyboard/mouse
      start also enters fullscreen)
- [x] Full controller menu navigation (D-pad move, A/Menu confirm, B/View back)
- [x] Every menu control reachable on a pad: dropdowns cycle with ◀ ▶ / step with A
      (Arena gets on-screen ◀ ▶ arrows), D-pad scrolls long panels when the cursor
      has nowhere to go, and LB/RB cycle the corner icon row (how to play, sound,
      settings, fullscreen) with the deselected state at both ends
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

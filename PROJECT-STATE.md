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
- [ ] New card schema: id, name, rarity, tagline (flavor), description (plain-English
      explanation), effect list, tags, apply()
- [ ] 14 Common / 12 Uncommon / 10 Rare / 8 Epic / 5 Legendary / 3 Mythic = **52 cards**
- [ ] New combat mechanics to support them: burn DoT, chill (slow), pierce, chain
      lightning, shrapnel split, thorns, regen, rage (low-HP damage), adrenaline
      (low-HP speed), guardian save, golden first shot, kill-heal, storm block,
      warp block, 3 active Mythic abilities (Starfall Protocol, Event Horizon, Chronoshift)
- [ ] File: `js/cards.js`

### 3. Arena system — 25 levels with themes & personality
- [ ] Level schema: name, theme blurb, full palette (sky gradient, platform colors,
      accent), platforms, hazards, movers, features, weather particles
- [ ] Engine features: moving platforms (carry riders), bounce pads, conveyors, ice
      (slippery), wind/gusts, low gravity, teleporters, timed lightning strikes,
      rising/falling tide, syrup slow-zones, phase (crumbling) platforms,
      arena bullet-bounce modifier
- [ ] **25 arenas**, each with a distinct theme + 1–2 signature mechanics
- [ ] File: `js/levels.js`

### 4. Characters — 12 pilots, procedural + generated art
- [ ] 12 characters, all roughly circular with a signature weapon sticking out
- [ ] Procedural canvas renderer per character (crest, eyes, accessory, weapon shape,
      palette) so the game is fully playable before art is generated
- [ ] Image prompts for each character in `image-requests.md`; game auto-loads
      `assets/images/characters/<id>.png` when present, falls back to procedural
- [ ] Character select in the lobby: each player joins, cycles characters, locks in
- [ ] File: `js/characters.js`

### 5. Game flow redesign
- [ ] Random arena every round (no immediate repeats)
- [ ] Settings: arena picker — Random or lock any of the 25
- [ ] **Simultaneous drafting**: when multiple players lose a round, all of them
      draft at the same time, each with their own hand and their own controls
- [ ] Winner banner → draft → next arena loop with splash screens
- [ ] Bots pick cards and characters automatically

### 6. UI / UX overhaul
- [ ] Full visual redesign: animated gradient menu, glassmorphism panels, rarity-glow
      cards, character-portrait HUD, arena intro banner with theme blurb
- [ ] Restructured settings (grouped sections, arena picker, rarity rates)
- [ ] Files: `index.html`, `styles.css`

### 7. Audio & FX polish
- [ ] Kept: 2-track soundtrack, synth SFX, rumble
- [ ] New: per-mechanic SFX hooks (burn, chain, teleport, bounce pad), weather particles

### 8. Audit (agent pass)
- [ ] Card balance & variety audit
- [ ] Arena variety & uniqueness audit
- [ ] Character personality audit
- [ ] UI polish audit
- [ ] Findings + applied fixes: `AUDIT.md`

### 9. Ship
- [ ] Commit and push feature branch
- [ ] Merge to `main` and push

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

# Rounder

Rounder is a local multiplayer arena roguelite prototype inspired by the broad design pattern of short physics duels plus comeback card drafting. It uses original names, visuals, and card presentation so the project can grow into its own game.

## Play

Open `index.html` in a browser, or run the local server:

```bash
npm start
```

The default URL is `http://127.0.0.1:4173`.

Keyboard:

- Player 1: A/D move, W jump, F shoot, G block
- Player 2: Arrow keys move/jump, `/` shoot, `.` block

Controller:

- Left stick or D-pad moves
- A jumps
- RT/RB shoots
- LT/LB blocks
- Start rematches after a match ends

## Current Base

- 2-4 local players
- Keyboard and browser Gamepad API support
- Controller haptics where the browser and controller expose vibration
- Arena platform physics
- Ammo, reloads, blocking, ricochets, knockback, hazards
- Loser draft between rounds
- Common, uncommon, and rare cards
- Settings for player count, score limit, draft count, hazards, haptics, and screen shake

## Next Good Additions

- Better character select and controller assignment UI
- More maps and map modifiers
- More cards and clear card synergy tags
- Optional bots for empty slots
- Audio pass
- Balance presets for casual, chaos, and competitive play

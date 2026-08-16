# Composed character parts

Drop the per-character render parts here. When a character has **both** a body and
a weapon in this folder, the game stops drawing the flat `characters/<id>.png` and
composes the character instead: the body mirrors with facing while the weapon
rotates to the aim direction, with the hands riding along on the weapon.

```
assets/images/characters/render/
  <id>_body.png     body only, facing RIGHT, no weapon, no hands
  <id>_weapon.png   weapon only, aimed RIGHT
  <id>_arm.png      one or two small blobs — the hands that hold the weapon
  rigs.json         anchors + placement, authored in /workbench (optional)
```

`<id>` is the character id from `js/characters.js` (`vex`, `rook`, `jinx`, …).
The canonical `assets/images/characters/<id>.png` stays as the hero/reference
image and is still used for victory scenes and as the fallback if the parts here
are incomplete.

## Export tips

- **Keep all three parts on the same canvas as the original render** (e.g. all
  512×512, weapon and hands still where they were in the full illustration).
  When the frames match, every anchor is detected automatically and the character
  composes correctly with no hand-tuning at all.
- If a part is exported cropped to its own frame, that also works — the weapon
  just gets a generic default position that you will want to fix in `/workbench`.
- The arm image may contain one blob (used for both hands) or two (one per hand);
  each blob is cropped into its own sprite automatically.
- Transparent background, no drop shadow baked in.

## Anchors

Everything below is detected from the alpha channel on load. `rigs.json` only
needs to contain what you want to override.

| Part | Anchor | Meaning |
|---|---|---|
| body | `pivot` | the physics center — the point the game positions the character by |
| body | `radius` | the body's visual radius in image px; maps to the player's collision radius |
| body | `mount` | where the weapon's grip sits on the body |
| weapon | `grip` | the point that lands on the body's mount and the weapon rotates around |
| weapon | `muzzle` | the barrel tip — bullets and the aim ray originate here |
| arm | `pivots[i]` | the center of hand sprite *i* |

## Hand-tuning

Open `/workbench` (`npm start`, then http://127.0.0.1:4173/workbench/):

- **Character mode** — place, rotate, scale, and layer the weapon and hands on the body.
- **Anchor mode** — drag the anchor points on each source image.

Hit **Export rigs.json** and save the file into this folder. The game merges it
over the auto-detected anchors on boot. (For opening `index.html` straight off
disk, `fetch` of a local JSON is blocked by the browser — use **Export rigs.js**
instead and add `<script src="assets/images/characters/render/rigs.js"></script>`
to `index.html`.)

# Composed character parts

Drop the per-character render parts here. When a character has **both** a body and
a weapon in this folder, the game stops drawing the flat `characters/<id>.png` and
composes the character instead: the body mirrors with facing while the weapon
rotates to the aim direction, and the arms bridge the two — each arm keeps its
shoulder on the body and its hand on the weapon as the weapon swings.

```
assets/images/characters/render/
  <id>_body.png     body only, facing RIGHT, no weapon, no hands
  <id>_weapon.png   weapon only, aimed RIGHT
  <id>_arm.png      one or two arms, facing RIGHT (shoulder end left, hand end
                    right) — bare nub hands work too
  rigs.json         anchors + placement, authored in /workbench (optional)
```

`<id>` is the character id from `js/characters.js` (`vex`, `rook`, `jinx`, …).
The canonical `assets/images/characters/canonical/<id>.png` stays as the
hero/reference image and is still used for victory scenes and as the fallback if
the parts here are incomplete.

Don't hand-place files here if they arrived on a solid backdrop — drop them in
`intake/` at the repo root and run `npm run intake`, which keys the backdrop
out, writes the transparent PNG here, and keeps the delivered original in
`../archive/`.

## How the pieces get sized and placed

The weapon is the player's aim indicator, so it is fitted to the same geometry
the procedural renderer in `js/characters.js` draws, not to whatever the source
art happened to do:

| | |
|---|---|
| body | a circle is **fitted to the body's outline** (RANSAC, then least squares, then a hug-the-outline polish) and used as the collision circle. Every character is a ball with things stuck on it, so the horns, hat, flames and wings simply fall out as outliers while the round base decides the fit — the ball lands on the collision circle and the decorations stick out past it |
| weapon | scaled so **grip → muzzle is 1.5 body radii**, with the grip riding **0.55 radii out along the aim** — the same numbers as the procedural weapon, so the muzzle sits 2.05 radii out and the whole barrel lies on the aim ray |
| aim | the barrel's tilt in the source image is measured and cancelled, so the weapon points exactly where the stick does at every angle, not approximately |
| hands | bare nub hands are sized to a fraction of the body radius and placed at the grip and fore-grip |

That is all automatic and needs no rig file. The one thing the art can't tell
the game is how big a character's hands are meant to be — the parts are drawn
full-frame, so a hand arrives as a ball half the size of the body. `npm run
fitrig` recovers that from the canonical hero image (it matches the arm art into
the canonical silhouette) and writes the measured hand size and grip position to
`rigs.json`. Re-run it when new parts land; adjust anything in `/workbench`.

## Export tips

- Any framing works: parts may share the original canvas or each be drawn
  full-frame on their own. Position and scale are re-derived either way (see
  above), so what matters is that each part is drawn cleanly and **aimed right**.
- The arm image may contain one blob or two (near arm and far arm); each blob is
  cropped into its own sprite automatically. **Draw arms pointing right**, the
  same way the weapon does: the shoulder end (the end that meets the body) on the
  left, the hand end (the end that grips the weapon) on the right. The two ends
  are found from the blob's long axis, so anything clearly longer than it is wide
  gets a real shoulder and hand. A round nub with no direction to it is treated as
  a bare hand instead and is simply parented to the weapon, as before.
- With two blobs the left one is taken as the far arm and drawn behind the body.
- Transparent background is preferred; a flat magenta/green screen is fine and
  gets keyed out at intake (and, as a safety net, at load time if an un-keyed
  file ever makes it in). No drop shadow baked in.

## Opening the game from disk

Composing needs to read the images' pixels, which the browser forbids for
`file://` pages. Opened straight off disk the game falls back to the canonical
hero art (and to the procedural renderer where that is missing) — everything
still runs, the weapon just doesn't aim. Use `npm start` (or the deployed site)
to see the composed rigs.

## Anchors

Everything below is detected from the alpha channel on load. `rigs.json` only
needs to contain what you want to override.

| Part | Anchor | Meaning |
|---|---|---|
| body | `pivot` | the physics center — the point the game positions the character by |
| body | `radius` | the body's visual radius in image px; maps to the player's collision radius |
| body | `mount` | where the weapon's grip sits; only its distance from the pivot is used while `orbit` is on |
| weapon | `grip` | the point that lands on the body's mount and the weapon rotates around |
| weapon | `muzzle` | the barrel tip — bullets and the aim ray originate here |
| arm | `anchors[i].shoulder` | the end of arm sprite *i* that meets the body |
| arm | `anchors[i].hand` | the end of arm sprite *i* that grips the weapon |

Placement then lives in `rig.arms[i]`:

| Field | Space | Meaning |
|---|---|---|
| `socket` | body px | where this arm's shoulder is pinned on the body |
| `hold` | weapon px | where this arm's hand grips the weapon; it rides along as the weapon aims |
| `stretch` | — | when true the arm swings from the socket and stretches along its own axis to reach the hold; when false it is rigidly parented to the weapon (the old hand behaviour) |
| `minStretch` / `maxStretch` | — | how far the arm may squash or reach before it stops following, so it never turns into a noodle |
| `z` | — | `back` (behind the body), `mid` (behind the weapon) or `front` |

And in `rig.weapon`:

| Field | Meaning |
|---|---|
| `scale` | multiplies the body's px→world scale; the default makes the barrel 1.5 radii |
| `rotation` | degrees added to the aim angle; the default cancels the barrel's tilt in the art |
| `orbit` | when true the grip swings around the body with the aim, so the barrel stays on the aim ray (how the procedural weapon behaves). Turn it off to pin the grip where the art holds it and let the weapon rotate about that point |

Rig files written before arms existed still load: a `rig.hands` entry becomes a
rigid arm holding at the same point.

## Hand-tuning

Open `/workbench` (`npm start`, then http://127.0.0.1:4173/workbench/). The
character and the mode live in the URL (`?c=vex&mode=edit`), so a reload puts
you back where you were. Edits themselves are transient — they leave via
**Export rigs.json**.

- **Preview** (default) — just the character. Sweep the aim, or plug in a
  gamepad and aim with the stick exactly as a player would: right stick (or
  left) aims and flips facing, LB/RB change character, **A** toggles edit mode.
- **Edit mode** — the character snaps to the default pose (facing right, level)
  and an onscreen selector appears: **Body · Weapon · Hand 1 · Hand 2**. The
  selected piece gets three handles — pink to move, green to resize, yellow to
  turn — and the same three values are mirrored as numbers in the right panel,
  so you can drag or type. Arrow keys nudge (shift for bigger steps); on a pad
  the d-pad nudges, the triggers resize and **Y** cycles the piece.
  **Show references** (on by default) draws what the piece is being matched
  against: the procedural character ghosted underneath, the collision circle the
  ball has to fill, and the default aim line with its grip and muzzle marks.
  Ctrl+Z / Ctrl+Shift+Z undo and redo, one step per drag.
- **Anchors** — drag the anchor points on each source image.

Hit **Export rigs.json** and save the file into this folder. The game merges it
over the auto-detected anchors on boot.

## No art yet?

`npm run mock-parts <id>` writes crude placeholder parts on the standard layout
(body facing right, weapon aimed right, two arms reaching for it) so the rig and
the workbench can be exercised before the real files land. Delete them, or let
the real parts overwrite them, once art arrives.

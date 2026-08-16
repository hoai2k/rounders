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
`art-source/characters/`.

## Export tips

- **Keep all three parts on the same canvas as the original render** (e.g. all
  512×512, weapon and hands still where they were in the full illustration).
  When the frames match, every anchor is detected automatically and the character
  composes correctly with no hand-tuning at all.
- If a part is exported cropped to its own frame, that also works — the weapon
  just gets a generic default position that you will want to fix in `/workbench`.
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

Rig files written before arms existed still load: a `rig.hands` entry becomes a
rigid arm holding at the same point.

## Hand-tuning

Open `/workbench` (`npm start`, then http://127.0.0.1:4173/workbench/):

- **Character mode** — place, rotate, scale, and layer the weapon and arms on the
  body. Each arm gets a purple shoulder handle (on the body) and a blue hand
  handle (on the weapon); the line between them turns pink when the arm has hit
  its stretch limit and the hand has stopped reaching the weapon. Sweep the aim
  to check the whole arc.
- **Anchor mode** — drag the anchor points on each source image.

Hit **Export rigs.json** and save the file into this folder. The game merges it
over the auto-detected anchors on boot. (For opening `index.html` straight off
disk, `fetch` of a local JSON is blocked by the browser — use **Export rigs.js**
instead and add `<script src="assets/images/characters/render/rigs.js"></script>`
to `index.html`.)

## No art yet?

`npm run mock-parts <id>` writes crude placeholder parts on the standard layout
(body facing right, weapon aimed right, two arms reaching for it) so the rig and
the workbench can be exercised before the real files land. Delete them, or let
the real parts overwrite them, once art arrives.

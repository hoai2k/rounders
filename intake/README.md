# Intake drop folder

Put delivered character art here, then run:

```bash
npm run intake          # add --dry-run first to see what it would do
```

Each file is inspected, keyed if it needs it, written to the path the game
expects, and any file that had to be keyed is preserved as delivered in
`assets/images/characters/archive/`.

| Dropped file | Goes to |
|---|---|
| `vex.png` | `assets/images/characters/canonical/vex.png` |
| `vex_body.png` | `assets/images/characters/render/vex_body.png` |
| `vex_weapon.png` | `assets/images/characters/render/vex_weapon.png` |
| `vex_arm.png` | `assets/images/characters/render/vex_arm.png` |

Filenames are matched loosely (`Vex Body v2.png` works); the character id has to
appear somewhere in the name.

**What happens to the background:**

- already transparent → moved into place untouched (nothing to archive);
- flat backdrop (magenta / green / white screen) → detected from the border,
  cut out with a soft edge, and its color bleed removed from the outline. Only
  backdrop connected to the border is cut, so a magenta visor on a magenta
  screen survives.

If a cutout comes out wrong, tune it visually at `/workbench/intake.html`
(`npm start`, then http://127.0.0.1:4173/workbench/intake.html) — drop the same
file in, pick the backdrop color by clicking it, adjust tolerance / softness /
despill, and download the fixed PNG. The CLI takes the same knobs:

```bash
node tools/intake.mjs --key '#ff00ff' --tolerance 0.22 --shrink 0.1
```

Non-PNG files (JPEG/WebP) are converted first if ImageMagick or ffmpeg is on
PATH; otherwise use the browser page, which reads anything the browser can.

Everything in this folder except this README is ignored by git — it's a staging
area, not storage.

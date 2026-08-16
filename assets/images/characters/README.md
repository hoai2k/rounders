# Character art

| Folder | What's in it |
|---|---|
| `canonical/` | one hero image per character, `<id>.png` — the reference art, the portrait used in menus and victory scenes, and the in-game fallback |
| `render/` | the split parts, `<id>_body.png` / `_weapon.png` / `_arm.png`, plus `rigs.json` — what the game composes into an aiming character |
| `archive/` | delivered files that had to be keyed, exactly as they arrived (solid backdrop and all), so a cutout can be redone |

Nothing here is hand-placed. Drop delivered art into `intake/` at the repo root
and run `npm run intake`, which keys any solid backdrop out, files each image by
its name, and archives the originals it rewrote. Then `npm run fitrig` works out
how the parts compose. Both are documented in `intake/README.md` and
`render/README.md`.

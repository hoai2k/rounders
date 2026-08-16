# Canonical character art

One hero image per character: `<id>.png`, transparent PNG 512×512, body sphere
centered at ~80% of frame height with the weapon extending into the right margin.
`<id>` is the character id from `js/characters.js` (`vex`, `rook`, `jinx`, …).

This is the reference/portrait art — used for victory scenes and as the in-game
sprite for any character that does not (yet) have split parts in `../render/`.
When a character has both a body and a weapon there, the composed rig wins and
this image stays the canonical reference.

Files arriving on a solid backdrop instead of transparency don't belong here
directly: drop them in `intake/` at the repo root and run `npm run intake`,
which keys the backdrop out and writes the transparent PNG here for you.

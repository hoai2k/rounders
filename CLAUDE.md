# Claude policies for this repository

## Branch & merge policy

- Develop on the designated feature branch for the task.
- **When a task is complete (working, committed, pushed), always merge the feature
  branch into `main` and push `main`.** Do not leave finished work stranded on a
  feature branch.
- Design/planning documents that unblock the user (e.g. `image-requests.md`) should
  be committed and merged to `main` as soon as they are ready, ahead of code.

## Project conventions

- Vanilla JS + canvas, no build step. The game must run by opening `index.html`
  or via `npm start` (static server on port 4173).
- Content is data-driven and lives in `js/cards.js`, `js/levels.js`,
  `js/characters.js`; the engine lives in `game.js`.
- Generated art is optional: the game must always render correctly with procedural
  fallbacks when a PNG listed in `image-requests.md` is missing.
- Keep `PROJECT-STATE.md` checkboxes up to date as work lands, so an interrupted
  session can resume from the document alone.

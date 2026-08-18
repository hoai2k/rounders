// Rounders — sprite workbench.
//
// Left: the character roster. Right: an interactive viewer over the same rig
// code the game uses (js/rig.js), so what you see here is what ships.
//
// Three modes, kept in the URL (?c=vex&mode=edit) so a reload lands you back
// where you were:
//
//   view    a clean preview — no handles, no reference overlay. Sweep the aim,
//           or grab a gamepad and aim with the stick the way a player would,
//           and pull a trigger to shoot from the rig's own muzzle.
//   edit    pick a piece (body / weapon / hand) from the onscreen selector and
//           move, scale or rotate it with the handles that appear. References
//           show what the piece is being matched against.
//   anchor  the anchor points inside each source image.
//
// Character edits are transient: they live in memory (and feed straight back
// into rig.js so the preview is live), and leave via Export rigs.json.
(() => {
  "use strict";
  const { CHARACTERS, drawCharacter, characterImage, rig } = window.ROUNDERS;

  const $ = (id) => document.getElementById(id);
  // Read once, at boot: the first select() writes the URL back out, so anything
  // that reads location.search later sees the rewritten one and a deep link
  // into the Effects section would be lost.
  const bootQ = new URLSearchParams(location.search);
  const view = $("view");
  const ctx = view.getContext("2d");

  const state = {
    id: CHARACTERS[0].id,
    section: "characters", // characters | effects — which roster is showing
    mode: "view",          // view | edit | anchor
    part: "body",          // anchor mode: which source image
    arm: 0,                // anchor/arm mode: which arm is being placed
    zoom: 2,
    pan: { x: 0, y: 0 },
    r: 52,
    aim: 0,
    spin: false,
    faceLeft: false,      // which way the body is turned — movement, not aim
    showRefs: true,
    showShots: true,
    onion: false,
    drag: null,
    built: null,
    padName: null
  };

  // Preview shots: fired from the muzzle the rig reports, so a weapon that is
  // aimed or placed wrong shows it immediately — the tracer leaves the barrel
  // at an angle, or from the wrong end.
  const shots = { live: [], flash: 0, cooldown: 0 };

  const work = new Map();   // id -> serializable rig record (also pushed into rig.js)
  const dirty = new Set();

  // Undo/redo over whole-character snapshots. Edits are small and rare enough
  // that diffing would only add ways to be wrong; a drag is one step.
  const hist = { undo: [], redo: [], limit: 100 };

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const round = (v, p = 2) => Math.round(v * 10 ** p) / 10 ** p;
  const deg = (v) => (v * 180) / Math.PI;
  const rad = (v) => (v * Math.PI) / 180;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // --------------------------------------------------------------- records

  // Build an editable record for a character from whatever rig.js resolved
  // (auto-detected anchors, with any imported overrides already merged).
  function record(id) {
    if (work.has(id)) return work.get(id);
    const R = rig.resolved(id);
    if (!R) return null;
    const rec = {
      body: { pivot: clone(R.body.pivot), radius: R.body.radius, mount: clone(R.body.mount) },
      weapon: { grip: clone(R.weapon.grip), muzzle: clone(R.weapon.muzzle) },
      arm: { anchors: R.arm.anchors.map((a) => clone(a)) },
      rig: {
        bodyScale: R.rig.bodyScale,
        bodyRotation: R.rig.bodyRotation || 0,
        bodyOffset: clone(R.rig.bodyOffset || { x: 0, y: 0 }),
        weapon: {
          distance: R.rig.weapon.distance,
          rotation: R.rig.weapon.rotation,
          offset: clone(R.rig.weapon.offset),
          orbit: !!R.rig.weapon.orbit,
          behind: !!R.rig.weapon.behind
        },
        arms: R.rig.arms.map((a) => ({ ...clone(a), rotation: a.rotation || 0 }))
      }
    };
    work.set(id, rec);
    rig.setCharacterRig(id, rec);
    return rec;
  }

  function touch(id) {
    dirty.add(id);
    rig.setCharacterRig(id, work.get(id));
    syncJson();
  }

  // Run an edit as one undoable step.
  function edit(id, fn) {
    const before = clone(record(id));
    fn();
    commit(id, before);
  }

  function commit(id, before) {
    const after = clone(work.get(id));
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    hist.undo.push({ id, before, after });
    if (hist.undo.length > hist.limit) hist.undo.shift();
    hist.redo.length = 0;
    touch(id);
    syncHistoryButtons();
  }

  function step(stack, other, pick) {
    const entry = stack.pop();
    if (!entry) return;
    other.push(entry);
    work.set(entry.id, clone(pick(entry)));
    dirty.add(entry.id);
    rig.setCharacterRig(entry.id, work.get(entry.id));
    if (entry.id !== state.id) select(entry.id);
    else rebuild();
    syncJson();
    syncHistoryButtons();
  }
  const undo = () => step(hist.undo, hist.redo, (e) => e.before);
  const redo = () => step(hist.redo, hist.undo, (e) => e.after);

  function syncHistoryButtons() {
    $("undoBtn").disabled = !hist.undo.length;
    $("redoBtn").disabled = !hist.redo.length;
  }

  function tidy(rec) {
    const r2 = clone(rec);
    const fix = (o) => {
      for (const k of Object.keys(o)) {
        if (typeof o[k] === "number") o[k] = round(o[k]);
        else if (o[k] && typeof o[k] === "object") fix(o[k]);
      }
    };
    fix(r2);
    return r2;
  }

  // The rig file is a set of *overrides*: rig.js detects everything from the
  // alpha channel and merges the file on top. So only what has actually been
  // changed is written — a value that merely matches today's detection would
  // silently freeze it, and a character that has been left alone is left out of
  // the file entirely.
  const EPS = 0.01;
  const sameNum = (a, b) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= EPS;
  const samePt = (a, b) => !!a && !!b && sameNum(a.x, b.x) && sameNum(a.y, b.y);
  const some = (o) => (Object.keys(o).length ? o : null);

  function diffRecord(id, rec) {
    const auto = rig.analyze(id);
    if (!auto || !rec) return null;
    const out = {};

    const body = {};
    if (!samePt(rec.body.pivot, auto.body.pivot)) body.pivot = rec.body.pivot;
    if (!sameNum(rec.body.radius, auto.body.radius)) body.radius = rec.body.radius;
    if (!samePt(rec.body.mount, auto.body.mount)) body.mount = rec.body.mount;
    if (some(body)) out.body = body;

    const weapon = {};
    if (!samePt(rec.weapon.grip, auto.weapon.grip)) weapon.grip = rec.weapon.grip;
    if (!samePt(rec.weapon.muzzle, auto.weapon.muzzle)) weapon.muzzle = rec.weapon.muzzle;
    if (some(weapon)) out.weapon = weapon;

    // Anchors are per sprite, so the array stays dense (index = sprite) even
    // when only one of them moved.
    const anchors = rec.arm.anchors.map((a, i) => {
      const d = auto.arm.anchors[i];
      const e = {};
      if (!samePt(a.shoulder, d && d.shoulder)) e.shoulder = a.shoulder;
      if (!samePt(a.hand, d && d.hand)) e.hand = a.hand;
      if (d && !sameNum(a.radius, d.radius)) e.radius = a.radius;
      return e;
    });
    if (anchors.some((e) => Object.keys(e).length)) out.arm = { anchors };

    const r = {};
    const ar = auto.rig;
    if (!sameNum(rec.rig.bodyScale, ar.bodyScale)) r.bodyScale = rec.rig.bodyScale;
    if (!sameNum(rec.rig.bodyRotation, ar.bodyRotation)) r.bodyRotation = rec.rig.bodyRotation;
    if (!samePt(rec.rig.bodyOffset, ar.bodyOffset)) r.bodyOffset = rec.rig.bodyOffset;

    const w = {};
    const aw = ar.weapon;
    if (!sameNum(rec.rig.weapon.distance, aw.distance)) w.distance = rec.rig.weapon.distance;
    if (!sameNum(rec.rig.weapon.rotation, aw.rotation)) w.rotation = rec.rig.weapon.rotation;
    if (!samePt(rec.rig.weapon.offset, aw.offset)) w.offset = rec.rig.weapon.offset;
    if (!!rec.rig.weapon.orbit !== !!aw.orbit) w.orbit = !!rec.rig.weapon.orbit;
    if (!!rec.rig.weapon.behind !== !!aw.behind) w.behind = !!rec.rig.weapon.behind;
    if (some(w)) r.weapon = w;

    // Arms exist only when asked for, so any arm at all is a change. Each one
    // still gets trimmed against where it would have been placed.
    if (rec.rig.arms.length) {
      const plan = rig.defaultArms(id, rec.rig.arms.length);
      r.arms = rec.rig.arms.map((a, i) => {
        const d = plan[i] || {};
        const e = { sprite: a.sprite };
        if (!samePt(a.hold, d.hold)) e.hold = a.hold;
        if (!samePt(a.socket, d.socket)) e.socket = a.socket;
        if (!sameNum(a.scale, d.scale)) e.scale = a.scale;
        if (!sameNum(a.rotation || 0, d.rotation || 0)) e.rotation = a.rotation || 0;
        if (!!a.stretch !== !!d.stretch) e.stretch = !!a.stretch;
        if (!sameNum(a.minStretch, d.minStretch)) e.minStretch = a.minStretch;
        if (!sameNum(a.maxStretch, d.maxStretch)) e.maxStretch = a.maxStretch;
        if (a.z !== d.z) e.z = a.z;
        return e;
      });
    }
    if (some(r)) out.rig = r;

    return some(out) ? tidy(out) : null;
  }

  function exportData() {
    const characters = {};
    for (const ch of CHARACTERS) {
      if (!rig.hasRig(ch.id)) continue;
      const d = diffRecord(ch.id, record(ch.id));
      if (d) characters[ch.id] = d;
    }
    const effects = fxExport();
    const out = {
      version: 1,
      note: "Authored in /workbench. Overrides only — anything not listed here is detected from the art. Values are source-image pixels unless noted.",
      characters
    };
    // Effect sheets ride along in the same file: name -> { scale, rotation },
    // and only the ones moved off 1x / 0°.
    if (Object.keys(effects).length) out.effects = effects;
    return out;
  }

  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url; a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    dirty.clear();
  }

  // ------------------------------------------------------------------ url

  function readUrl() {
    const q = new URLSearchParams(location.search);
    const c = q.get("c");
    if (c && CHARACTERS.some((x) => x.id === c)) state.id = c;
    const m = q.get("mode");
    if (["view", "edit", "anchor"].includes(m)) state.mode = m;
    const p = q.get("part");
    if (["body", "weapon", "arm"].includes(p)) state.part = p;
    const a = Number(q.get("arm"));
    if (Number.isInteger(a) && a >= 0) state.arm = a;
  }

  function writeUrl() {
    const q = new URLSearchParams();
    if (state.section === "effects") {
      q.set("section", "effects");
      if (fxState.name) q.set("fx", fxState.name);
      history.replaceState(null, "", `${location.pathname}?${q}`);
      return;
    }
    q.set("c", state.id);
    q.set("mode", state.mode);
    if (state.mode === "anchor") q.set("part", state.part);
    if (state.mode === "anchor" && state.part === "arm") q.set("arm", String(state.arm));
    history.replaceState(null, "", `${location.pathname}?${q}`);
  }

  // ------------------------------------------------------------ geometry

  // Aim and facing are separate, the way the game drives them: the aim slider
  // (or the right stick) points the weapon, while facing (the left stick, i.e.
  // which way the character is moving) turns the body. Edit and anchor modes
  // pose the character straight ahead so handles mean the same thing every time.
  function aimVec() {
    if (state.mode !== "view") return { x: 1, y: 0 };
    const a = rad(state.aim);
    return { x: Math.cos(a), y: Math.sin(a) };
  }
  function facing() {
    return state.mode !== "view" ? 1 : (state.faceLeft ? -1 : 1);
  }

  function frame() {
    const A = aimVec();
    const T = rig.transform(state.id, state.r, A.x, A.y, 0, facing());
    if (!T) return null;
    return { T, cx: view.clientWidth / 2 + state.pan.x, cy: view.clientHeight / 2 + state.pan.y, z: state.zoom, A };
  }

  // mirrored rig space <-> screen
  // Grip, muzzle and hold points are weapon-space, so they mirror with the
  // weapon's facing rather than the body's — the two disagree whenever the
  // player aims behind themselves.
  const toScreen = (f, p) => ({ x: f.cx + p.x * f.T.wFacing * f.z, y: f.cy + p.y * f.z });
  const toRigSpace = (f, p) => ({ x: ((p.x - f.cx) / f.z) * f.T.wFacing, y: (p.y - f.cy) / f.z });

  // weapon-image px <-> mirrored rig space
  function weaponToRig(f, px, py) {
    const { T } = f;
    const x = (px - T.R.weapon.grip.x) * T.kw;
    const y = (py - T.R.weapon.grip.y) * T.kw;
    return {
      x: T.mount.x + x * Math.cos(T.angle) - y * Math.sin(T.angle),
      y: T.mount.y + x * Math.sin(T.angle) + y * Math.cos(T.angle)
    };
  }
  function rigToWeapon(f, p) {
    const { T } = f;
    const dx = p.x - T.mount.x, dy = p.y - T.mount.y;
    const c = Math.cos(-T.angle), s = Math.sin(-T.angle);
    return {
      x: (dx * c - dy * s) / T.kw + T.R.weapon.grip.x,
      y: (dx * s + dy * c) / T.kw + T.R.weapon.grip.y
    };
  }

  // body-image px <-> mirrored rig space
  const bodyToRig = (f, p) => ({ x: (p.x - f.T.R.body.pivot.x) * f.T.k, y: (p.y - f.T.R.body.pivot.y) * f.T.k });
  const rigToBody = (f, p) => ({ x: p.x / f.T.k + f.T.R.body.pivot.x, y: p.y / f.T.k + f.T.R.body.pivot.y });

  // anchor mode: image px <-> screen
  // Arms are placed against the weapon they hold, so the arm tab shows the
  // weapon image and draws the arm sprites on top of it — the same relationship
  // the game renders, just standing still.
  function anchorImage() {
    const a = rig.assets(state.id);
    return state.part === "body" ? a.body : a.weapon;
  }
  const imgToScreen = (img, p) => ({
    x: view.clientWidth / 2 + state.pan.x + (p.x - img.width / 2) * state.zoom,
    y: view.clientHeight / 2 + state.pan.y + (p.y - img.height / 2) * state.zoom
  });
  const screenToImg = (img, p) => ({
    x: (p.x - view.clientWidth / 2 - state.pan.x) / state.zoom + img.width / 2,
    y: (p.y - view.clientHeight / 2 - state.pan.y) / state.zoom + img.height / 2
  });

  // --------------------------------------------------------------- shots

  const FIRE_RATE = 0.14;      // seconds between shots while held
  const SHOT_SPEED = 13;       // body radii per second
  const SHOT_LIFE = 2.4;

  // The muzzle the game would fire from. Falls back to the procedural spec
  // (2.05 r along the aim) for a character with no composed rig.
  function muzzlePoint(A) {
    const ch = CHARACTERS.find((c) => c.id === state.id);
    return rig.muzzle(ch, state.r, A.x, A.y, 0, facing())
      || { x: A.x * state.r * 2.05, y: A.y * state.r * 2.05 };
  }

  function fire() {
    if (!state.showShots || state.mode === "anchor") return;
    const A = aimVec();
    const m = muzzlePoint(A);
    const len = Math.hypot(A.x, A.y) || 1;
    shots.live.push({
      x: m.x, y: m.y,
      vx: (A.x / len) * SHOT_SPEED * state.r,
      vy: (A.y / len) * SHOT_SPEED * state.r,
      life: SHOT_LIFE
    });
    shots.flash = 0.07;
  }

  function stepShots(dt) {
    shots.flash = Math.max(0, shots.flash - dt);
    shots.cooldown = Math.max(0, shots.cooldown - dt);
    for (const s of shots.live) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    shots.live = shots.live.filter((s) => s.life > 0);
  }

  function holdFire(dt) {
    if (shots.cooldown > 0) return;
    shots.cooldown = FIRE_RATE;
    fire();
    void dt;
  }

  // Drawn in the same space the character is drawn in, so a tracer that misses
  // the barrel is a rig problem, not a drawing one.
  function renderShots(f) {
    if (!state.showShots) return;
    for (const s of shots.live) {
      const t = Math.max(0, Math.min(1, s.life / SHOT_LIFE));
      ctx.strokeStyle = `rgba(255,214,77,${0.25 + 0.5 * t})`;
      ctx.lineWidth = 3 / f.z;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 0.02, s.y - s.vy * 0.02);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,245,214,${0.4 + 0.6 * t})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3 / f.z, 0, Math.PI * 2);
      ctx.fill();
    }
    if (shots.flash > 0) {
      const A = aimVec();
      const m = muzzlePoint(A);
      const a = shots.flash / 0.07;
      const r = state.r * 0.3 * a;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(Math.atan2(A.y, A.x));
      ctx.fillStyle = `rgba(255,224,140,${0.85 * a})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 1.6, -r * 0.5);
      ctx.lineTo(r * 2.2, 0);
      ctx.lineTo(r * 1.6, r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------ arms

  // How many arms this character wears. Nothing is worn until it is asked for,
  // so a character shows arms only once they have been placed here.
  function armCount() {
    const rec = record(state.id);
    return rec ? rec.rig.arms.length : 0;
  }

  function setArmCount(n) {
    const rec = record(state.id);
    if (!rec || n === rec.rig.arms.length) return;
    edit(state.id, () => {
      if (n < rec.rig.arms.length) rec.rig.arms.length = n;
      else {
        // Keep whatever is already placed; new arms come in on the plan.
        const plan = rig.defaultArms(state.id, n);
        for (let i = rec.rig.arms.length; i < n; i += 1) {
          if (plan[i]) rec.rig.arms.push(clone(plan[i]));
          else if (rec.rig.arms.length) rec.rig.arms.push({ ...clone(rec.rig.arms[0]), z: "front" });
        }
      }
      state.arm = Math.max(0, Math.min(state.arm, rec.rig.arms.length - 1));
    });
    rebuild();
  }

  // The count lives with the arm anchors, next to the arm being placed —
  // it is part of rigging the arms, not a global view option.
  function armCountRow() {
    const rec = record(state.id);
    const row = document.createElement("label");
    row.className = "row";
    row.append("Arms");
    const sel = document.createElement("select");
    for (const [v, label] of [[0, "None"], [1, "One"], [2, "Two"]]) {
      const o = document.createElement("option");
      o.value = String(v); o.textContent = label;
      sel.appendChild(o);
    }
    sel.value = String(Math.min(2, rec ? rec.rig.arms.length : 0));
    sel.addEventListener("change", () => setArmCount(Number(sel.value)));
    row.appendChild(sel);
    return row;
  }

  // Every panel that depends on the current character/mode/arm, in one call, so
  // nothing is left showing the last character's numbers.
  function rebuild() {
    buildParts();
    buildSelPanel();
    syncJson();
    state.built = `${state.id}|${state.mode}|${state.part}|${state.arm}|${armCount()}`;
  }

  // ------------------------------------------------------- edit-mode piece

  // Edit mode has one thing to set: how far out the grip sits. The muzzle is
  // pinned at a fixed radius, so that one number places the weapon *and* sizes
  // it — pull the grip in and the weapon grows to reach, push it out and it
  // shrinks. Everything else about the weapon comes from its anchors.
  function gripHandle(f) {
    if (state.mode !== "edit") return null;
    return { at: toScreen(f, f.T.mount) };
  }

  function setDistance(v) {
    const rec = record(state.id);
    if (!rec) return;
    rec.rig.weapon.distance = clamp(v, 0.05, 1.9);
  }

  // --------------------------------------------------------- anchor handles

  function anchorHandles() {
    const rec = record(state.id);
    const img = anchorImage();
    if (!rec || !img) return [];
    const out = [];
    if (state.part === "body") {
      out.push({ key: "body.pivot", label: "pivot", at: imgToScreen(img, rec.body.pivot), color: "#ff4d8f" });
      out.push({ key: "body.radius", label: "radius", at: imgToScreen(img, { x: rec.body.pivot.x + rec.body.radius, y: rec.body.pivot.y }), color: "#6ee787" });
    } else if (state.part === "weapon") {
      out.push({ key: "weapon.grip", label: "grip", at: imgToScreen(img, rec.weapon.grip), color: "#ff4d8f" });
      out.push({ key: "weapon.muzzle", label: "muzzle", at: imgToScreen(img, rec.weapon.muzzle), color: "#29d7ff" });
    }
    return out;
  }

  function applyAnchorDrag(key, pos) {
    const rec = record(state.id);
    const img = anchorImage();
    if (!rec || !img) return;
    const p = screenToImg(img, pos);
    if (key === "body.pivot") rec.body.pivot = { x: p.x, y: p.y };
    else if (key === "body.mount") rec.body.mount = { x: p.x, y: p.y };
    else if (key === "body.radius") rec.body.radius = Math.max(4, Math.hypot(p.x - rec.body.pivot.x, p.y - rec.body.pivot.y));
    else if (key === "weapon.grip") rec.weapon.grip = { x: p.x, y: p.y };
    else if (key === "weapon.muzzle") rec.weapon.muzzle = { x: p.x, y: p.y };
    touch(state.id);
  }

  // -------------------------------------------------------------- drawing

  function fitCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(view.clientWidth * dpr);
    const h = Math.round(view.clientHeight * dpr);
    if (view.width !== w || view.height !== h) { view.width = w; view.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function render() {
    fitCanvas();
    ctx.clearRect(0, 0, view.clientWidth, view.clientHeight);
    const ch = CHARACTERS.find((c) => c.id === state.id);
    const ready = rig.hasRig(state.id);
    $("empty").hidden = ready;
    if (!ready) {
      $("empty").textContent =
        `No render parts for "${ch.name}".\n\n`
        + `Drop these into assets/images/characters/render/ :\n`
        + `${state.id}_body.png · ${state.id}_weapon.png · ${state.id}_arm.png`;
      return;
    }
    record(state.id);
    if (state.mode === "anchor") {
      if (state.part === "body") {
        renderBodyFit();
        renderBodyGizmo();
        return;
      }
      renderAnchor();
      if (state.part === "arm") renderArmGizmo();
      else renderHandles(anchorHandles());
      return;
    }
    renderCharacter(ch);
    if (state.mode === "edit") renderGrip();
  }

  function renderCharacter(ch) {
    const f = frame();
    if (!f) return;
    ctx.save();
    ctx.translate(f.cx, f.cy);
    ctx.scale(f.z, f.z);

    // References belong to edit mode only — preview mode stays clean. The
    // ghost goes under the art, the measurements go over it.
    if (state.mode === "edit" && state.showRefs) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      drawCharacter(ctx, ch, state.r, { t: 0, aimX: 1, aimY: 0, useImage: false });
      ctx.restore();
    }

    const A = aimVec();
    drawCharacter(ctx, ch, state.r, { t: 0, aimX: A.x, aimY: A.y, facing: facing() });
    renderShots(f);

    if (state.mode === "edit" && state.showRefs) {
      // Drawn on top so the ball can be lined up against the circle it has to
      // fill: the collision circle, and the default aim with grip and muzzle.
      ctx.strokeStyle = "rgba(110,231,135,0.85)";
      ctx.lineWidth = 1.5 / f.z;
      ctx.setLineDash([5 / f.z, 4 / f.z]);
      ctx.beginPath();
      ctx.arc(0, 0, state.r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,210,77,0.8)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(f.T.wFacing * state.r * 2.05, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,210,77,0.9)";
      for (const [at, label] of [[0.55, "grip"], [2.05, "muzzle"]]) {
        const x = f.T.wFacing * state.r * at;
        ctx.beginPath();
        ctx.arc(x, 0, 3 / f.z, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.scale(1 / f.z, 1 / f.z);
        ctx.font = "10px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(label, x * f.z, -8);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function renderAnchor() {
    const a = rig.assets(state.id);
    const img = anchorImage();
    const p0 = { x: view.clientWidth / 2 + state.pan.x, y: view.clientHeight / 2 + state.pan.y };
    if (!img) {
      ctx.fillStyle = "#9a92b8";
      ctx.textAlign = "center";
      ctx.fillText(`No ${state.part} image for ${state.id}`, p0.x, p0.y);
      return;
    }
    ctx.save();
    ctx.translate(p0.x, p0.y);
    ctx.scale(state.zoom, state.zoom);
    if (state.onion) {
      ctx.globalAlpha = 0.22;
      for (const part of ["body", "weapon", "arm"]) {
        if (part === state.part || !a[part]) continue;
        ctx.drawImage(a[part], -a[part].width / 2, -a[part].height / 2);
      }
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    // Arm tab: the arms ride on the weapon, drawn exactly as the rig draws them.
    if (state.part === "arm") {
      const rec0 = record(state.id);
      const R0 = rig.resolved(state.id);
      if (rec0 && R0) {
        const kArm = rec0.body.radius / Math.max(1, R0.body.radius);
        rec0.rig.arms.forEach((arm, i) => {
          const sprite = R0.arm.sprites[arm.sprite];
          if (!sprite) return;
          const anchor = rec0.arm.anchors[arm.sprite] || { x: sprite.cx, y: sprite.cy };
          const sc = arm.scale * kArm;
          ctx.save();
          ctx.globalAlpha = i === state.arm ? 1 : 0.55;
          ctx.translate(-img.width / 2 + arm.hold.x, -img.height / 2 + arm.hold.y);
          ctx.rotate(((arm.rotation || 0) * Math.PI) / 180);
          ctx.translate(-anchor.hand.x * sc, -anchor.hand.y * sc);
          ctx.drawImage(sprite.canvas, sprite.frame.x * sc, sprite.frame.y * sc, sprite.frame.w * sc, sprite.frame.h * sc);
          ctx.restore();
        });
      }
    }

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1 / state.zoom;
    ctx.strokeRect(-img.width / 2, -img.height / 2, img.width, img.height);

    const rec = record(state.id);
    if (rec) {
      const off = { x: -img.width / 2, y: -img.height / 2 };
      ctx.lineWidth = 1.5 / state.zoom;
      if (state.part === "body") {
        ctx.strokeStyle = "rgba(110,231,135,0.85)";
        ctx.beginPath();
        ctx.arc(off.x + rec.body.pivot.x, off.y + rec.body.pivot.y, rec.body.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (state.part === "weapon") {
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.setLineDash([5 / state.zoom, 4 / state.zoom]);
        ctx.beginPath();
        ctx.moveTo(off.x + rec.weapon.grip.x, off.y + rec.weapon.grip.y);
        ctx.lineTo(off.x + rec.weapon.muzzle.x, off.y + rec.weapon.muzzle.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  // Edit mode's only handle: the grip, draggable along the aim axis.
  function renderGrip() {
    const f = frame();
    if (!f) return;
    const g = gripHandle(f);
    if (!g) return;
    const rec = record(state.id);
    ctx.save();
    ctx.strokeStyle = "rgba(255,77,143,0.5)";
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(f.cx, f.cy);
    ctx.lineTo(g.at.x, g.at.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(g.at.x, g.at.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ff4d8f";
    ctx.fill();
    ctx.strokeStyle = "#14121c";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#efe9ff";
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`grip ${round(rec.rig.weapon.distance, 2)} r`, g.at.x, g.at.y - 14);
    ctx.restore();
  }

  // Body tab: the job here is to sit the ball on the collision circle at the
  // same size every character uses, so this shows the body exactly as the game
  // draws it with that circle over the top — move, size and turn the art until
  // they agree.
  function renderBodyFit() {
    const rec = record(state.id);
    const a = rig.assets(state.id);
    if (!rec || !a.body) return;
    const cx = view.clientWidth / 2 + state.pan.x;
    const cy = view.clientHeight / 2 + state.pan.y;
    const ch = CHARACTERS.find((c) => c.id === state.id);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(state.zoom, state.zoom);

    if (state.showRefs) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      drawCharacter(ctx, ch, state.r, { t: 0, aimX: 1, aimY: 0, useImage: false });
      ctx.restore();
    }

    const k = (state.r / Math.max(1e-3, rec.body.radius)) * rec.rig.bodyScale;
    ctx.save();
    ctx.translate(rec.rig.bodyOffset.x * state.r, rec.rig.bodyOffset.y * state.r);
    ctx.rotate(rad(rec.rig.bodyRotation));
    ctx.drawImage(a.body, -rec.body.pivot.x * k, -rec.body.pivot.y * k, a.body.width * k, a.body.height * k);
    ctx.restore();

    // the circle the ball has to match, plus the centre it turns about
    ctx.strokeStyle = "rgba(110,231,135,0.95)";
    ctx.lineWidth = 2 / state.zoom;
    ctx.setLineDash([6 / state.zoom, 5 / state.zoom]);
    ctx.beginPath();
    ctx.arc(0, 0, state.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1 / state.zoom;
    ctx.beginPath();
    ctx.moveTo(-state.r * 1.3, 0); ctx.lineTo(state.r * 1.3, 0);
    ctx.moveTo(0, -state.r * 1.3); ctx.lineTo(0, state.r * 1.3);
    ctx.stroke();
    ctx.restore();
  }

  function bodyGizmo() {
    const rec = record(state.id);
    if (!rec) return null;
    const cx = view.clientWidth / 2 + state.pan.x;
    const cy = view.clientHeight / 2 + state.pan.y;
    const o = {
      x: cx + rec.rig.bodyOffset.x * state.r * state.zoom,
      y: cy + rec.rig.bodyOffset.y * state.r * state.zoom
    };
    const d = state.r * rec.rig.bodyScale * state.zoom + 26;
    const a = rad(rec.rig.bodyRotation);
    return {
      origin: o,
      move: o,
      scale: { x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d },
      rotate: { x: o.x + Math.cos(a + Math.PI / 2) * d * 0.78, y: o.y + Math.sin(a + Math.PI / 2) * d * 0.78 }
    };
  }

  function renderBodyGizmo() {
    const g = bodyGizmo();
    if (g) drawGizmo(g);
  }

  function drawGizmo(g) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.origin.x, g.origin.y); ctx.lineTo(g.scale.x, g.scale.y);
    ctx.moveTo(g.origin.x, g.origin.y); ctx.lineTo(g.rotate.x, g.rotate.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const dot = (p, color, square) => {
      ctx.fillStyle = color;
      ctx.strokeStyle = "#14121c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (square) ctx.rect(p.x - 6, p.y - 6, 12, 12); else ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };
    dot(g.move, "#ff4d8f");
    dot(g.scale, "#6ee787", true);
    dot(g.rotate, "#ffd24d");
    ctx.fillStyle = "#efe9ff";
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("move", g.move.x, g.move.y - 12);
    ctx.fillText("size", g.scale.x, g.scale.y - 12);
    ctx.fillText("turn", g.rotate.x, g.rotate.y - 12);
    ctx.restore();
  }

  // Anchor/arm mode: the arm sprites sit on the weapon, so each gets a
  // move / size / turn gizmo in weapon-image space.
  function armGizmo() {
    const rec = record(state.id);
    const img = anchorImage();
    const R = rig.resolved(state.id);
    if (!rec || !img || !R) return null;
    const arm = rec.rig.arms[state.arm];
    if (!arm) return null;
    const sprite = R.arm.sprites[arm.sprite];
    const anchor = rec.arm.anchors[arm.sprite];
    const o = imgToScreen(img, arm.hold);
    // The arm's on-screen size follows the same ratio the game draws it at:
    // hand radius in body radii, mapped through the weapon's own scale.
    const radiusPx = (anchor ? anchor.radius : 20) * arm.scale * (rec.body.radius / Math.max(1, R.body.radius));
    const d = Math.max(44, radiusPx * state.zoom + 26);
    const a = rad(arm.rotation || 0);
    return {
      sprite, anchor, arm,
      origin: o,
      radiusPx,
      move: o,
      scale: { x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d },
      rotate: { x: o.x + Math.cos(a + Math.PI / 2) * d * 0.78, y: o.y + Math.sin(a + Math.PI / 2) * d * 0.78 }
    };
  }

  function renderArmGizmo() {
    const g = armGizmo();
    if (g) drawGizmo(g);
  }

  function renderHandles(list) {
    ctx.save();
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (const h of list) {
      ctx.beginPath();
      ctx.arc(h.at.x, h.at.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = h.color;
      ctx.fill();
      ctx.strokeStyle = "#14121c";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#efe9ff";
      ctx.fillText(h.label, h.at.x, h.at.y - 11);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------- roster

  function buildRoster() {
    const grid = $("grid");
    grid.textContent = "";
    for (const ch of CHARACTERS) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.id = ch.id;
      tile.title = `${ch.name} — ${ch.title}`;
      const cv = document.createElement("canvas");
      cv.width = 128; cv.height = 128;
      const badges = document.createElement("div");
      badges.className = "badges";
      for (const p of ["body", "weapon", "arm"]) {
        const b = document.createElement("span");
        b.className = "badge";
        b.dataset.part = p;
        b.textContent = p[0].toUpperCase();
        badges.appendChild(b);
      }
      const nm = document.createElement("div");
      nm.className = "nm";
      nm.textContent = ch.name;
      tile.append(cv, badges, nm);
      tile.addEventListener("click", () => select(ch.id));
      grid.appendChild(tile);
    }
  }

  function refreshTiles() {
    if (state.section === "effects") return;   // the roster is showing sheets
    let rigged = 0;
    for (const tile of document.querySelectorAll(".tile")) {
      const id = tile.dataset.id;
      const ch = CHARACTERS.find((c) => c.id === id);
      const a = rig.assets(id);
      for (const b of tile.querySelectorAll(".badge")) b.classList.toggle("has", !!a[b.dataset.part]);
      tile.classList.toggle("on", id === state.id);
      let dot = tile.querySelector(".dirty");
      if (dirty.has(id) && !dot) {
        dot = document.createElement("span");
        dot.className = "dirty";
        tile.appendChild(dot);
      } else if (!dirty.has(id) && dot) dot.remove();
      if (rig.hasRig(id)) rigged += 1;
      const cv = tile.querySelector("canvas");
      const c = cv.getContext("2d");
      c.clearRect(0, 0, cv.width, cv.height);
      c.save();
      c.translate(cv.width / 2, cv.height / 2 + 4);
      drawCharacter(c, ch, 34, { t: 0, aimX: 1, aimY: 0 });
      c.restore();
    }
    $("rosterCount").textContent = `${rigged}/${CHARACTERS.length} rigged`;
  }

  // Changing character never changes what you were doing: the mode, the part
  // tab and the handles stay exactly as they were, only pointed at the new art.
  function select(id) {
    state.id = id;
    state.pan = { x: 0, y: 0 };
    record(id);
    state.arm = 0;
    shots.live.length = 0;
    rebuild();
    refreshTiles();
    syncHead();
    writeUrl();
  }

  function syncHead() {
    if (state.section === "effects") return;
    const ch = CHARACTERS.find((c) => c.id === state.id);
    $("charName").textContent = `${ch.name} — ${ch.title}`;
    const R = rig.resolved(state.id);
    const a = rig.assets(state.id);
    const bits = [];
    if (R) {
      bits.push(`body ${R.meta.bodySize.join("×")}`);
      bits.push(`weapon ${R.meta.weaponSize.join("×")}`);
      bits.push(`${R.arm.sprites.length} arm sprite(s)`);
    } else if (a.state === "loading") bits.push("loading…");
    else bits.push("no render parts");
    $("charInfo").textContent = bits.join(" · ");

    $("hint").textContent = state.mode === "edit"
      ? "Drag the pink grip along the aim to set how far the weapon is held from the body. The muzzle stays put at 2.05 r, so pulling the grip in lengthens the weapon and pushing it out shortens it."
      : state.mode === "anchor"
        ? (state.part === "arm"
          ? "The arms sit on the weapon: drag the pink dot to place this arm, the green square to size it, the yellow dot to turn it. Pick which arm above the viewer."
          : state.part === "weapon"
            ? "Grip → muzzle is the weapon's aim line: whatever angle you set here is the direction the weapon points when the player aims, and the muzzle is where shots come from."
            : "Match the ball to the green circle — every character uses the same one. Drag pink to move the art, the green square to size it, yellow to turn it.")
        : "Preview. The right stick aims and the left stick turns the body (facing follows movement, not aim); pull a trigger — space on the keyboard — to shoot, and the tracer leaves the muzzle the game fires from.";
  }

  // ---------------------------------------------- edit-mode part selector

  // Onscreen chips: in the arm anchor tab they pick which arm you are placing.
  function buildParts() {
    const box = $("parts");
    box.textContent = "";
    const armMode = state.mode === "anchor" && state.part === "arm";
    box.hidden = !armMode;
    if (!armMode) return;
    const rec = record(state.id);
    if (!rec) return;
    rec.rig.arms.forEach((_, i) => {
      const b = document.createElement("button");
      b.textContent = `Arm ${i + 1}`;
      b.classList.toggle("on", i === state.arm);
      b.addEventListener("click", () => {
        state.arm = i;
        rebuild();
        writeUrl();
      });
      box.appendChild(b);
    });
  }

  function buildSelPanel() {
    const box = $("selPanel");
    box.hidden = state.mode === "view";
    if (box.hidden) return;
    const rec = record(state.id);
    if (!rec) return;
    box.textContent = "";
    const h = document.createElement("h2");
    h.textContent = state.mode === "edit" ? "Weapon" : `Anchors — ${state.part}`;
    box.appendChild(h);

    if (state.mode === "edit") {
      box.append(
        slider("Distance (r)", () => rec.rig.weapon.distance, (v) => setDistance(v), 0.05, 1.6, 0.005),
        slider("Extra rotation°", () => rec.rig.weapon.rotation, (v) => { rec.rig.weapon.rotation = v; }, -180, 180, 0.5),
        toggleRow("Draw behind body", () => rec.rig.weapon.behind, (v) => { rec.rig.weapon.behind = v; })
      );
    } else if (state.part === "arm") {
      box.appendChild(armCountRow());
      if (!rec.rig.arms.length) {
        const p = document.createElement("p");
        p.className = "muted";
        p.textContent = rig.resolved(state.id) && rig.resolved(state.id).arm.sprites.length
          ? "No arms on this character. Pick One or Two to place them on the weapon."
          : `No ${state.id}_arm.png — nothing to place.`;
        box.appendChild(p);
      }
      const list = document.createElement("div");
      rec.rig.arms.forEach((arm, i) => {
        const b = document.createElement("button");
        b.className = "ghost";
        b.style.marginRight = "6px";
        b.textContent = `Arm ${i + 1}`;
        b.classList.toggle("primary", i === state.arm);
        b.addEventListener("click", () => { state.arm = i; rebuild(); });
        list.appendChild(b);
      });
      box.appendChild(list);
      const arm = rec.rig.arms[state.arm];
      if (arm) {
        box.append(
          num("Hold X (weapon px)", () => arm.hold.x, (v) => { arm.hold.x = v; }, { step: 1 }),
          num("Hold Y (weapon px)", () => arm.hold.y, (v) => { arm.hold.y = v; }, { step: 1 }),
          slider("Scale", () => arm.scale, (v) => { arm.scale = v; }, 0.02, 2, 0.005),
          slider("Rotation°", () => arm.rotation || 0, (v) => { arm.rotation = v; }, -180, 180, 0.5),
          layerRow(arm)
        );
      }
    } else if (state.part === "weapon") {
      box.append(
        num("Grip X", () => rec.weapon.grip.x, (v) => { rec.weapon.grip.x = v; }, { step: 1 }),
        num("Grip Y", () => rec.weapon.grip.y, (v) => { rec.weapon.grip.y = v; }, { step: 1 }),
        num("Muzzle X", () => rec.weapon.muzzle.x, (v) => { rec.weapon.muzzle.x = v; }, { step: 1 }),
        num("Muzzle Y", () => rec.weapon.muzzle.y, (v) => { rec.weapon.muzzle.y = v; }, { step: 1 })
      );
    } else {
      box.append(
        slider("Scale", () => rec.rig.bodyScale, (v) => { rec.rig.bodyScale = v; }, 0.3, 2.5, 0.005),
        num("Position X (r)", () => rec.rig.bodyOffset.x, (v) => { rec.rig.bodyOffset.x = v; }, { step: 0.01 }),
        num("Position Y (r)", () => rec.rig.bodyOffset.y, (v) => { rec.rig.bodyOffset.y = v; }, { step: 0.01 }),
        slider("Rotation°", () => rec.rig.bodyRotation, (v) => { rec.rig.bodyRotation = v; }, -180, 180, 0.5)
      );
      const h3 = document.createElement("h3");
      h3.textContent = "Detected ball";
      box.appendChild(h3);
      box.append(
        num("Pivot X (px)", () => rec.body.pivot.x, (v) => { rec.body.pivot.x = v; }, { step: 1 }),
        num("Pivot Y (px)", () => rec.body.pivot.y, (v) => { rec.body.pivot.y = v; }, { step: 1 }),
        num("Radius (px)", () => rec.body.radius, (v) => { rec.body.radius = Math.max(4, v); }, { step: 1 })
      );
    }

    const readout = document.createElement("div");
    readout.id = "selRows";
    box.appendChild(readout);

    const reset = document.createElement("button");
    reset.className = "ghost wide";
    reset.textContent = "Reset to auto";
    reset.addEventListener("click", () => {
      const before = clone(record(state.id));
      work.delete(state.id);
      rig.setCharacterRig(state.id, null);
      record(state.id);
      commit(state.id, before);
      rebuild();
    });
    box.appendChild(reset);
  }

  // Inputs commit one undo step per interaction: `input` updates live, the
  // snapshot is taken on the first change and pushed when focus leaves.
  function liveField(input, get, set) {
    let before = null;
    const begin = () => { if (before === null) before = clone(record(state.id)); };
    input.addEventListener("input", () => {
      const v = Number(input.value);
      if (!isFinite(v)) return;
      begin();
      set(v);
      touch(state.id);
      const out = input.parentElement.querySelector("output");
      if (out) out.textContent = round(v, 3);
    });
    const settle = () => {
      if (before === null) return;
      commit(state.id, before);
      before = null;
    };
    input.addEventListener("change", settle);
    input.addEventListener("blur", settle);
    input.dataset.bound = "1";
    input._get = get;
  }

  function num(label, get, set, opts = {}) {
    const row = document.createElement("label");
    row.className = "row";
    row.append(label);
    const input = document.createElement("input");
    input.type = "number";
    input.step = opts.step ?? 1;
    input.value = round(get(), 3);
    // Moving the body art right means moving its pivot left inside the image.
    liveField(input, get, opts.invert ? (v) => set(v) : set);
    row.appendChild(input);
    return row;
  }

  function slider(label, get, set, min, max, step) {
    const row = document.createElement("label");
    row.className = "row";
    row.append(label);
    const input = document.createElement("input");
    input.type = "range";
    input.min = min; input.max = max; input.step = step;
    input.value = get();
    const out = document.createElement("output");
    out.textContent = round(get(), 3);
    liveField(input, get, set);
    row.append(input, out);
    return row;
  }

  function toggleRow(label, get, set) {
    const row = document.createElement("label");
    row.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!get();
    input.addEventListener("change", () => edit(state.id, () => set(input.checked)));
    row.append(input, label);
    return row;
  }

  function layerRow(arm) {
    const row = document.createElement("label");
    row.className = "row";
    row.append("Layer");
    const sel = document.createElement("select");
    for (const [v, label] of [["back", "behind body"], ["mid", "behind weapon"], ["front", "in front"]]) {
      const o = document.createElement("option");
      o.value = v; o.textContent = label;
      sel.appendChild(o);
    }
    sel.value = arm.z;
    sel.addEventListener("change", () => edit(state.id, () => { arm.z = sel.value; }));
    row.appendChild(sel);
    return row;
  }

  // Keeps the panel in step with the handles, and shows what the numbers come
  // out as in body radii — the units the geometry is actually specified in.
  function syncSelPanel() {
    if (state.mode === "view") return;
    const rec = record(state.id);
    if (!rec) return;
    for (const input of $("selPanel").querySelectorAll("input[data-bound]")) {
      if (document.activeElement === input) continue;
      const v = round(input._get(), 3);
      if (Number(input.value) !== v) {
        input.value = v;
        const out = input.parentElement.querySelector("output");
        if (out) out.textContent = v;
      }
    }
    const box = $("selRows");
    if (!box) return;
    let rows = [];
    if (state.mode === "edit") {
      const d = rec.rig.weapon.distance;
      rows = [
        ["grip at", `${round(d, 2)} r`],
        ["barrel", `${round(2.05 - d, 2)} r`],
        ["muzzle at", "2.05 r"]
      ];
    } else if (state.part === "arm") {
      const arm = rec.rig.arms[state.arm];
      const anchor = arm && rec.arm.anchors[arm.sprite];
      if (arm) rows = [["hand size", `${round(((anchor ? anchor.radius : 0) * arm.scale) / rec.body.radius, 3)} r`]];
    } else if (state.part === "weapon") {
      const dx = rec.weapon.muzzle.x - rec.weapon.grip.x;
      const dy = rec.weapon.muzzle.y - rec.weapon.grip.y;
      rows = [["aim line", `${round((Math.atan2(dy, dx) * 180) / Math.PI, 1)}° in the art`]];
    }
    box.textContent = "";
    for (const [k, v] of rows) {
      const row = document.createElement("div");
      row.className = "selRow";
      const a = document.createElement("span");
      a.textContent = k;
      const b = document.createElement("b");
      b.textContent = v;
      row.append(a, b);
      box.appendChild(row);
    }
  }

  // Shows exactly what this character would contribute to rigs.json, which is
  // nothing at all until something has been changed.
  function syncJson() {
    const rec = work.get(state.id);
    const d = rec && diffRecord(state.id, rec);
    $("jsonOut").value = d
      ? JSON.stringify({ [state.id]: d }, null, 2)
      : "// nothing overridden — everything on this character is detected from the art";
  }

  // --------------------------------------------------------------- events

  function nearBy(p, q, r = 14) { return (p.x - q.x) ** 2 + (p.y - q.y) ** 2 < r * r; }

  view.addEventListener("pointerdown", (e) => {
    view.setPointerCapture(e.pointerId);
    const pos = { x: e.offsetX, y: e.offsetY };
    const before = () => clone(record(state.id));

    if (state.mode === "edit") {
      const f = frame();
      const g = f && gripHandle(f);
      if (g && nearBy(pos, g.at)) {
        state.drag = { grip: true, before: before() };
        return;
      }
    } else if (state.mode === "anchor" && state.part === "body") {
      const g = bodyGizmo();
      if (g) {
        for (const op of ["scale", "rotate", "move"]) {
          if (nearBy(pos, g[op])) {
            const rec = record(state.id);
            state.drag = {
              body: op, start: pos, origin: g.origin,
              base: { offset: clone(rec.rig.bodyOffset), scale: rec.rig.bodyScale, rotation: rec.rig.bodyRotation },
              before: before()
            };
            return;
          }
        }
      }
    } else if (state.mode === "anchor" && state.part === "arm") {
      const g = armGizmo();
      if (g) {
        for (const op of ["scale", "rotate", "move"]) {
          if (nearBy(pos, g[op])) {
            state.drag = { arm: op, start: pos, base: { hold: clone(g.arm.hold), scale: g.arm.scale, rotation: g.arm.rotation || 0 }, origin: g.origin, before: before() };
            return;
          }
        }
      }
    } else if (state.mode === "anchor") {
      let best = null, bestD = 12 * 12;
      for (const h of anchorHandles()) {
        const d = (h.at.x - pos.x) ** 2 + (h.at.y - pos.y) ** 2;
        if (d < bestD) { bestD = d; best = h; }
      }
      if (best) {
        state.drag = { anchor: best.key, before: before() };
        return;
      }
    }
    state.drag = { pan: { x: e.offsetX - state.pan.x, y: e.offsetY - state.pan.y } };
  });

  // Dragging the grip slides it along the aim: the distance from the body
  // centre is the whole parameter.
  function dragGrip(pos, f) {
    const p = toRigSpace(f, pos);
    setDistance(Math.hypot(p.x, p.y) / state.r);
    touch(state.id);
  }

  // Body tab: move / size / turn the body art against the collision circle.
  function dragBody(pos) {
    const rec = record(state.id);
    if (!rec) return;
    const d = state.drag;
    if (d.body === "move") {
      rec.rig.bodyOffset = {
        x: d.base.offset.x + (pos.x - d.start.x) / (state.r * state.zoom),
        y: d.base.offset.y + (pos.y - d.start.y) / (state.r * state.zoom)
      };
    } else if (d.body === "scale") {
      const d0 = Math.max(8, Math.hypot(d.start.x - d.origin.x, d.start.y - d.origin.y));
      const d1 = Math.hypot(pos.x - d.origin.x, pos.y - d.origin.y);
      rec.rig.bodyScale = clamp(d.base.scale * (d1 / d0), 0.2, 4);
    } else {
      const a0 = Math.atan2(d.start.y - d.origin.y, d.start.x - d.origin.x);
      const a1 = Math.atan2(pos.y - d.origin.y, pos.x - d.origin.x);
      rec.rig.bodyRotation = ((d.base.rotation + deg(a1 - a0) + 540) % 360) - 180;
    }
    touch(state.id);
  }

  function dragArm(pos) {
    const rec = record(state.id);
    const img = anchorImage();
    const arm = rec && rec.rig.arms[state.arm];
    if (!arm || !img) return;
    const d = state.drag;
    if (d.arm === "move") {
      arm.hold = screenToImg(img, pos);
    } else if (d.arm === "scale") {
      const d0 = Math.max(8, Math.hypot(d.start.x - d.origin.x, d.start.y - d.origin.y));
      const d1 = Math.hypot(pos.x - d.origin.x, pos.y - d.origin.y);
      arm.scale = clamp(d.base.scale * (d1 / d0), 0.02, 3);
    } else {
      const a0 = Math.atan2(d.start.y - d.origin.y, d.start.x - d.origin.x);
      const a1 = Math.atan2(pos.y - d.origin.y, pos.x - d.origin.x);
      arm.rotation = ((d.base.rotation + deg(a1 - a0) + 540) % 360) - 180;
    }
    touch(state.id);
  }

  view.addEventListener("pointermove", (e) => {
    if (!state.drag) return;
    const pos = { x: e.offsetX, y: e.offsetY };
    if (state.drag.pan) {
      state.pan = { x: pos.x - state.drag.pan.x, y: pos.y - state.drag.pan.y };
    } else if (state.drag.anchor) {
      applyAnchorDrag(state.drag.anchor, pos);
    } else if (state.drag.body) {
      dragBody(pos);
    } else if (state.drag.arm) {
      dragArm(pos);
    } else if (state.drag.grip) {
      const f = frame();
      if (f) dragGrip(pos, f);
    }
  });

  const endDrag = () => {
    if (state.drag && state.drag.before) commit(state.id, state.drag.before);
    state.drag = null;
  };
  view.addEventListener("pointerup", endDrag);
  view.addEventListener("pointercancel", endDrag);

  view.addEventListener("wheel", (e) => {
    e.preventDefault();
    setZoom(state.zoom * (1 - Math.sign(e.deltaY) * 0.1));
  }, { passive: false });

  function setZoom(z) {
    state.zoom = clamp(z, 0.2, 8);
    $("zoom").value = clamp(state.zoom, 0.4, 6);
    $("zoomOut").textContent = round(state.zoom, 2);
  }

  function fitAnchorZoom() {
    // The body tab works at preview scale (it is the composed body against the
    // collision circle), the others at image scale.
    if (state.part === "body") { setZoom(2); return; }
    const img = anchorImage();
    if (!img) return;
    setZoom(Math.min((view.clientWidth - 60) / img.width, (view.clientHeight - 60) / img.height));
  }

  window.addEventListener("keydown", (e) => {
    const typing = document.activeElement && document.activeElement.tagName === "INPUT";
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if (typing) return;
    if (e.code === "Space") {
      e.preventDefault();
      fire();
      return;
    }
    // Arrows walk the roster grid (3 across), the way the eye expects when the
    // grid is right there. Nudging a piece is the d-pad on a gamepad.
    const move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[e.key];
    if (move === undefined) return;
    e.preventDefault();
    cycleCharacter(move);
  });

  // Gamepad d-pad and triggers, acting on whatever the mode is editing.
  function nudge(dx, dy) {
    const rec = record(state.id);
    if (!rec) return;
    if (state.mode === "edit") {
      setDistance(rec.rig.weapon.distance + dx * 0.01);
    } else if (state.mode === "anchor" && state.part === "arm") {
      const arm = rec.rig.arms[state.arm];
      if (arm) arm.hold = { x: arm.hold.x + dx / state.zoom, y: arm.hold.y + dy / state.zoom };
    } else if (state.mode === "anchor" && state.part === "body") {
      rec.rig.bodyOffset = {
        x: rec.rig.bodyOffset.x + dx / (state.r * state.zoom),
        y: rec.rig.bodyOffset.y + dy / (state.r * state.zoom)
      };
    }
    touch(state.id);
  }

  function scaleBy(factor) {
    const rec = record(state.id);
    if (!rec) return;
    if (state.mode === "anchor" && state.part === "arm") {
      const arm = rec.rig.arms[state.arm];
      if (arm) arm.scale = clamp(arm.scale * factor, 0.02, 3);
      touch(state.id);
    } else if (state.mode === "anchor" && state.part === "body") {
      rec.rig.bodyScale = clamp(rec.rig.bodyScale * factor, 0.2, 4);
      touch(state.id);
    }
  }

  function setGizmoHint() {
    $("gizmoHint").textContent = state.mode === "edit"
      ? "drag the grip along the aim — arrow keys change character"
      : "drag: pink = move · green = size · yellow = turn — arrow keys change character";
  }

  // ---------------------------------------------------------------- modes

  function setMode(mode) {
    state.mode = mode;
    state.drag = null;
    $("editBtn").classList.toggle("on", mode === "edit");
    $("anchorBtn").classList.toggle("on", mode === "anchor");
    $("partTabs").hidden = mode !== "anchor";
    $("gizmoHint").hidden = mode === "view";
    $("refWrap").hidden = mode !== "edit";
    $("selPanel").hidden = mode === "view";
    state.pan = { x: 0, y: 0 };
    if (mode === "anchor") fitAnchorZoom(); else setZoom(2);
    if (mode === "anchor" && state.part === "body") setZoom(2);
    rebuild();
    syncHead();
    setGizmoHint();
    writeUrl();
  }

  $("editBtn").addEventListener("click", () => setMode(state.mode === "edit" ? "view" : "edit"));
  $("anchorBtn").addEventListener("click", () => setMode(state.mode === "anchor" ? "view" : "anchor"));

  for (const tab of document.querySelectorAll("#partTabs .tab")) {
    tab.addEventListener("click", () => {
      state.part = tab.dataset.part;
      for (const t of document.querySelectorAll("#partTabs .tab")) t.classList.toggle("on", t === tab);
      state.pan = { x: 0, y: 0 };
      fitAnchorZoom();
      rebuild();
      syncHead();
      writeUrl();
    });
  }

  const bindRange = (id, key, fmt = (v) => v) => {
    const el = $(id);
    const out = $(`${id}Out`);
    const apply = () => {
      state[key] = Number(el.value);
      if (out) out.textContent = fmt(Number(el.value));
    };
    el.addEventListener("input", apply);
    apply();
  };
  bindRange("zoom", "zoom", (v) => round(v, 2));
  bindRange("radius", "r");
  bindRange("aim", "aim", (v) => `${v}°`);

  const bindCheck = (id, key) => {
    $(id).addEventListener("change", (e) => { state[key] = e.target.checked; });
    $(id).checked = state[key];
  };
  bindCheck("spin", "spin");
  bindCheck("faceLeft", "faceLeft");
  bindCheck("showRefs", "showRefs");
  bindCheck("showShots", "showShots");
  bindCheck("onion", "onion");

  $("resetChar").addEventListener("click", () => {
    const before = clone(record(state.id));
    work.delete(state.id);
    rig.setCharacterRig(state.id, null);
    record(state.id);
    commit(state.id, before);
    rebuild();
    syncHead();
  });

  $("undoBtn").addEventListener("click", undo);
  $("redoBtn").addEventListener("click", redo);

  $("exportJson").addEventListener("click", () => {
    download("rigs.json", JSON.stringify(exportData(), null, 2), "application/json");
  });

  $("copyJson").addEventListener("click", () => navigator.clipboard?.writeText($("jsonOut").value));

  $("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const data = JSON.parse(text);
        rig.setRigs(data);
        // the same file carries the effect trim, so an import restores both
        if (data.effects && window.ROUNDERS.fx) {
          for (const [name, t] of Object.entries(data.effects)) window.ROUNDERS.fx.setTune(name, t);
        }
        work.clear();
        dirty.clear();
        record(state.id);
        if (state.section === "characters") { rebuild(); syncHead(); }
      } catch (err) {
        alert(`Could not read that JSON: ${err.message}`);
      }
    });
    e.target.value = "";
  });

  // -------------------------------------------------------------- gamepad

  // The stick aims exactly the way it does in game, so a pose can be checked
  // through its whole arc instead of one angle at a time.
  const padState = { buttons: [], axes: [], squeeze: null };

  function pollGamepad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = [...pads].find((p) => p && p.connected);
    const label = $("pad");
    if (!pad) {
      if (state.padName) { state.padName = null; label.textContent = "no gamepad"; label.classList.remove("live"); }
      return;
    }
    if (state.padName !== pad.id) {
      state.padName = pad.id;
      label.textContent = pad.id.length > 28 ? `${pad.id.slice(0, 28)}…` : pad.id;
      label.classList.add("live");
    }

    // Right stick aims, left stick turns the body — the same split the game
    // uses, so a character can walk left while shooting right. Preview only:
    // edit and anchor modes hold the default pose.
    const ax = (i) => (pad.axes.length > i ? pad.axes[i] : 0);
    if (state.mode === "view") {
      const rx = ax(2), ry = ax(3);
      if (Math.hypot(rx, ry) >= 0.25) {
        state.aim = round(deg(Math.atan2(ry, rx)), 1);
        $("aim").value = Math.round(state.aim);
        $("aimOut").textContent = `${Math.round(state.aim)}°`;
        state.spin = false;
        $("spin").checked = false;
      }
      const lx = ax(0);
      if (Math.abs(lx) >= 0.3) {
        state.faceLeft = lx < 0;
        $("faceLeft").checked = state.faceLeft;
      }
    }

    const pressed = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
    const edge = (i) => {
      const now = pressed(i);
      const was = padState.buttons[i];
      padState.buttons[i] = now;
      return now && !was;
    };
    if (edge(4)) cycleCharacter(-1);
    if (edge(5)) cycleCharacter(1);
    if (edge(0)) setMode(state.mode === "edit" ? "view" : "edit");
    if (edge(1) && state.mode !== "view") setMode("view");
    // Preview: the triggers shoot, the way the player's do, so the muzzle can
    // be checked through the whole aim arc.
    if (state.mode !== "edit" && (pressed(7) || pressed(6))) holdFire(dt);

    if (state.mode === "edit") {
      if (edge(12)) edit(state.id, () => nudge(0, -1));
      if (edge(13)) edit(state.id, () => nudge(0, 1));
      if (edge(14)) edit(state.id, () => nudge(-1, 0));
      if (edge(15)) edit(state.id, () => nudge(1, 0));
      if (edge(3)) cyclePiece(1);
      // Triggers scale continuously; the whole squeeze is one undo step.
      const squeezing = pressed(6) || pressed(7);
      if (squeezing && !padState.squeeze) padState.squeeze = clone(record(state.id));
      if (pressed(6)) { scaleBy(1 - dt * 0.6); touch(state.id); }
      if (pressed(7)) { scaleBy(1 + dt * 0.6); touch(state.id); }
      if (!squeezing && padState.squeeze) {
        commit(state.id, padState.squeeze);
        padState.squeeze = null;
      }
    }
  }

  function cycleCharacter(dir) {
    const i = CHARACTERS.findIndex((c) => c.id === state.id);
    const next = CHARACTERS[(i + dir + CHARACTERS.length) % CHARACTERS.length];
    select(next.id);
    document.querySelector(`.tile[data-id="${next.id}"]`)?.scrollIntoView({ block: "nearest" });
  }
  // In the arm tab, Y walks between the arms.
  function cyclePiece(dir) {
    const rec = record(state.id);
    if (!rec || !rec.rig.arms.length) return;
    state.arm = (state.arm + dir + rec.rig.arms.length) % rec.rig.arms.length;
    rebuild();
    writeUrl();
  }

  // ----------------------------------------------------------------- loop

  readUrl();
  buildRoster();
  select(state.id);
  setMode(state.mode);


  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.section === "effects") {
      drawFxSprite(dt);
      requestAnimationFrame(loop);
      return;
    }
    pollGamepad(dt);
    stepShots(dt);
    if (state.spin) {
      state.aim = ((state.aim + dt * 60 + 180) % 360) - 180;
      $("aim").value = state.aim;
      $("aimOut").textContent = `${Math.round(state.aim)}°`;
    }
    render();
    syncSelPanel();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // The rig file lands after the first records are built, so drop the ones the
  // user has not touched and take them again from the merged anchors —
  // otherwise the panel (and an export) would quietly carry auto values that
  // rigs.json had already overridden.
  rig.ready().then(() => {
    for (const id of [...work.keys()]) if (!dirty.has(id)) work.delete(id);
    record(state.id);
    if (state.section === "characters") { rebuild(); syncHead(); }
  });

  // Assets stream in one character at a time; keep refreshing until every
  // character has settled, then stop. (Panels rebuild on every state change of
  // their own accord — this only catches art that arrives late.)
  const poll = setInterval(() => {
    if (state.section === "effects") return;
    refreshTiles();
    syncHead();
    const stamp = `${state.id}|${state.mode}|${state.part}|${state.arm}|${armCount()}`;
    if (state.built !== stamp && record(state.id)) rebuild();
    if (CHARACTERS.every((c) => rig.assets(c.id).state !== "loading")) clearInterval(poll);
  }, 250);

  // ================================================================ effects
  // The same three panes, pointed at the painted effect sheets instead of the
  // characters. Top of the stage is the sheet itself; under it the card that
  // uses the effect plays in the card-workbench preview, so a trim is judged
  // against the thing in motion and not just the file. Both read the same
  // table the game reads (js/fx-art.js), so what is dialled here is what a
  // match looks like.
  const FX = window.ROUNDERS.fx;
  const CARD_SIM = window.ROUNDERS.CARD_SIM;

  // which card puts each sheet on screen
  const FX_CARD = {
    "black-hole": "event-horizon",
    "explosion": "cluster-bomb",
    "explosion-big": "supernova",
    "shockwave-ring": "bodyguard",
    "lightning-arc": "storm-caller",
    "storm-nova": "crown-of-storms",
    "shield-bubble": "aegis-bubble",
    "shield-break": "aegis-bubble",
    "stun-stars": "camera-flash",
    "muzzle-flash": "hair-trigger",
    "chill-aura": "permafrost",
    "frost-burst": "permafrost",
    "poison-cloud": "stink-bomb",
    "sawblade": "sawblade",
    "angel": "guardian-halo",
    "lemonade": "lemonade-stand"
  };

  const fxState = { name: null, sim: null, t: 0 };
  const FX_DEFAULT = { scale: 1, rotation: 0 };
  const fxDirty = new Set();

  function fxNames() { return FX ? FX.names() : []; }

  function buildFxRoster() {
    const grid = $("grid");
    grid.textContent = "";
    for (const name of fxNames()) {
      const tile = document.createElement("div");
      tile.className = "tile fx";
      tile.dataset.fx = name;
      tile.title = FX_CARD[name] ? `${name} — used by ${FX_CARD[name]}` : `${name} — not drawn by anything today`;
      const cv = document.createElement("canvas");
      cv.width = 128; cv.height = 128;
      const nm = document.createElement("div");
      nm.className = "nm";
      nm.textContent = name;
      tile.append(cv, nm);
      tile.addEventListener("click", () => selectFx(name));
      grid.appendChild(tile);
    }
    refreshFxTiles();
  }

  function refreshFxTiles() {
    let have = 0;
    const names = fxNames();
    for (const tile of document.querySelectorAll(".tile.fx")) {
      const name = tile.dataset.fx;
      const img = FX && FX.image(name);
      if (img) have += 1;
      tile.classList.toggle("on", name === fxState.name);
      tile.classList.toggle("missing", !img);
      let dot = tile.querySelector(".dirty");
      if (fxDirty.has(name) && !dot) {
        dot = document.createElement("span");
        dot.className = "dirty";
        tile.appendChild(dot);
      } else if (!fxDirty.has(name) && dot) dot.remove();
      const cv = tile.querySelector("canvas");
      const c = cv.getContext("2d");
      c.clearRect(0, 0, cv.width, cv.height);
      if (img) {
        const n = FX.frames(name);
        const fw = img.width / n;
        const k = Math.min(cv.width / fw, cv.height / img.height);
        const w = fw * k, h = img.height * k;
        c.drawImage(img, 0, 0, fw, img.height, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
      }
    }
    $("rosterCount").textContent = `${have}/${names.length} on disk`;
  }

  function selectFx(name) {
    if (!name || !fxNames().includes(name)) return;
    fxState.name = name;
    if (fxState.sim) { fxState.sim.stop(); fxState.sim = null; }
    const cardId = FX_CARD[name];
    const card = cardId && window.ROUNDERS.CARDS.find((c) => c.id === cardId);
    if (card && CARD_SIM) {
      fxState.sim = CARD_SIM.createSim($("fxPreview"), card);
      fxState.sim.start();
    }
    $("charName").textContent = name;
    $("charInfo").textContent = cardId ? `drawn by ${cardId}` : "not drawn by anything today";
    $("fxPreviewInfo").textContent = cardId ? `${cardId} — the preview the card workbench runs` : "no card uses this sheet";
    syncFxPanel();
    refreshFxTiles();
    writeUrl();
  }

  function syncFxPanel() {
    const name = fxState.name;
    if (!name || !FX) return;
    const t = FX.tune(name);
    $("fxScale").value = t.scale ?? 1;
    $("fxScaleOut").textContent = `${(t.scale ?? 1).toFixed(2)}x`;
    $("fxRot").value = t.rotation || 0;
    $("fxRotOut").textContent = `${Math.round(t.rotation || 0)}°`;
    const img = FX.image(name);
    const n = FX.frames(name);
    const cut = n > 1 && FX.boxes(name);
    // For a strip, say whether the frames were found in the art or fell back
    // to even cells — an off-grid sheet is the usual cause of a jumpy effect.
    const cutNote = cut
      ? ` · frames cut at ${cut.map((b) => Math.round(b.centre)).join(", ")}`
      : "";
    $("fxSpriteInfo").textContent = img
      ? `${img.width}x${img.height}${n > 1 ? ` · ${n} frames${cutNote}` : ""}`
      : "missing — assets/images/fx/" + name + ".png";
    $("fxNote").textContent = FX_CARD[name]
      ? "Size and rotation ride on top of whatever the engine asks for, and are exported in rigs.json."
      : "Nothing draws this sheet today; the engine kept its own version. Trim is still exported.";
  }

  // The sheet on its own: framed, at the trim, cycling if it is a strip.
  function drawFxSprite(dt) {
    const cv = $("fxSprite");
    const c = cv.getContext("2d");
    c.clearRect(0, 0, cv.width, cv.height);
    const name = fxState.name;
    if (!name || !FX) return;
    fxState.t += dt;
    const img = FX.image(name);
    if (!img) {
      c.fillStyle = "#8f9ab4";
      c.font = "600 13px system-ui";
      c.textAlign = "center";
      c.fillText(`assets/images/fx/${name}.png is not on disk`, cv.width / 2, cv.height / 2);
      return;
    }
    const n = FX.frames(name);
    const fw = img.width / n;
    // the sheet is drawn at the same size the roster tile would, times the
    // trim, so the slider reads as "bigger / smaller than the engine asked"
    const fit = Math.min(cv.width * 0.7 / fw, cv.height * 0.8 / img.height);
    const size = fw * fit;
    FX.draw(c, name, cv.width / 2, cv.height / 2, size, n > 1 ? (fxState.t * 0.8) % 1 : 0);
    // a faint outline of the untrimmed footprint, so a scale change is legible
    const base = FX.tune(name).scale || 1;
    if (Math.abs(base - 1) > 0.001) {
      const w = size, h = w * (img.height / fw);
      c.strokeStyle = "rgba(255,255,255,0.22)";
      c.setLineDash([5, 5]);
      c.strokeRect(cv.width / 2 - w / 2, cv.height / 2 - h / 2, w, h);
      c.setLineDash([]);
    }
  }

  function setSection(section) {
    state.section = section === "effects" ? "effects" : "characters";
    const fx = state.section === "effects";
    $("fxStage").hidden = !fx;
    $("fxPanel").hidden = !fx;
    document.querySelector(".canvasWrap").hidden = fx;
    $("hint").hidden = fx;
    // character-only chrome
    for (const id of ["editBtn", "anchorBtn", "refWrap", "resetChar", "undoBtn", "redoBtn"]) {
      const el = $(id);
      if (el) el.hidden = fx;
    }
    $("partTabs").hidden = fx || state.mode !== "anchor";
    $("charLegend").hidden = fx;
    $("fxLegend").hidden = !fx;
    const jsonPanel = $("jsonOut") && $("jsonOut").closest(".panel");
    if (jsonPanel) jsonPanel.hidden = fx;
    document.querySelectorAll(".inspector .panel")[0].hidden = fx;
    if (fx) {
      buildFxRoster();
      selectFx(fxState.name || fxNames()[0]);
    } else {
      if (fxState.sim) { fxState.sim.stop(); fxState.sim = null; }
      buildRoster();
      refreshTiles();
      syncHead();
      rebuild();
    }
    $("rosterMode").value = state.section;
    writeUrl();
  }

  $("rosterMode").addEventListener("change", (e) => setSection(e.target.value));
  liveFxField($("fxScale"), (v) => ({ scale: v }), (v) => `${v.toFixed(2)}x`);
  liveFxField($("fxRot"), (v) => ({ rotation: v }), (v) => `${Math.round(v)}°`);
  $("fxReset").addEventListener("click", () => {
    if (!fxState.name) return;
    FX.setTune(fxState.name, { ...FX_DEFAULT });
    fxDirty.delete(fxState.name);
    syncFxPanel();
    refreshFxTiles();
  });

  function liveFxField(input, patch, fmt) {
    if (!input) return;
    const out = $(input.id + "Out");
    input.addEventListener("input", () => {
      if (!fxState.name) return;
      const v = Number(input.value);
      FX.setTune(fxState.name, patch(v));
      fxDirty.add(fxState.name);
      if (out) out.textContent = fmt(v);
      refreshFxTiles();
    });
  }

  // Only the sheets that have actually been moved off their defaults.
  function fxExport() {
    const out = {};
    for (const name of fxNames()) {
      const t = FX.tune(name);
      const e = {};
      if (Math.abs((t.scale ?? 1) - 1) > 0.001) e.scale = Number((t.scale).toFixed(3));
      if (Math.round(t.rotation || 0) !== 0) e.rotation = Math.round(t.rotation);
      if (Object.keys(e).length) out[name] = e;
    }
    return out;
  }

  if (FX) FX.warm();
  if (bootQ.get("section") === "effects") {
    const want = bootQ.get("fx");
    if (want && fxNames().includes(want)) fxState.name = want;
    setSection("effects");
  } else {
    setSection("characters");
  }
  setInterval(() => { if (state.section === "effects") { refreshFxTiles(); syncFxPanel(); } }, 400);

})();

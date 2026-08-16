// Rounders — sprite workbench.
//
// Left: the character roster. Right: an interactive viewer over the same rig
// code the game uses (js/rig.js), so what you see here is what ships.
//
// Three modes, kept in the URL (?c=vex&mode=edit) so a reload lands you back
// where you were:
//
//   view    a clean preview — no handles, no reference overlay. Sweep the aim,
//           or grab a gamepad and aim with the stick the way a player would.
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
  const view = $("view");
  const ctx = view.getContext("2d");

  const state = {
    id: CHARACTERS[0].id,
    mode: "view",          // view | edit | anchor
    part: "body",          // anchor mode: which source image
    sel: "weapon",         // edit mode: which piece — body | weapon | hand:N
    zoom: 2,
    pan: { x: 0, y: 0 },
    r: 52,
    aim: 0,
    spin: false,
    faceLeft: false,
    showRefs: true,
    onion: false,
    drag: null,
    built: null,
    padName: null
  };

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
        weapon: {
          scale: R.rig.weapon.scale,
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
    else { buildParts(); buildSelPanel(); }
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

  function exportData() {
    const characters = {};
    for (const ch of CHARACTERS) {
      if (!rig.hasRig(ch.id)) continue;
      const rec = record(ch.id);
      if (rec) characters[ch.id] = tidy(rec);
    }
    return { version: 1, note: "Authored in /workbench. Values are source-image pixels unless noted.", characters };
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
    const s = q.get("sel");
    if (s) state.sel = s;
  }

  function writeUrl() {
    const q = new URLSearchParams();
    q.set("c", state.id);
    q.set("mode", state.mode);
    if (state.mode === "anchor") q.set("part", state.part);
    if (state.mode === "edit") q.set("sel", state.sel);
    history.replaceState(null, "", `${location.pathname}?${q}`);
  }

  // ------------------------------------------------------------ geometry

  // Edit mode always poses the character at the default aim — facing right,
  // level — so the handles and the references mean the same thing every time.
  function aimVec() {
    if (state.mode === "edit") return { x: 1, y: 0 };
    const a = rad(state.aim);
    return { x: Math.cos(a) * (state.faceLeft ? -1 : 1), y: Math.sin(a) };
  }

  function frame() {
    const A = aimVec();
    const T = rig.transform(state.id, state.r, A.x, A.y, 0);
    if (!T) return null;
    return { T, cx: view.clientWidth / 2 + state.pan.x, cy: view.clientHeight / 2 + state.pan.y, z: state.zoom, A };
  }

  // mirrored rig space <-> screen
  const toScreen = (f, p) => ({ x: f.cx + p.x * f.T.facing * f.z, y: f.cy + p.y * f.z });
  const toRigSpace = (f, p) => ({ x: ((p.x - f.cx) / f.z) * f.T.facing, y: (p.y - f.cy) / f.z });

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
  function anchorImage() {
    const a = rig.assets(state.id);
    return state.part === "body" ? a.body : state.part === "weapon" ? a.weapon : a.arm;
  }
  const imgToScreen = (img, p) => ({
    x: view.clientWidth / 2 + state.pan.x + (p.x - img.width / 2) * state.zoom,
    y: view.clientHeight / 2 + state.pan.y + (p.y - img.height / 2) * state.zoom
  });
  const screenToImg = (img, p) => ({
    x: (p.x - view.clientWidth / 2 - state.pan.x) / state.zoom + img.width / 2,
    y: (p.y - view.clientHeight / 2 - state.pan.y) / state.zoom + img.height / 2
  });

  // ------------------------------------------------------- edit-mode pieces

  // Every editable piece exposes the same three operations, so one gizmo drives
  // all of them: where it sits, how big it is, and how it is turned.
  function pieces() {
    const rec = record(state.id);
    if (!rec) return [];
    const list = [
      { key: "body", label: "Body" },
      { key: "weapon", label: "Weapon" }
    ];
    rec.rig.arms.forEach((_, i) => list.push({ key: `hand:${i}`, label: `Hand ${i + 1}` }));
    return list;
  }

  // The selected piece's gizmo frame, in mirrored rig space.
  function pieceFrame(f, key) {
    const rec = record(state.id);
    if (!rec) return null;
    if (key === "body") {
      return { origin: { x: 0, y: 0 }, angle: rad(rec.rig.bodyRotation), size: state.r, scale: rec.rig.bodyScale };
    }
    if (key === "weapon") {
      const len = Math.hypot(rec.weapon.muzzle.x - rec.weapon.grip.x, rec.weapon.muzzle.y - rec.weapon.grip.y);
      return { origin: f.T.mount, angle: f.T.angle, size: Math.max(24, len * f.T.kw), scale: rec.rig.weapon.scale };
    }
    const i = Number(key.slice(5));
    const arm = rec.rig.arms[i];
    if (!arm) return null;
    const anchor = rec.arm.anchors[arm.sprite];
    const radius = (anchor ? anchor.radius : 20) * f.T.k * arm.scale;
    return {
      origin: weaponToRig(f, arm.hold.x, arm.hold.y),
      angle: f.T.angle + rad(arm.rotation || 0),
      size: Math.max(16, radius),
      scale: arm.scale
    };
  }

  // Handles are placed in screen space around the piece frame.
  function gizmo(f) {
    if (state.mode !== "edit") return null;
    const pf = pieceFrame(f, state.sel);
    if (!pf) return null;
    const o = toScreen(f, pf.origin);
    const a = pf.angle * f.T.facing;   // screen-space angle
    const d = Math.max(46, pf.size * f.z + 26);
    return {
      pf,
      origin: o,
      move: o,
      scale: { x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d },
      rotate: { x: o.x + Math.cos(a + Math.PI / 2) * d * 0.78, y: o.y + Math.sin(a + Math.PI / 2) * d * 0.78 },
      angle: a, dist: d
    };
  }

  function applyPiece(key, op, drag, pos, f) {
    const rec = record(state.id);
    if (!rec) return;
    const g = drag.gizmo;
    if (op === "move") {
      const from = toRigSpace(f, { x: drag.start.x, y: drag.start.y });
      const to = toRigSpace(f, pos);
      const dx = to.x - from.x, dy = to.y - from.y;
      if (key === "body") {
        // Moving the body art moves it under the physics center, which is the
        // pivot inside the body image.
        rec.body.pivot = { x: drag.base.pivot.x - dx / f.T.k, y: drag.base.pivot.y - dy / f.T.k };
      } else if (key === "weapon") {
        // Offsets are stored relative to the aim while the grip orbits, so a
        // placement made at one aim angle holds at all of them.
        const aimAngle = Math.atan2(f.A.y, f.A.x * f.T.facing);
        const c = Math.cos(-aimAngle), s = Math.sin(-aimAngle);
        const lx = rec.rig.weapon.orbit ? dx * c - dy * s : dx;
        const ly = rec.rig.weapon.orbit ? dx * s + dy * c : dy;
        rec.rig.weapon.offset = {
          x: drag.base.offset.x + lx / state.r,
          y: drag.base.offset.y + ly / state.r
        };
      } else {
        const i = Number(key.slice(5));
        rec.rig.arms[i].hold = rigToWeapon(f, toRigSpace(f, pos));
      }
    } else if (op === "scale") {
      const d0 = Math.max(8, Math.hypot(drag.start.x - g.origin.x, drag.start.y - g.origin.y));
      const d1 = Math.hypot(pos.x - g.origin.x, pos.y - g.origin.y);
      const factor = clamp(d1 / d0, 0.1, 8);
      if (key === "body") rec.rig.bodyScale = clamp(drag.base.scale * factor, 0.2, 4);
      else if (key === "weapon") rec.rig.weapon.scale = clamp(drag.base.scale * factor, 0.05, 6);
      else rec.rig.arms[Number(key.slice(5))].scale = clamp(drag.base.scale * factor, 0.02, 4);
    } else if (op === "rotate") {
      const a0 = Math.atan2(drag.start.y - g.origin.y, drag.start.x - g.origin.x);
      const a1 = Math.atan2(pos.y - g.origin.y, pos.x - g.origin.x);
      const d = deg(a1 - a0) * f.T.facing;
      const wrap = (v) => ((v + 540) % 360) - 180;
      if (key === "body") rec.rig.bodyRotation = wrap(drag.base.rotation + d);
      else if (key === "weapon") rec.rig.weapon.rotation = wrap(drag.base.rotation + d);
      else rec.rig.arms[Number(key.slice(5))].rotation = wrap(drag.base.rotation + d);
    }
    touch(state.id);
  }

  function pieceBase(key) {
    const rec = record(state.id);
    if (key === "body") return { pivot: clone(rec.body.pivot), scale: rec.rig.bodyScale, rotation: rec.rig.bodyRotation };
    if (key === "weapon") return { offset: clone(rec.rig.weapon.offset), scale: rec.rig.weapon.scale, rotation: rec.rig.weapon.rotation };
    const arm = rec.rig.arms[Number(key.slice(5))];
    return { hold: clone(arm.hold), scale: arm.scale, rotation: arm.rotation || 0 };
  }

  // --------------------------------------------------------- anchor handles

  function anchorHandles() {
    const rec = record(state.id);
    const img = anchorImage();
    if (!rec || !img) return [];
    const out = [];
    if (state.part === "body") {
      out.push({ key: "body.pivot", label: "pivot", at: imgToScreen(img, rec.body.pivot), color: "#ff4d8f" });
      out.push({ key: "body.mount", label: "mount", at: imgToScreen(img, rec.body.mount), color: "#ffd24d" });
      out.push({ key: "body.radius", label: "radius", at: imgToScreen(img, { x: rec.body.pivot.x + rec.body.radius, y: rec.body.pivot.y }), color: "#6ee787" });
    } else if (state.part === "weapon") {
      out.push({ key: "weapon.grip", label: "grip", at: imgToScreen(img, rec.weapon.grip), color: "#ff4d8f" });
      out.push({ key: "weapon.muzzle", label: "muzzle", at: imgToScreen(img, rec.weapon.muzzle), color: "#29d7ff" });
    } else {
      rec.arm.anchors.forEach((a, i) => {
        out.push({ key: `armS.${i}`, label: `arm ${i + 1} shoulder`, at: imgToScreen(img, a.shoulder), color: "#b98cff" });
        out.push({ key: `armH.${i}`, label: `arm ${i + 1} hand`, at: imgToScreen(img, a.hand), color: "#29d7ff" });
      });
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
    else if (key.startsWith("armS.")) rec.arm.anchors[Number(key.slice(5))].shoulder = { x: p.x, y: p.y };
    else if (key.startsWith("armH.")) rec.arm.anchors[Number(key.slice(5))].hand = { x: p.x, y: p.y };
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
      renderAnchor();
      renderHandles(anchorHandles());
      return;
    }
    renderCharacter(ch);
    if (state.mode === "edit") renderGizmo();
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
    drawCharacter(ctx, ch, state.r, { t: 0, aimX: A.x, aimY: A.y });

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
      ctx.lineTo(f.T.facing * state.r * 2.05, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,210,77,0.9)";
      for (const [at, label] of [[0.55, "grip"], [2.05, "muzzle"]]) {
        const x = f.T.facing * state.r * at;
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
      } else {
        ctx.strokeStyle = "rgba(185,140,255,0.8)";
        for (const an of rec.arm.anchors) {
          ctx.beginPath();
          ctx.moveTo(off.x + an.shoulder.x, off.y + an.shoulder.y);
          ctx.lineTo(off.x + an.hand.x, off.y + an.hand.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function renderGizmo() {
    const f = frame();
    if (!f) return;
    const g = gizmo(f);
    if (!g) return;

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(g.origin.x, g.origin.y); ctx.lineTo(g.scale.x, g.scale.y);
    ctx.moveTo(g.origin.x, g.origin.y); ctx.lineTo(g.rotate.x, g.rotate.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // outline of the piece's extent
    ctx.strokeStyle = "rgba(41,215,255,0.55)";
    ctx.beginPath();
    ctx.arc(g.origin.x, g.origin.y, g.pf.size * f.z, 0, Math.PI * 2);
    ctx.stroke();

    const dot = (p, color, shape) => {
      ctx.fillStyle = color;
      ctx.strokeStyle = "#14121c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (shape === "square") ctx.rect(p.x - 6, p.y - 6, 12, 12);
      else ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };
    dot(g.move, "#ff4d8f");
    dot(g.scale, "#6ee787", "square");
    dot(g.rotate, "#ffd24d");

    ctx.fillStyle = "#efe9ff";
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("move", g.move.x, g.move.y - 12);
    ctx.fillText("size", g.scale.x, g.scale.y - 12);
    ctx.fillText("turn", g.rotate.x, g.rotate.y - 12);
    ctx.restore();
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

  function select(id) {
    state.id = id;
    state.pan = { x: 0, y: 0 };
    record(id);
    if (!pieces().some((p) => p.key === state.sel)) state.sel = "weapon";
    buildParts();
    buildSelPanel();
    refreshTiles();
    syncHead();
    writeUrl();
  }

  function syncHead() {
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
      ? "Pick a piece above the viewer, then drag the pink dot to move it, the green square to resize, the yellow dot to turn it. Arrow keys nudge, shift-arrows go faster. Aim with a gamepad stick to check the pose through its whole arc."
      : state.mode === "anchor"
        ? "Drag the anchors on the source image: body pivot (pink) is the physics center, mount (yellow) is the grip's reach, green sets the ball radius. Weapon: grip → muzzle. Arm: shoulder → hand."
        : "Preview. Aim with a gamepad stick (or the aim slider), and press Edit mode to place the pieces.";
  }

  // ---------------------------------------------- edit-mode part selector

  function buildParts() {
    const box = $("parts");
    box.textContent = "";
    for (const p of pieces()) {
      const b = document.createElement("button");
      b.textContent = p.label;
      b.classList.toggle("on", p.key === state.sel);
      b.addEventListener("click", () => {
        state.sel = p.key;
        buildParts();
        buildSelPanel();
        writeUrl();
      });
      box.appendChild(b);
    }
  }

  function buildSelPanel() {
    const box = $("selPanel");
    box.hidden = state.mode !== "edit";
    if (box.hidden) return;
    const rec = record(state.id);
    if (!rec) return;
    box.textContent = "";
    const h = document.createElement("h2");
    h.textContent = pieces().find((p) => p.key === state.sel)?.label || "Selection";
    box.appendChild(h);

    // The same three operations the handles do, as numbers — handy for typing
    // in an exact value or reading one back off a piece.
    const fields = [];
    if (state.sel === "body") {
      fields.push(
        num("Position X (px)", () => rec.body.pivot.x, (v) => { rec.body.pivot.x = v; }, { step: 1, invert: true }),
        num("Position Y (px)", () => rec.body.pivot.y, (v) => { rec.body.pivot.y = v; }, { step: 1, invert: true }),
        slider("Scale", () => rec.rig.bodyScale, (v) => { rec.rig.bodyScale = v; }, 0.2, 3, 0.005),
        slider("Rotation°", () => rec.rig.bodyRotation, (v) => { rec.rig.bodyRotation = v; }, -180, 180, 0.5),
        num("Ball radius (px)", () => rec.body.radius, (v) => { rec.body.radius = Math.max(4, v); }, { step: 1 })
      );
    } else if (state.sel === "weapon") {
      fields.push(
        num("Offset X (r)", () => rec.rig.weapon.offset.x, (v) => { rec.rig.weapon.offset.x = v; }, { step: 0.01 }),
        num("Offset Y (r)", () => rec.rig.weapon.offset.y, (v) => { rec.rig.weapon.offset.y = v; }, { step: 0.01 }),
        slider("Scale", () => rec.rig.weapon.scale, (v) => { rec.rig.weapon.scale = v; }, 0.05, 3, 0.005),
        slider("Rotation°", () => rec.rig.weapon.rotation, (v) => { rec.rig.weapon.rotation = v; }, -180, 180, 0.5)
      );
    } else {
      const arm = rec.rig.arms[Number(state.sel.slice(5))];
      if (arm) {
        fields.push(
          num("Hold X (weapon px)", () => arm.hold.x, (v) => { arm.hold.x = v; }, { step: 1 }),
          num("Hold Y (weapon px)", () => arm.hold.y, (v) => { arm.hold.y = v; }, { step: 1 }),
          slider("Scale", () => arm.scale, (v) => { arm.scale = v; }, 0.02, 2, 0.005),
          slider("Rotation°", () => arm.rotation || 0, (v) => { arm.rotation = v; }, -180, 180, 0.5)
        );
      }
    }
    for (const f of fields) box.appendChild(f);

    if (state.sel === "weapon") {
      box.append(
        toggleRow("Grip rides the aim", () => rec.rig.weapon.orbit, (v) => { rec.rig.weapon.orbit = v; }),
        toggleRow("Draw behind body", () => rec.rig.weapon.behind, (v) => { rec.rig.weapon.behind = v; })
      );
    } else if (state.sel.startsWith("hand:")) {
      const arm = rec.rig.arms[Number(state.sel.slice(5))];
      if (arm) {
        box.append(
          toggleRow("Reach for the weapon (stretch)", () => arm.stretch, (v) => { arm.stretch = v; }),
          layerRow(arm)
        );
      }
    }

    const readout = document.createElement("div");
    readout.id = "selRows";
    box.appendChild(readout);

    const reset = document.createElement("button");
    reset.className = "ghost wide";
    reset.textContent = "Reset this piece";
    reset.addEventListener("click", () => resetPiece());
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

  // Keeps the panel in step with the handles: inputs follow a drag, and the
  // read-only rows underneath show what the numbers mean in body radii.
  function syncSelPanel() {
    if (state.mode !== "edit") return;
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
    let rows;
    if (state.sel === "body") {
      rows = [["ball vs collision", `${round((rec.body.radius * rec.rig.bodyScale) / rec.body.radius, 3)}×`]];
    } else if (state.sel === "weapon") {
      const len = Math.hypot(rec.weapon.muzzle.x - rec.weapon.grip.x, rec.weapon.muzzle.y - rec.weapon.grip.y);
      const reach = Math.hypot(rec.body.mount.x - rec.body.pivot.x, rec.body.mount.y - rec.body.pivot.y) / rec.body.radius;
      rows = [
        ["reach", `${round(reach + rec.rig.weapon.offset.x, 2)} r`],
        ["barrel", `${round((len * rec.rig.weapon.scale) / rec.body.radius, 2)} r`],
        ["muzzle", `${round(reach + rec.rig.weapon.offset.x + (len * rec.rig.weapon.scale) / rec.body.radius, 2)} r`]
      ];
    } else {
      const arm = rec.rig.arms[Number(state.sel.slice(5))];
      if (!arm) return;
      const anchor = rec.arm.anchors[arm.sprite];
      rows = [["hand size", `${round(((anchor ? anchor.radius : 0) * arm.scale) / rec.body.radius, 3)} r`]];
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

  function resetPiece() {
    const rec = record(state.id);
    // Re-derive this character from auto, then keep the other pieces as edited.
    const before = clone(rec);
    work.delete(state.id);
    rig.setCharacterRig(state.id, null);
    const fresh = record(state.id);
    if (state.sel === "body") {
      fresh.weapon = before.weapon;
      fresh.rig.weapon = before.rig.weapon;
      fresh.rig.arms = before.rig.arms;
    } else if (state.sel === "weapon") {
      fresh.body = before.body;
      fresh.rig.bodyScale = before.rig.bodyScale;
      fresh.rig.bodyRotation = before.rig.bodyRotation;
      fresh.rig.arms = before.rig.arms;
    } else {
      const i = Number(state.sel.slice(5));
      const keep = clone(fresh.rig.arms[i]);
      Object.assign(fresh, { body: before.body, weapon: before.weapon });
      fresh.rig.bodyScale = before.rig.bodyScale;
      fresh.rig.bodyRotation = before.rig.bodyRotation;
      fresh.rig.weapon = before.rig.weapon;
      fresh.rig.arms = before.rig.arms.map((a, j) => (j === i ? keep : a));
    }
    commit(state.id, before);
    buildSelPanel();
  }

  function syncJson() {
    const rec = work.get(state.id);
    $("jsonOut").value = rec ? JSON.stringify({ [state.id]: tidy(rec) }, null, 2) : "";
  }

  // --------------------------------------------------------------- events

  function hitGizmo(pos, f) {
    const g = gizmo(f);
    if (!g) return null;
    const near = (p) => (p.x - pos.x) ** 2 + (p.y - pos.y) ** 2 < 14 * 14;
    if (near(g.scale)) return { op: "scale", gizmo: g };
    if (near(g.rotate)) return { op: "rotate", gizmo: g };
    if (near(g.move)) return { op: "move", gizmo: g };
    return null;
  }

  view.addEventListener("pointerdown", (e) => {
    view.setPointerCapture(e.pointerId);
    const pos = { x: e.offsetX, y: e.offsetY };
    if (state.mode === "anchor") {
      let best = null, bestD = 12 * 12;
      for (const h of anchorHandles()) {
        const d = (h.at.x - pos.x) ** 2 + (h.at.y - pos.y) ** 2;
        if (d < bestD) { bestD = d; best = h; }
      }
      state.drag = best
        ? { anchor: best.key, before: clone(record(state.id)) }
        : { pan: { x: e.offsetX - state.pan.x, y: e.offsetY - state.pan.y } };
      return;
    }
    if (state.mode === "edit") {
      const f = frame();
      const hit = f && hitGizmo(pos, f);
      if (hit) {
        state.drag = { ...hit, start: pos, base: pieceBase(state.sel), key: state.sel, before: clone(record(state.id)) };
        return;
      }
    }
    state.drag = { pan: { x: e.offsetX - state.pan.x, y: e.offsetY - state.pan.y } };
  });

  view.addEventListener("pointermove", (e) => {
    if (!state.drag) return;
    const pos = { x: e.offsetX, y: e.offsetY };
    if (state.drag.pan) {
      state.pan = { x: pos.x - state.drag.pan.x, y: pos.y - state.drag.pan.y };
    } else if (state.drag.anchor) {
      applyAnchorDrag(state.drag.anchor, pos);
    } else if (state.drag.op) {
      const f = frame();
      if (f) applyPiece(state.drag.key, state.drag.op, state.drag, pos, f);
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
    const step = e.shiftKey ? 8 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d || state.mode !== "edit") return;
    e.preventDefault();
    edit(state.id, () => nudge(d[0], d[1]));
  });

  // Move the selected piece by a screen-space delta (arrow keys, d-pad).
  function nudge(dx, dy) {
    const f = frame();
    if (!f) return;
    const g = gizmo(f);
    if (!g) return;
    const drag = { op: "move", gizmo: g, start: g.origin, base: pieceBase(state.sel), key: state.sel };
    applyPiece(state.sel, "move", drag, { x: g.origin.x + dx, y: g.origin.y + dy }, f);
  }

  function scaleBy(factor) {
    const f = frame();
    if (!f) return;
    const g = gizmo(f);
    if (!g) return;
    const drag = { op: "scale", gizmo: g, start: { x: g.origin.x + 100, y: g.origin.y }, base: pieceBase(state.sel), key: state.sel };
    applyPiece(state.sel, "scale", drag, { x: g.origin.x + 100 * factor, y: g.origin.y }, f);
  }

  // ---------------------------------------------------------------- modes

  function setMode(mode) {
    state.mode = mode;
    state.drag = null;
    $("editBtn").classList.toggle("on", mode === "edit");
    $("anchorBtn").classList.toggle("on", mode === "anchor");
    $("partTabs").hidden = mode !== "anchor";
    $("parts").hidden = mode !== "edit";
    $("gizmoHint").hidden = mode !== "edit";
    $("refWrap").hidden = mode !== "edit";
    $("selPanel").hidden = mode !== "edit";
    state.pan = { x: 0, y: 0 };
    if (mode === "anchor") fitAnchorZoom(); else setZoom(2);
    buildParts();
    buildSelPanel();
    syncHead();
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
  bindCheck("onion", "onion");

  $("resetChar").addEventListener("click", () => {
    const before = clone(record(state.id));
    work.delete(state.id);
    rig.setCharacterRig(state.id, null);
    record(state.id);
    commit(state.id, before);
    buildParts();
    buildSelPanel();
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
        rig.setRigs(JSON.parse(text));
        work.clear();
        dirty.clear();
        record(state.id);
        buildParts();
        buildSelPanel();
        syncHead();
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

    // Right stick, falling back to the left one. Aiming is a preview thing:
    // edit mode holds the default pose so the handles stay put under the mouse.
    const ax = (i) => (pad.axes.length > i ? pad.axes[i] : 0);
    let x = ax(2), y = ax(3);
    if (Math.hypot(x, y) < 0.25) { x = ax(0); y = ax(1); }
    if (Math.hypot(x, y) >= 0.25 && state.mode !== "edit") {
      const a = Math.atan2(y, x);
      const facing = Math.cos(a) < 0;
      state.faceLeft = facing;
      $("faceLeft").checked = facing;
      const local = facing ? Math.atan2(y, -x) : a;
      state.aim = round(deg(local), 1);
      $("aim").value = Math.round(state.aim);
      $("aimOut").textContent = `${Math.round(state.aim)}°`;
      state.spin = false;
      $("spin").checked = false;
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
    select(CHARACTERS[(i + dir + CHARACTERS.length) % CHARACTERS.length].id);
  }
  function cyclePiece(dir) {
    const list = pieces();
    const i = Math.max(0, list.findIndex((p) => p.key === state.sel));
    state.sel = list[(i + dir + list.length) % list.length].key;
    buildParts();
    buildSelPanel();
    writeUrl();
  }

  // ----------------------------------------------------------------- loop

  readUrl();
  buildRoster();
  select(state.id);
  setMode(state.mode);
  $("gizmoHint").textContent = "drag: pink = move · green = size · yellow = turn — arrows nudge, gamepad aims";

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    pollGamepad(dt);
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

  // Assets stream in; refresh until everything has settled.
  let ticks = 0;
  const poll = setInterval(() => {
    refreshTiles();
    syncHead();
    if (state.built !== `${state.id}|${state.mode}|${state.sel}` && record(state.id)) {
      state.built = `${state.id}|${state.mode}|${state.sel}`;
      buildParts();
      buildSelPanel();
      syncJson();
    }
    ticks += 1;
    if (ticks > 120) clearInterval(poll);
  }, 250);
})();

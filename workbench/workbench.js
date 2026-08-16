// Rounders — sprite workbench.
//
// Left: the character roster. Right: an interactive viewer over the same rig
// code the game uses (js/rig.js), so what you see here is what ships.
//
//   character mode — place / orient / size the weapon and hands on the body
//   anchor mode    — set the anchor points inside each source image
//
// Export writes assets/images/characters/render/rigs.json, which the game
// loads on boot and merges over the auto-detected anchors.
(() => {
  "use strict";
  const { CHARACTERS, drawCharacter, characterImage, rig } = window.ROUNDERS;

  const $ = (id) => document.getElementById(id);
  const view = $("view");
  const ctx = view.getContext("2d");

  const state = {
    id: CHARACTERS[0].id,
    mode: "character",
    part: "body",
    zoom: 2,
    pan: { x: 0, y: 0 },
    r: 42,
    aim: 0,
    spin: false,
    faceLeft: false,
    showRef: false,
    showGrid: true,
    onion: false,
    sel: null,
    drag: null
  };

  const work = new Map();   // id -> serializable rig record (also pushed into rig.js)
  const dirty = new Set();

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const round = (v, p = 2) => Math.round(v * 10 ** p) / 10 ** p;
  const deg = (rad) => (rad * 180) / Math.PI;
  const rad = (d) => (d * Math.PI) / 180;

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
      arm: { pivots: R.arm.pivots.map((p) => clone(p)) },
      rig: {
        bodyScale: R.rig.bodyScale,
        weapon: {
          scale: R.rig.weapon.scale,
          rotation: R.rig.weapon.rotation,
          offset: clone(R.rig.weapon.offset),
          behind: !!R.rig.weapon.behind
        },
        hands: R.rig.hands.map((h) => clone(h))
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

  // ------------------------------------------------------------ geometry

  function aimVec() {
    const a = rad(state.aim);
    const x = Math.cos(a) * (state.faceLeft ? -1 : 1);
    return { x, y: Math.sin(a) };
  }

  function frame() {
    const A = aimVec();
    const T = rig.transform(state.id, state.r, A.x, A.y, 0);
    if (!T) return null;
    const cx = view.clientWidth / 2 + state.pan.x;
    const cy = view.clientHeight / 2 + state.pan.y;
    return { T, cx, cy, z: state.zoom, A };
  }

  // mirrored rig space -> screen
  function toScreen(f, p) {
    return { x: f.cx + p.x * f.T.facing * f.z, y: f.cy + p.y * f.z };
  }
  // screen -> mirrored rig space
  function toRigSpace(f, p) {
    return { x: ((p.x - f.cx) / f.z) * f.T.facing, y: (p.y - f.cy) / f.z };
  }
  // weapon-image px -> mirrored rig space
  function weaponToRig(f, px, py) {
    const { T } = f;
    const R = T.R;
    const x = (px - R.weapon.grip.x) * T.kw;
    const y = (py - R.weapon.grip.y) * T.kw;
    return {
      x: T.mount.x + x * Math.cos(T.angle) - y * Math.sin(T.angle),
      y: T.mount.y + x * Math.sin(T.angle) + y * Math.cos(T.angle)
    };
  }
  // mirrored rig space -> weapon-image px
  function rigToWeapon(f, p) {
    const { T } = f;
    const R = T.R;
    const dx = p.x - T.mount.x, dy = p.y - T.mount.y;
    const c = Math.cos(-T.angle), s = Math.sin(-T.angle);
    return {
      x: (dx * c - dy * s) / T.kw + R.weapon.grip.x,
      y: (dx * s + dy * c) / T.kw + R.weapon.grip.y
    };
  }

  // anchor mode: image px <-> screen
  function anchorImage() {
    const a = rig.assets(state.id);
    return state.part === "body" ? a.body : state.part === "weapon" ? a.weapon : a.arm;
  }
  function imgToScreen(img, p) {
    return {
      x: view.clientWidth / 2 + state.pan.x + (p.x - img.width / 2) * state.zoom,
      y: view.clientHeight / 2 + state.pan.y + (p.y - img.height / 2) * state.zoom
    };
  }
  function screenToImg(img, p) {
    return {
      x: (p.x - view.clientWidth / 2 - state.pan.x) / state.zoom + img.width / 2,
      y: (p.y - view.clientHeight / 2 - state.pan.y) / state.zoom + img.height / 2
    };
  }

  // --------------------------------------------------------------- handles

  // Every handle: { key, label, at (screen), color, kind }
  function handles() {
    const rec = record(state.id);
    if (!rec) return [];
    const out = [];
    if (state.mode === "character") {
      const f = frame();
      if (!f) return [];
      out.push({ key: "mount", label: "weapon", at: toScreen(f, f.T.mount), color: "#ff4d8f" });
      const muz = weaponToRig(f, f.T.R.weapon.muzzle.x, f.T.R.weapon.muzzle.y);
      out.push({ key: "rot", label: "rotate", at: toScreen(f, muz), color: "#ffd24d", ring: true });
      rec.rig.hands.forEach((h, i) => {
        out.push({ key: `hand:${i}`, label: `hand ${i + 1}`, at: toScreen(f, weaponToRig(f, h.x, h.y)), color: "#29d7ff" });
      });
    } else {
      const img = anchorImage();
      if (!img) return [];
      if (state.part === "body") {
        out.push({ key: "body.pivot", label: "pivot", at: imgToScreen(img, rec.body.pivot), color: "#ff4d8f" });
        out.push({ key: "body.mount", label: "mount", at: imgToScreen(img, rec.body.mount), color: "#ffd24d" });
        const edge = imgToScreen(img, { x: rec.body.pivot.x + rec.body.radius, y: rec.body.pivot.y });
        out.push({ key: "body.radius", label: "radius", at: edge, color: "#6ee787" });
      } else if (state.part === "weapon") {
        out.push({ key: "weapon.grip", label: "grip", at: imgToScreen(img, rec.weapon.grip), color: "#ff4d8f" });
        out.push({ key: "weapon.muzzle", label: "muzzle", at: imgToScreen(img, rec.weapon.muzzle), color: "#29d7ff" });
      } else {
        rec.arm.pivots.forEach((p, i) => {
          out.push({ key: `arm.${i}`, label: `hand ${i + 1} pivot`, at: imgToScreen(img, p), color: "#29d7ff" });
          out.push({ key: `armr.${i}`, label: `hand ${i + 1} radius`, at: imgToScreen(img, { x: p.x + p.radius, y: p.y }), color: "#6ee787" });
        });
      }
    }
    return out;
  }

  function hit(pos) {
    let best = null, bestD = 12 * 12;
    for (const h of handles()) {
      const d = (h.at.x - pos.x) ** 2 + (h.at.y - pos.y) ** 2;
      if (d < bestD) { bestD = d; best = h; }
    }
    return best;
  }

  function applyDrag(key, pos) {
    const rec = record(state.id);
    if (!rec) return;
    if (state.mode === "character") {
      const f = frame();
      if (!f) return;
      const p = toRigSpace(f, pos);
      if (key === "mount") {
        const R = f.T.R;
        const base = {
          x: (R.body.mount.x - R.body.pivot.x) * f.T.k,
          y: (R.body.mount.y - R.body.pivot.y) * f.T.k
        };
        rec.rig.weapon.offset.x = (p.x - base.x) / state.r;
        rec.rig.weapon.offset.y = (p.y - base.y) / state.r;
      } else if (key === "rot") {
        const aimAngle = Math.atan2(f.A.y, f.A.x * f.T.facing);
        const want = Math.atan2(p.y - f.T.mount.y, p.x - f.T.mount.x);
        let d = deg(want - aimAngle) % 360;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        rec.rig.weapon.rotation = d;
      } else if (key.startsWith("hand:")) {
        const i = Number(key.slice(5));
        const w = rigToWeapon(f, p);
        rec.rig.hands[i].x = w.x;
        rec.rig.hands[i].y = w.y;
      }
    } else {
      const img = anchorImage();
      if (!img) return;
      const p = screenToImg(img, pos);
      if (key === "body.pivot") rec.body.pivot = { x: p.x, y: p.y };
      else if (key === "body.mount") rec.body.mount = { x: p.x, y: p.y };
      else if (key === "body.radius") rec.body.radius = Math.max(4, Math.hypot(p.x - rec.body.pivot.x, p.y - rec.body.pivot.y));
      else if (key === "weapon.grip") rec.weapon.grip = { x: p.x, y: p.y };
      else if (key === "weapon.muzzle") rec.weapon.muzzle = { x: p.x, y: p.y };
      else if (key.startsWith("armr.")) {
        const i = Number(key.slice(5));
        rec.arm.pivots[i].radius = Math.max(2, Math.hypot(p.x - rec.arm.pivots[i].x, p.y - rec.arm.pivots[i].y));
      } else if (key.startsWith("arm.")) {
        const i = Number(key.slice(4));
        rec.arm.pivots[i].x = p.x;
        rec.arm.pivots[i].y = p.y;
      }
    }
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
    if (state.mode === "character") renderCharacter(ch);
    else renderAnchor();
    renderHandles();
  }

  function renderCharacter(ch) {
    const f = frame();
    if (!f) return;
    ctx.save();
    ctx.translate(f.cx, f.cy);
    ctx.scale(f.z, f.z);

    if (state.showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1 / f.z;
      ctx.beginPath();
      ctx.moveTo(-4000, 0); ctx.lineTo(4000, 0);
      ctx.moveTo(0, -4000); ctx.lineTo(0, 4000);
      ctx.stroke();
      ctx.strokeStyle = "rgba(110,231,135,0.5)";
      ctx.setLineDash([4 / f.z, 4 / f.z]);
      ctx.beginPath();
      ctx.arc(0, 0, state.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (state.showRef) {
      const ref = characterImage.get(state.id);
      if (ref) {
        const s = state.r * 2.5;
        ctx.save();
        ctx.globalAlpha = 0.32;
        if (f.T.facing < 0) ctx.scale(-1, 1);
        ctx.drawImage(ref, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
    }

    const A = aimVec();
    drawCharacter(ctx, ch, state.r, { t: 0, aimX: A.x, aimY: A.y });

    // aim ray from the muzzle, so barrel alignment is easy to judge
    const m = rig.muzzle(ch, state.r, A.x, A.y, 0);
    if (m) {
      ctx.strokeStyle = "rgba(255,210,77,0.6)";
      ctx.lineWidth = 1 / f.z;
      ctx.setLineDash([6 / f.z, 5 / f.z]);
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x + A.x * 260, m.y + A.y * 260);
      ctx.stroke();
      ctx.setLineDash([]);
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

    // frame border
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
        ctx.strokeStyle = "rgba(110,231,135,0.85)";
        for (const p of rec.arm.pivots) {
          ctx.beginPath();
          ctx.arc(off.x + p.x, off.y + p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function renderHandles() {
    ctx.save();
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (const h of handles()) {
      const on = state.sel === h.key;
      ctx.beginPath();
      ctx.arc(h.at.x, h.at.y, on ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = h.color;
      ctx.globalAlpha = on ? 1 : 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#14121c";
      ctx.lineWidth = 2;
      ctx.stroke();
      if (on) {
        ctx.fillStyle = "#efe9ff";
        ctx.fillText(h.label, h.at.x, h.at.y - 12);
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------- roster

  function buildRoster() {
    const grid = $("grid");
    grid.textContent = "";
    for (const ch of CHARACTERS) {
      const tile = document.createElement("div");
      tile.className = "tile" + (ch.id === state.id ? " on" : "");
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
    $("rosterCount").textContent = `${CHARACTERS.length}`;
  }

  function refreshTiles() {
    let rigged = 0;
    for (const tile of document.querySelectorAll(".tile")) {
      const id = tile.dataset.id;
      const ch = CHARACTERS.find((c) => c.id === id);
      const a = rig.assets(id);
      for (const b of tile.querySelectorAll(".badge")) {
        b.classList.toggle("has", !!a[b.dataset.part]);
      }
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
      drawCharacter(c, ch, 40, { t: 0, aimX: 1, aimY: 0 });
      c.restore();
    }
    $("rosterCount").textContent = `${rigged}/${CHARACTERS.length} rigged`;
  }

  function select(id) {
    state.id = id;
    state.sel = null;
    state.pan = { x: 0, y: 0 };
    record(id);
    buildInspector();
    refreshTiles();
    syncHead();
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
      bits.push(R.meta.sameFrame ? "same frame (auto-placed)" : "different frames (manual placement)");
      bits.push(`${R.arm.sprites.length} hand sprite(s)`);
    } else if (a.state === "loading") bits.push("loading…");
    else bits.push("no render parts");
    $("charInfo").textContent = bits.join(" · ");
    $("hint").textContent = state.mode === "character"
      ? "Drag the pink dot to move the weapon, the yellow dot to rotate it, blue dots to place hands. Drag empty space to pan, scroll to zoom, arrow keys nudge the selection."
      : "Drag anchors on the source image: body pivot (pink) is the physics center, mount (yellow) is where the weapon grip sits, green sets the body radius. Weapon: grip → muzzle.";
  }

  // ----------------------------------------------------------- inspector

  function get(path) {
    return path.split(".").reduce((o, k) => (o == null ? o : o[k]), record(state.id));
  }
  function set(path, v) {
    const keys = path.split(".");
    const last = keys.pop();
    const o = keys.reduce((acc, k) => acc[k], record(state.id));
    o[last] = v;
    touch(state.id);
  }

  function fieldRow(label, path, opts = {}) {
    const row = document.createElement("label");
    row.className = "row";
    row.append(label);
    const input = document.createElement("input");
    input.type = opts.range ? "range" : "number";
    if (opts.min !== undefined) input.min = opts.min;
    if (opts.max !== undefined) input.max = opts.max;
    input.step = opts.step ?? 1;
    input.value = round(get(path), 3);
    input.dataset.path = path;
    input.addEventListener("input", () => {
      const v = Number(input.value);
      if (isFinite(v)) set(path, v);
      if (opts.range && row.querySelector("output")) row.querySelector("output").textContent = round(v, 2);
    });
    row.appendChild(input);
    if (opts.range) {
      const out = document.createElement("output");
      out.textContent = round(get(path), 2);
      row.appendChild(out);
    }
    return row;
  }

  function checkRow(label, path) {
    const row = document.createElement("label");
    row.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!get(path);
    input.addEventListener("change", () => set(path, input.checked));
    row.append(input, label);
    return row;
  }

  function buildInspector() {
    const box = $("inspect");
    box.textContent = "";
    const rec = record(state.id);
    state.built = rec ? `${state.id}|${state.mode}|${state.part}` : null;
    if (!rec) {
      box.innerHTML = "<h2>Rig</h2><p class='muted'>Waiting for render parts…</p>";
      return;
    }
    const h2 = document.createElement("h2");
    h2.textContent = state.mode === "character" ? "Composition" : `Anchors — ${state.part}`;
    box.appendChild(h2);

    if (state.mode === "character") {
      box.appendChild(fieldRow("Body scale", "rig.bodyScale", { range: true, min: 0.4, max: 2.5, step: 0.01 }));
      const wh = document.createElement("h3");
      wh.textContent = "Weapon";
      box.appendChild(wh);
      box.appendChild(fieldRow("Scale", "rig.weapon.scale", { range: true, min: 0.2, max: 3, step: 0.01 }));
      box.appendChild(fieldRow("Rotation°", "rig.weapon.rotation", { range: true, min: -180, max: 180, step: 0.5 }));
      box.appendChild(fieldRow("Offset X (r)", "rig.weapon.offset.x", { step: 0.01 }));
      box.appendChild(fieldRow("Offset Y (r)", "rig.weapon.offset.y", { step: 0.01 }));
      box.appendChild(checkRow("Draw behind body", "rig.weapon.behind"));

      rec.rig.hands.forEach((h, i) => {
        const hh = document.createElement("h3");
        hh.textContent = `Hand ${i + 1}`;
        box.appendChild(hh);
        box.appendChild(fieldRow("Sprite #", `rig.hands.${i}.sprite`, { min: 0, max: Math.max(0, rec.arm.pivots.length - 1) }));
        box.appendChild(fieldRow("X (weapon px)", `rig.hands.${i}.x`, { step: 0.5 }));
        box.appendChild(fieldRow("Y (weapon px)", `rig.hands.${i}.y`, { step: 0.5 }));
        box.appendChild(fieldRow("Scale", `rig.hands.${i}.scale`, { range: true, min: 0.2, max: 3, step: 0.01 }));
        box.appendChild(checkRow("Behind weapon", `rig.hands.${i}.behind`));
      });

      const add = document.createElement("button");
      add.className = "ghost wide";
      add.textContent = "Add hand";
      add.addEventListener("click", () => {
        const R = rig.resolved(state.id);
        rec.rig.hands.push({
          sprite: 0,
          x: R.weapon.grip.x + (R.weapon.muzzle.x - R.weapon.grip.x) * 0.3,
          y: R.weapon.grip.y + (R.weapon.muzzle.y - R.weapon.grip.y) * 0.3,
          scale: 1, behind: false
        });
        touch(state.id);
        buildInspector();
      });
      box.appendChild(add);
      if (rec.rig.hands.length) {
        const rm = document.createElement("button");
        rm.className = "ghost wide";
        rm.textContent = "Remove last hand";
        rm.addEventListener("click", () => { rec.rig.hands.pop(); touch(state.id); buildInspector(); });
        box.appendChild(rm);
      }
    } else if (state.part === "body") {
      box.appendChild(fieldRow("Pivot X", "body.pivot.x", { step: 0.5 }));
      box.appendChild(fieldRow("Pivot Y", "body.pivot.y", { step: 0.5 }));
      box.appendChild(fieldRow("Radius", "body.radius", { step: 0.5 }));
      box.appendChild(fieldRow("Mount X", "body.mount.x", { step: 0.5 }));
      box.appendChild(fieldRow("Mount Y", "body.mount.y", { step: 0.5 }));
    } else if (state.part === "weapon") {
      box.appendChild(fieldRow("Grip X", "weapon.grip.x", { step: 0.5 }));
      box.appendChild(fieldRow("Grip Y", "weapon.grip.y", { step: 0.5 }));
      box.appendChild(fieldRow("Muzzle X", "weapon.muzzle.x", { step: 0.5 }));
      box.appendChild(fieldRow("Muzzle Y", "weapon.muzzle.y", { step: 0.5 }));
    } else {
      if (!rec.arm.pivots.length) {
        const p = document.createElement("p");
        p.className = "muted";
        p.textContent = "No arm blobs detected (no <id>_arm.png, or it is empty).";
        box.appendChild(p);
      }
      rec.arm.pivots.forEach((_, i) => {
        const hh = document.createElement("h3");
        hh.textContent = `Sprite ${i}`;
        box.appendChild(hh);
        box.appendChild(fieldRow("Pivot X", `arm.pivots.${i}.x`, { step: 0.5 }));
        box.appendChild(fieldRow("Pivot Y", `arm.pivots.${i}.y`, { step: 0.5 }));
        box.appendChild(fieldRow("Radius", `arm.pivots.${i}.radius`, { step: 0.5 }));
      });
    }
    syncJson();
  }

  // Keep inputs in step with handle drags without stomping the focused field.
  function syncInputs() {
    for (const input of $("inspect").querySelectorAll("input[data-path]")) {
      if (document.activeElement === input) continue;
      const v = round(get(input.dataset.path), 3);
      if (Number(input.value) !== v) {
        input.value = v;
        const out = input.parentElement.querySelector("output");
        if (out) out.textContent = round(v, 2);
      }
    }
  }

  function syncJson() {
    const rec = work.get(state.id);
    $("jsonOut").value = rec ? JSON.stringify({ [state.id]: tidy(rec) }, null, 2) : "";
  }

  // --------------------------------------------------------------- events

  view.addEventListener("pointerdown", (e) => {
    view.setPointerCapture(e.pointerId);
    const pos = { x: e.offsetX, y: e.offsetY };
    const h = hit(pos);
    if (h) {
      state.sel = h.key;
      state.drag = { key: h.key };
    } else {
      state.sel = null;
      state.drag = { pan: { x: e.offsetX - state.pan.x, y: e.offsetY - state.pan.y } };
    }
  });

  view.addEventListener("pointermove", (e) => {
    if (!state.drag) return;
    const pos = { x: e.offsetX, y: e.offsetY };
    if (state.drag.pan) {
      state.pan = { x: pos.x - state.drag.pan.x, y: pos.y - state.drag.pan.y };
    } else {
      applyDrag(state.drag.key, pos);
    }
  });

  const endDrag = () => { state.drag = null; };
  view.addEventListener("pointerup", endDrag);
  view.addEventListener("pointercancel", endDrag);

  view.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rec = record(state.id);
    if (e.shiftKey && rec && state.sel) {
      // shift-wheel scales whatever is selected
      const f = -Math.sign(e.deltaY) * 0.02;
      if (state.sel === "mount" || state.sel === "rot") {
        rec.rig.weapon.scale = Math.max(0.05, rec.rig.weapon.scale * (1 + f));
      } else if (state.sel.startsWith("hand:")) {
        const i = Number(state.sel.slice(5));
        rec.rig.hands[i].scale = Math.max(0.05, rec.rig.hands[i].scale * (1 + f));
      }
      touch(state.id);
      return;
    }
    setZoom(state.zoom * (1 - Math.sign(e.deltaY) * 0.1));
  }, { passive: false });

  function setZoom(z) {
    state.zoom = Math.min(8, Math.max(0.2, z));
    $("zoom").value = Math.min(6, Math.max(0.4, state.zoom));
    $("zoomOut").textContent = round(state.zoom, 2);
  }

  // Anchor mode works in source-image pixels, so fit the frame to the viewport.
  function fitAnchorZoom() {
    const img = anchorImage();
    if (!img) return;
    const pad = 60;
    setZoom(Math.min((view.clientWidth - pad) / img.width, (view.clientHeight - pad) / img.height));
  }

  window.addEventListener("keydown", (e) => {
    if (!state.sel || document.activeElement.tagName === "INPUT") return;
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    const h = handles().find((x) => x.key === state.sel);
    if (h) applyDrag(state.sel, { x: h.at.x + d[0], y: h.at.y + d[1] });
  });

  $("mode").addEventListener("change", (e) => {
    state.mode = e.target.value;
    $("partTabs").hidden = state.mode !== "anchor";
    state.sel = null;
    state.pan = { x: 0, y: 0 };
    if (state.mode === "anchor") fitAnchorZoom(); else setZoom(2);
    buildInspector();
    syncHead();
  });

  for (const tab of document.querySelectorAll("#partTabs .tab")) {
    tab.addEventListener("click", () => {
      state.part = tab.dataset.part;
      for (const t of document.querySelectorAll("#partTabs .tab")) t.classList.toggle("on", t === tab);
      state.sel = null;
      state.pan = { x: 0, y: 0 };
      fitAnchorZoom();
      buildInspector();
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

  const bindCheck = (id, key, after) => {
    $(id).addEventListener("change", (e) => { state[key] = e.target.checked; if (after) after(); });
  };
  bindCheck("spin", "spin");
  bindCheck("faceLeft", "faceLeft");
  bindCheck("showRef", "showRef");
  bindCheck("showGrid", "showGrid");
  bindCheck("onion", "onion");

  $("resetChar").addEventListener("click", () => {
    work.delete(state.id);
    dirty.delete(state.id);
    rig.setCharacterRig(state.id, null);
    record(state.id);
    buildInspector();
    syncHead();
  });

  $("exportJson").addEventListener("click", () => {
    download("rigs.json", JSON.stringify(exportData(), null, 2), "application/json");
  });

  $("exportJs").addEventListener("click", () => {
    const text = `// Generated by /workbench — drop next to rigs.json and include with\n`
      + `// <script src="assets/images/characters/render/rigs.js"><\/script> for file:// use.\n`
      + `window.ROUNDERS_RIGS = ${JSON.stringify(exportData(), null, 2)};\n`;
    download("rigs.js", text, "text/javascript");
  });

  $("copyJson").addEventListener("click", () => {
    navigator.clipboard?.writeText($("jsonOut").value);
  });

  $("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const data = JSON.parse(text);
        rig.setRigs(data);
        work.clear();
        dirty.clear();
        record(state.id);
        buildInspector();
        syncHead();
      } catch (err) {
        alert(`Could not read that JSON: ${err.message}`);
      }
    });
    e.target.value = "";
  });

  // ----------------------------------------------------------------- loop

  buildRoster();
  select(state.id);

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.spin) {
      state.aim = ((state.aim + dt * 60 + 180) % 360) - 180;
      $("aim").value = state.aim;
      $("aimOut").textContent = `${Math.round(state.aim)}°`;
    }
    render();
    syncInputs();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Assets stream in; refresh the roster and header until everything settles.
  let ticks = 0;
  const poll = setInterval(() => {
    refreshTiles();
    syncHead();
    // The inspector is built before the images finish loading; rebuild it once
    // the record actually exists.
    if (state.built !== `${state.id}|${state.mode}|${state.part}`) buildInspector();
    ticks += 1;
    if (ticks > 120) clearInterval(poll);
  }, 250);
})();

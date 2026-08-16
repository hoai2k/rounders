// Rounders — art intake page.
//
// Drop delivered art in, get transparent PNGs out. Uses the same keying core
// as tools/intake.mjs (js/chroma.js), so a file processed here and a file
// processed by the CLI come out identical — this page just adds eyes on it:
// per-file preview, a color picker for stubborn backdrops, and live tolerance.
(() => {
  "use strict";
  const { CHARACTERS, chroma } = window.ROUNDERS;
  const $ = (id) => document.getElementById(id);
  const PARTS = [
    { v: "", label: "canonical (hero image)" },
    { v: "body", label: "render: body" },
    { v: "weapon", label: "render: weapon" },
    { v: "arm", label: "render: arm" }
  ];

  const cards = [];

  // Same routing rules as the CLI, so filenames behave the same in both.
  function route(name) {
    const stem = name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const bits = stem.split("_").filter(Boolean);
    const ids = CHARACTERS.map((c) => c.id);
    const id = ids.find((c) => bits.includes(c))
      || ids.filter((c) => stem.startsWith(c)).sort((a, b) => b.length - a.length)[0]
      || ids[0];
    const part = ["body", "weapon", "arm"].find((p) => bits.includes(p)) || "";
    return { id, part };
  }

  const hex = (c) => `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  const pct = (v) => `${(v * 100).toFixed(1)}%`;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  async function addFile(file) {
    const bitmap = await createImageBitmap(file);
    const w = bitmap.width, h = bitmap.height;
    const src = document.createElement("canvas");
    src.width = w; src.height = h;
    src.getContext("2d", { willReadFrequently: true }).drawImage(bitmap, 0, 0);
    const original = src.getContext("2d").getImageData(0, 0, w, h);

    const card = {
      file, w, h,
      original,
      opts: { key: null, force: false, tolerance: chroma.DEFAULTS.tolerance, softness: chroma.DEFAULTS.softness, despill: chroma.DEFAULTS.despill, shrink: chroma.DEFAULTS.shrink, connected: true },
      route: route(file.name),
      result: null,
      out: null
    };
    cards.push(card);
    buildCard(card);
    apply(card);
    summarize();
  }

  function apply(card) {
    const data = new ImageData(new Uint8ClampedArray(card.original.data), card.w, card.h);
    card.result = chroma.process(data.data, card.w, card.h, {
      ...card.opts,
      keepAlpha: !card.opts.force
    });
    card.out = data;
    const c = card.ui.after.getContext("2d");
    c.clearRect(0, 0, card.w, card.h);
    c.putImageData(data, 0, 0);
    paintCard(card);
  }

  function targetPath(card) {
    return card.route.part
      ? `assets/images/characters/render/${card.route.id}_${card.route.part}.png`
      : `assets/images/characters/canonical/${card.route.id}.png`;
  }
  function targetName(card) {
    return card.route.part ? `${card.route.id}_${card.route.part}.png` : `${card.route.id}.png`;
  }

  function paintCard(card) {
    const r = card.result;
    const ui = card.ui;
    ui.tag.className = `tag ${r.action}`;
    ui.tag.textContent = r.action;
    ui.detail.textContent = r.action === "keyed"
      ? `cut ${pct(r.cutFraction)}`
      : r.action === "kept"
        ? `already transparent (${pct(r.info.clearFraction)})`
        : r.reason || "left as-is";
    const k = r.key || card.opts.key;
    ui.swatch.style.background = k ? hex(k) : "transparent";
    ui.swatch.title = k ? hex(k) : "no backdrop color";
    ui.keyText.textContent = k ? hex(k) : "—";
    ui.path.textContent = targetPath(card);
  }

  function slider(card, label, key, min, max, step) {
    const row = el("label", "row");
    row.append(label);
    const input = document.createElement("input");
    input.type = "range";
    input.min = min; input.max = max; input.step = step;
    input.value = card.opts[key];
    const out = el("output", null, card.opts[key]);
    input.addEventListener("input", () => {
      card.opts[key] = Number(input.value);
      out.textContent = Number(input.value).toFixed(2);
      apply(card);
    });
    row.append(input, out);
    return row;
  }

  function buildCard(card) {
    const node = el("div", "card");
    const head = el("div", "meta");
    const title = el("h3", null, card.file.name);
    const tag = el("span", "tag");
    const detail = el("span", null, "");
    head.append(tag, detail);

    const previews = el("div", "previews");
    const before = document.createElement("canvas");
    const after = document.createElement("canvas");
    before.width = after.width = card.w;
    before.height = after.height = card.h;
    before.getContext("2d").putImageData(card.original, 0, 0);
    for (const [cv, label] of [[before, "original — click to pick backdrop"], [after, "keyed"]]) {
      const box = el("div", "preview");
      box.append(cv, el("span", "cap", label));
      previews.append(box);
    }
    before.addEventListener("click", (e) => {
      const rect = before.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * card.w);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * card.h);
      const i = (y * card.w + x) * 4;
      const d = card.original.data;
      card.opts.key = { r: d[i], g: d[i + 1], b: d[i + 2] };
      card.opts.force = true;
      node.classList.add("open");
      apply(card);
    });

    const meta = el("div", "meta");
    const swatch = el("span", "swatch");
    const keyText = el("span", null, "—");
    meta.append("backdrop", swatch, keyText, el("span", null, `· ${card.w}×${card.h}`));

    const routeRow = el("div", "route");
    const idSel = document.createElement("select");
    for (const ch of CHARACTERS) {
      const o = document.createElement("option");
      o.value = ch.id; o.textContent = ch.name;
      idSel.append(o);
    }
    idSel.value = card.route.id;
    const partSel = document.createElement("select");
    for (const p of PARTS) {
      const o = document.createElement("option");
      o.value = p.v; o.textContent = p.label;
      partSel.append(o);
    }
    partSel.value = card.route.part;
    idSel.addEventListener("change", () => { card.route.id = idSel.value; paintCard(card); });
    partSel.addEventListener("change", () => { card.route.part = partSel.value; paintCard(card); });
    routeRow.append(idSel, partSel);
    const path = el("div", "path");

    const controls = el("div", "controls");
    controls.append(
      slider(card, "Tolerance", "tolerance", 0.02, 0.6, 0.01),
      slider(card, "Softness", "softness", 0, 0.4, 0.01),
      slider(card, "Despill", "despill", 0, 1, 0.05),
      slider(card, "Shrink", "shrink", 0, 0.4, 0.01)
    );
    const conn = el("label", "check");
    const connIn = document.createElement("input");
    connIn.type = "checkbox";
    connIn.checked = card.opts.connected;
    connIn.addEventListener("change", () => { card.opts.connected = connIn.checked; apply(card); });
    conn.append(connIn, "Only cut backdrop connected to the border");
    const force = el("label", "check");
    const forceIn = document.createElement("input");
    forceIn.type = "checkbox";
    forceIn.checked = card.opts.force;
    forceIn.addEventListener("change", () => { card.opts.force = forceIn.checked; apply(card); });
    force.append(forceIn, "Key even if the image already has alpha");
    const reset = el("button", "ghost wide", "Reset to auto");
    reset.addEventListener("click", () => {
      card.opts = { key: null, force: false, tolerance: chroma.DEFAULTS.tolerance, softness: chroma.DEFAULTS.softness, despill: chroma.DEFAULTS.despill, shrink: chroma.DEFAULTS.shrink, connected: true };
      buildCardRefresh(card);
    });
    controls.append(conn, force, reset);

    const foot = el("div", "foot");
    const tune = el("button", "ghost", "Tune");
    tune.addEventListener("click", () => node.classList.toggle("open"));
    const dl = el("button", "primary", "Download PNG");
    dl.addEventListener("click", () => downloadCard(card));
    const drop = el("button", "ghost", "Remove");
    drop.addEventListener("click", () => {
      cards.splice(cards.indexOf(card), 1);
      node.remove();
      summarize();
    });
    foot.append(tune, dl, drop);

    node.append(title, head, previews, meta, routeRow, path, controls, foot);
    $("cards").append(node);
    card.ui = { node, tag, detail, after, swatch, keyText, path };
  }

  // Rebuild a card in place after a reset, keeping its position in the list.
  function buildCardRefresh(card) {
    const old = card.ui.node;
    buildCard(card);
    old.replaceWith(card.ui.node);
    apply(card);
  }

  function downloadCard(card) {
    const cv = document.createElement("canvas");
    cv.width = card.w; cv.height = card.h;
    cv.getContext("2d").putImageData(card.out, 0, 0);
    cv.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = targetName(card);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  function summarize() {
    const n = cards.length;
    const keyed = cards.filter((c) => c.result && c.result.action === "keyed").length;
    $("summary").textContent = n ? `${n} image(s) · ${keyed} keyed` : "";
  }

  // ------------------------------------------------------------------ input

  const drop = $("drop");
  const handleFiles = async (list) => {
    for (const f of list) {
      if (!f.type.startsWith("image/")) continue;
      try {
        await addFile(f);
      } catch (e) {
        alert(`Could not read ${f.name}: ${e.message}`);
      }
    }
  };

  // Snapshot the FileList before clearing the input — clearing it empties the
  // live list mid-iteration and only the first file would survive.
  $("pick").addEventListener("change", (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    handleFiles(files);
  });
  for (const ev of ["dragenter", "dragover"]) {
    document.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); });
  }
  for (const ev of ["dragleave", "drop"]) {
    document.addEventListener(ev, (e) => { e.preventDefault(); if (e.type === "drop" || e.target === drop) drop.classList.remove("over"); });
  }
  document.addEventListener("drop", (e) => handleFiles([...e.dataTransfer.files]));
  drop.addEventListener("click", () => $("pick").click());

  $("downloadAll").addEventListener("click", () => {
    // Browsers throttle bursts of downloads; space them out a little.
    cards.forEach((c, i) => setTimeout(() => downloadCard(c), i * 350));
  });
})();

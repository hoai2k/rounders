// Rounders — 12 playable characters. All roughly circular with a signature
// weapon sticking out. Fully procedural rendering (crest + face + weapon), with
// automatic upgrade to generated art at assets/images/characters/<id>.png.
(() => {
  "use strict";
  window.ROUNDERS = window.ROUNDERS || {};

  // crest: shape drawn on top of the body. weapon: barrel style. eyes: expression.
  const CHARACTERS = [
    // ---- round 2: the indie-badass wave (front of the roster)
    { id: "vex", name: "Vex", title: "the neon reaper", blurb: "Collects souls. Keeps receipts.",
      color: "#b0104f", dark: "#6e0a33", accent: "#ff2e8a", crest: "mohawk", eyes: "xeye", weapon: "scythe" },
    { id: "rook", name: "Rook", title: "the wasteland warden", blurb: "Half armor, half attitude, zero vacancies.",
      color: "#7d8087", dark: "#45474d", accent: "#ff7a2e", crest: "plate", eyes: "patch", weapon: "sawnoff" },
    { id: "jinx", name: "Jinx", title: "the glitch witch", blurb: "Your bugs are her features.",
      color: "#1f2333", dark: "#0e101a", accent: "#29f2ff", crest: "glitch", eyes: "pixel", weapon: "glitchgun" },
    { id: "diesel", name: "Diesel", title: "the road king", blurb: "Runs on fumes and grudges.",
      color: "#4d2e26", dark: "#291712", accent: "#ff9e2e", crest: "spikes", eyes: "goggles", weapon: "flamer" },
    { id: "nyx", name: "Nyx", title: "the void dancer", blurb: "Between the stars, mostly knives.",
      color: "#2a1f4d", dark: "#171130", accent: "#b8a8ff", crest: "hood", eyes: "slit", weapon: "twindagger" },
    { id: "saber", name: "Saber", title: "the last ronin", blurb: "One cut. Usually enough.",
      color: "#a32639", dark: "#5c1420", accent: "#f2e2c9", crest: "topknot", eyes: "scar", weapon: "katana" },
    { id: "havoc", name: "Havoc", title: "the demolition artist", blurb: "Every wall is a door if you believe.",
      color: "#a08a52", dark: "#665732", accent: "#ffd23d", crest: "fuse", eyes: "manic", weapon: "launcher" },
    { id: "wraith", name: "Wraith", title: "the static ghost", blurb: "Died once. Wasn't impressed.",
      color: "#a3b3a6", dark: "#5f6e62", accent: "#7ff2d8", crest: "wisps", eyes: "hollow", weapon: "spectral" },
    { id: "blitz", name: "Blitz", title: "the arc runner", blurb: "Outruns the thunder she starts.",
      color: "#ffd21f", dark: "#a8890a", accent: "#29b6ff", crest: "arcs", eyes: "fierce", weapon: "coilgun" },
    { id: "fang", name: "Fang", title: "the stray", blurb: "No collar. No mercy.",
      color: "#4f7285", dark: "#2c414d", accent: "#ff5252", crest: "wolf", eyes: "feral", weapon: "chainblade" },
    { id: "onyx", name: "Onyx", title: "the magma golem", blurb: "Old as mountains. Half as forgiving.",
      color: "#33302e", dark: "#1a1817", accent: "#ff6316", crest: "shards", eyes: "glow", weapon: "gauntlet" },
    { id: "riot", name: "Riot", title: "the paint prophet", blurb: "The city is her canvas. You're the wall.",
      color: "#1f6e62", dark: "#103b34", accent: "#ff3df2", crest: "backcap", eyes: "bandit", weapon: "spraygat" },
    // ---- round 1: the founding cast
    { id: "pip", name: "Pip", title: "the cheerful rookie", blurb: "Wide-eyed, cork-loaded, unreasonably optimistic.",
      color: "#ff9838", dark: "#c96a12", accent: "#7ed957", crest: "sprout", eyes: "wide", weapon: "peashooter" },
    { id: "bolt", name: "Bolt", title: "the livewire", blurb: "Runs on static, excitement, and poor impulse control.",
      color: "#3fa8ff", dark: "#1d6fc0", accent: "#ffe14d", crest: "bolt", eyes: "wink", weapon: "tesla" },
    { id: "mochi", name: "Mochi", title: "the soft menace", blurb: "Looks like dessert. Fights like a landlord.",
      color: "#ffa8c8", dark: "#d76a95", accent: "#fff0f6", crest: "ears", eyes: "smug", weapon: "bubble" },
    { id: "gruff", name: "Gruff", title: "the old guard", blurb: "Has seen every trick. Invented several of them.",
      color: "#647d3f", dark: "#3d4d26", accent: "#c9a86a", crest: "horns", eyes: "stern", weapon: "blunderbuss" },
    { id: "nova", name: "Nova", title: "the star child", blurb: "Speaks softly and carries a small supernova.",
      color: "#8a5cf5", dark: "#5a35b8", accent: "#ffd9fb", crest: "visor", eyes: "calm", weapon: "raygun" },
    { id: "fizz", name: "Fizz", title: "the shaken soda", blurb: "Do not shake. Too late. Way too late.",
      color: "#8fdc3f", dark: "#5aa31d", accent: "#eaffd0", crest: "cap", eyes: "dizzy", weapon: "spray" },
    { id: "ember", name: "Ember", title: "the hothead", blurb: "Every problem looks flammable if you squint.",
      color: "#ff5540", dark: "#b82a1c", accent: "#ffd166", crest: "flame", eyes: "fierce", weapon: "flare" },
    { id: "glacia", name: "Glacia", title: "the cold shoulder", blurb: "Chill until provoked. Then absolute zero.",
      color: "#bfe7ff", dark: "#6fa8cc", accent: "#eaf9ff", crest: "icicles", eyes: "halflid", weapon: "frost" },
    { id: "shade", name: "Shade", title: "the silent bet", blurb: "You won't hear the shot. You'll hear the scoreboard.",
      color: "#4a4a5e", dark: "#26262f", accent: "#8f7bff", crest: "band", eyes: "slit", weapon: "kunai" },
    { id: "duke", name: "Duke", title: "the dueling dandy", blurb: "Duels at dawn, brunch at nine.",
      color: "#f2e2b8", dark: "#c0a35e", accent: "#caa43c", crest: "tophat", eyes: "monocle", weapon: "longrifle" },
    { id: "sprocket", name: "Sprocket", title: "the wind-up wonder", blurb: "Fully wound and warranty-void.",
      color: "#b5642c", dark: "#6e3a14", accent: "#ffd98f", crest: "key", eyes: "led", weapon: "rivet" },
    { id: "luna", name: "Luna", title: "the moth queen", blurb: "Drawn to victory like it's the last lit lamp.",
      color: "#3fc9b0", dark: "#238a77", accent: "#d7c2ff", crest: "antennae", eyes: "glow", weapon: "prism" }
  ];

  // Canonical hero art: assets/images/characters/canonical/<id>.png. Art that
  // still has a solid backdrop baked in is keyed on load as a safety net.
  const images = new Map();
  for (const ch of CHARACTERS) {
    const img = new Image();
    img.onload = () => {
      const chroma = window.ROUNDERS.chroma;
      images.set(ch.id, (chroma && chroma.keyImage(img)) || img);
    };
    img.onerror = () => {};
    img.src = `${window.ROUNDERS_ASSET_BASE || ""}assets/images/characters/canonical/${ch.id}.png`;
  }

  // Composed render parts (body/weapon/arm) + their hand-tweaked rig file.
  if (window.ROUNDERS.rig) {
    window.ROUNDERS.rig.preload(CHARACTERS.map((c) => c.id));
    window.ROUNDERS.rig.loadRigs();
  }

  // Settings toggle: draw everyone with the built-in procedural art instead of
  // the generated sprites, everywhere (arena, HUD, lobby, victory).
  let procedural = false;
  function setProceduralCharacters(on) { procedural = !!on; }

  function hasImage(id) { return images.has(id); }
  function getImage(id) { return images.get(id) || null; }

  // Draws the character centered at (0,0) with body radius r.
  // opts: { t (seconds), aimX, aimY, blink (bool), color (override body color) }
  function drawCharacter(ctx, ch, r, opts = {}) {
    const t = opts.t || 0;
    const aimX = opts.aimX ?? 1;
    const aimY = opts.aimY ?? 0;
    const body = opts.color || ch.color;
    const wob = Math.sin(t * 8.5) * r * 0.04;

    // 1) composed rig (body + aimable weapon + attached arms) when the parts exist
    const rig = window.ROUNDERS.rig;
    if (rig && !procedural && opts.useImage !== false && opts.useRig !== false) {
      if (rig.draw(ctx, ch, r, { aimX, aimY, wob, facing: opts.facing || 0 })) return;
    }

    // 2) single canonical PNG
    const img = images.get(ch.id);
    if (img && !procedural && opts.useImage !== false) {
      const s = r * 2.5;
      const facing = opts.facing ? (opts.facing < 0 ? -1 : 1) : (aimX < 0 ? -1 : 1);
      ctx.save();
      if (facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -s / 2, -s / 2 + wob, s, s);
      ctx.restore();
      return;
    }

    // --- body (weapon and face drawn on top)
    ctx.save();
    ctx.fillStyle = body;
    ctx.strokeStyle = "#1c1a24";
    ctx.lineWidth = Math.max(3, r * 0.16);
    ctx.beginPath();
    ctx.ellipse(0, wob, r * 0.98, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // sheen
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.32, -r * 0.42 + wob, r * 0.32, r * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // belly shade
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.55 + wob, r * 0.62, r * 0.3, 0, 0, Math.PI);
    ctx.fill();

    drawCrest(ctx, ch, r, t, wob);
    drawWeapon(ctx, ch, r, aimX, aimY);
    drawFace(ctx, ch, r, aimX, aimY, wob, opts.blink);
    ctx.restore();
  }

  function drawCrest(ctx, ch, r, t, wob) {
    const a = ch.accent, d = ch.dark;
    ctx.save();
    ctx.translate(0, wob);
    ctx.lineWidth = Math.max(2.5, r * 0.1);
    ctx.strokeStyle = "#1c1a24";
    switch (ch.crest) {
      case "sprout": {
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.95);
        ctx.quadraticCurveTo(r * 0.05, -r * 1.3, r * 0.02, -r * 1.35);
        ctx.stroke();
        ctx.fillStyle = a;
        leaf(ctx, r * 0.02, -r * 1.38, r * 0.34, -0.7); ctx.fill(); ctx.stroke();
        leaf(ctx, r * 0.02, -r * 1.38, r * 0.3, 2.4); ctx.fill(); ctx.stroke();
        break;
      }
      case "bolt": {
        ctx.fillStyle = a;
        ctx.beginPath();
        ctx.moveTo(-r * 0.1, -r * 1.45); ctx.lineTo(r * 0.24, -r * 1.28); ctx.lineTo(r * 0.02, -r * 1.18);
        ctx.lineTo(r * 0.3, -r * 0.9); ctx.lineTo(-r * 0.18, -r * 1.05); ctx.lineTo(0, -r * 1.18);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case "ears": {
        ctx.fillStyle = ch.color;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * r * 0.3, -r * 0.85);
          ctx.lineTo(s * r * 0.72, -r * 1.35);
          ctx.lineTo(s * r * 0.82, -r * 0.72);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = a;
          ctx.beginPath();
          ctx.moveTo(s * r * 0.44, -r * 0.9);
          ctx.lineTo(s * r * 0.66, -r * 1.18);
          ctx.lineTo(s * r * 0.7, -r * 0.82);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = ch.color;
        }
        break;
      }
      case "horns": {
        ctx.fillStyle = a;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * r * 0.45, -r * 0.75);
          ctx.quadraticCurveTo(s * r * 1.2, -r * 1.05, s * r * 1.05, -r * 0.35);
          ctx.quadraticCurveTo(s * r * 0.95, -r * 0.7, s * r * 0.58, -r * 0.52);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case "visor": {
        ctx.fillStyle = "rgba(255,217,251,0.65)";
        star(ctx, 0, -r * 0.28, r * 0.85, r * 0.45, 5, t * 0.4);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = r * 0.05;
        ctx.stroke();
        break;
      }
      case "cap": {
        ctx.fillStyle = "#e8e8e8";
        ctx.beginPath();
        ctx.ellipse(0, -r * 1.02, r * 0.5, r * 0.16, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.dark;
        ctx.fillRect(-r * 0.5, -r * 1.2, r, r * 0.18);
        ctx.strokeRect(-r * 0.5, -r * 1.2, r, r * 0.18);
        // bubbles inside
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        for (let i = 0; i < 4; i += 1) {
          const bx = Math.sin(t * 1.6 + i * 2.1) * r * 0.4;
          const by = ((t * 0.35 + i * 0.27) % 1) * -r * 1.1 + r * 0.6;
          ctx.beginPath(); ctx.arc(bx, by, r * (0.06 + (i % 3) * 0.03), 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case "flame": {
        const f = 1 + Math.sin(t * 11) * 0.08;
        ctx.fillStyle = a;
        ctx.beginPath();
        ctx.moveTo(-r * 0.32, -r * 0.82);
        ctx.quadraticCurveTo(-r * 0.25, -r * 1.5 * f, 0, -r * 1.15);
        ctx.quadraticCurveTo(r * 0.12, -r * 1.65 * f, r * 0.26, -r * 1.05);
        ctx.quadraticCurveTo(r * 0.42, -r * 1.3 * f, r * 0.38, -r * 0.78);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#ff5540";
        ctx.beginPath();
        ctx.moveTo(-r * 0.12, -r * 0.85);
        ctx.quadraticCurveTo(-r * 0.05, -r * 1.25 * f, r * 0.1, -r * 0.85);
        ctx.closePath(); ctx.fill();
        break;
      }
      case "icicles": {
        ctx.fillStyle = "#eaf9ff";
        for (const [sx, h] of [[-0.5, 0.35], [-0.2, 0.55], [0.12, 0.42], [0.42, 0.3]]) {
          ctx.beginPath();
          ctx.moveTo(sx * r - r * 0.12, -r * 0.85);
          ctx.lineTo(sx * r, -r * (0.85 + h));
          ctx.lineTo(sx * r + r * 0.12, -r * 0.85);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case "band": {
        ctx.fillStyle = ch.dark;
        ctx.fillRect(-r * 0.95, -r * 0.55, r * 1.9, r * 0.26);
        ctx.strokeRect(-r * 0.95, -r * 0.55, r * 1.9, r * 0.26);
        // tails
        ctx.fillStyle = ch.dark;
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, -r * 0.45);
        ctx.quadraticCurveTo(-r * 1.5, -r * 0.2 + Math.sin(t * 4) * r * 0.1, -r * 1.35, r * 0.15);
        ctx.lineTo(-r * 1.1, -r * 0.05);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case "tophat": {
        ctx.fillStyle = "#26262f";
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.92, r * 0.62, r * 0.14, -0.06, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillRect(-r * 0.38, -r * 1.5, r * 0.76, r * 0.6);
        ctx.strokeRect(-r * 0.38, -r * 1.5, r * 0.76, r * 0.6);
        ctx.fillStyle = ch.accent;
        ctx.fillRect(-r * 0.38, -r * 1.06, r * 0.76, r * 0.14);
        break;
      }
      case "key": {
        ctx.save();
        ctx.translate(0, -r * 1.25);
        ctx.rotate(t * 2.2);
        ctx.strokeStyle = "#1c1a24";
        ctx.fillStyle = a;
        ctx.fillRect(-r * 0.08, -r * 0.05, r * 0.16, r * 0.45);
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(s * r * 0.28, 0, r * 0.24, r * 0.13, 0, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
        ctx.restore();
        ctx.beginPath(); ctx.moveTo(0, -r * 0.85); ctx.lineTo(0, -r * 1.1); ctx.stroke();
        break;
      }
      case "mohawk": {
        ctx.fillStyle = a;
        for (let i = -2; i <= 2; i += 1) {
          const hgt = (1 - Math.abs(i) * 0.22) * r * 0.62;
          ctx.beginPath();
          ctx.moveTo(i * r * 0.22 - r * 0.11, -r * 0.85 + Math.abs(i) * r * 0.1);
          ctx.lineTo(i * r * 0.22 + r * 0.03, -r * 0.85 - hgt);
          ctx.lineTo(i * r * 0.22 + r * 0.14, -r * 0.82 + Math.abs(i) * r * 0.1);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case "plate": {
        ctx.fillStyle = "#c96a2e";
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.62, r * 0.72, r * 0.42, 0, Math.PI, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#1c1a24";
        for (const rx of [-0.45, 0, 0.45]) {
          ctx.beginPath(); ctx.arc(rx * r, -r * 0.72, r * 0.05, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case "glitch": {
        for (const [gx, gy, gw, gh, col] of [
          [-0.7, -1.05, 0.3, 0.1, a], [0.35, -1.2, 0.35, 0.09, "#ff2ea8"],
          [-0.2, -1.28, 0.28, 0.08, a], [0.65, -0.9, 0.24, 0.08, "#ff2ea8"]
        ]) {
          ctx.fillStyle = col;
          ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(t * 7 + gx * 9));
          ctx.fillRect(gx * r, gy * r, gw * r, gh * r);
        }
        ctx.globalAlpha = 1;
        break;
      }
      case "spikes": {
        ctx.fillStyle = "#c9ccd4";
        for (const sx of [-0.55, -0.18, 0.18, 0.55]) {
          ctx.beginPath();
          ctx.moveTo(sx * r - r * 0.09, -r * (0.86 - Math.abs(sx) * 0.16));
          ctx.lineTo(sx * r, -r * (1.18 - Math.abs(sx) * 0.2));
          ctx.lineTo(sx * r + r * 0.09, -r * (0.84 - Math.abs(sx) * 0.16));
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case "hood": {
        ctx.fillStyle = d;
        ctx.beginPath();
        ctx.moveTo(-r * 0.95, r * 0.12);
        ctx.quadraticCurveTo(-r * 1.05, -r * 1.15, 0, -r * 1.18);
        ctx.quadraticCurveTo(r * 1.05, -r * 1.15, r * 0.95, r * 0.12);
        ctx.quadraticCurveTo(r * 0.55, -r * 0.25, 0, -r * 0.28);
        ctx.quadraticCurveTo(-r * 0.55, -r * 0.25, -r * 0.95, r * 0.12);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // star specks on the hood
        ctx.fillStyle = a;
        for (const [px, py] of [[-0.55, -0.72], [0.4, -0.9], [0.68, -0.5], [-0.25, -1.0]]) {
          ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 2 + px * 7));
          ctx.fillRect(px * r, py * r, r * 0.05, r * 0.05);
        }
        ctx.globalAlpha = 1;
        break;
      }
      case "topknot": {
        ctx.fillStyle = "#14121c";
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.86, r * 0.52, r * 0.24, 0, Math.PI, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, -r * 1.22, r * 0.19, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = a;
        ctx.lineWidth = Math.max(2.5, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(-r * 0.2, -r * 1.0); ctx.lineTo(r * 0.2, -r * 1.0);
        ctx.stroke();
        break;
      }
      case "fuse": {
        ctx.strokeStyle = "#1c1a24";
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.9);
        ctx.quadraticCurveTo(r * 0.18, -r * 1.2, r * 0.05, -r * 1.34);
        ctx.stroke();
        const spark = 0.7 + Math.sin(t * 16) * 0.3;
        ctx.fillStyle = a;
        ctx.beginPath(); ctx.arc(r * 0.05, -r * 1.38, r * 0.1 * spark, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(r * 0.05, -r * 1.38, r * 0.045 * spark, 0, Math.PI * 2); ctx.fill();
        // hazard band high on the brow, clear of the eyes
        ctx.save();
        ctx.beginPath();
        ctx.rect(-r * 0.9, -r * 0.72, r * 1.8, r * 0.2);
        ctx.clip();
        for (let i = -6; i < 6; i += 1) {
          ctx.fillStyle = i % 2 ? "#1c1a24" : a;
          ctx.beginPath();
          ctx.moveTo(i * r * 0.22, -r * 0.72); ctx.lineTo((i + 1) * r * 0.22, -r * 0.72);
          ctx.lineTo(i * r * 0.22 + r * 0.09, -r * 0.52); ctx.lineTo(i * r * 0.22 - r * 0.13, -r * 0.52);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = "#1c1a24";
        ctx.lineWidth = Math.max(1.5, r * 0.05);
        ctx.strokeRect(-r * 0.9, -r * 0.72, r * 1.8, r * 0.2);
        break;
      }
      case "wisps": {
        ctx.fillStyle = ch.color;
        for (const [wx, ph] of [[-0.55, 0], [-0.1, 2], [0.4, 4]]) {
          const sway = Math.sin(t * 3 + ph) * r * 0.08;
          ctx.globalAlpha = 0.75;
          ctx.beginPath();
          ctx.moveTo(wx * r - r * 0.14, -r * 0.82);
          ctx.quadraticCurveTo(wx * r + sway, -r * 1.35, wx * r + sway * 2, -r * 1.5);
          ctx.quadraticCurveTo(wx * r + r * 0.14 + sway, -r * 1.2, wx * r + r * 0.16, -r * 0.8);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case "arcs": {
        ctx.fillStyle = a;
        for (const sd of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(sd * r * 0.3, -r * 0.8);
          ctx.lineTo(sd * r * 0.72, -r * 1.22);
          ctx.lineTo(sd * r * 0.5, -r * 1.05);
          ctx.lineTo(sd * r * 0.85, -r * 1.42);
          ctx.lineTo(sd * r * 0.42, -r * 1.02);
          ctx.lineTo(sd * r * 0.58, -r * 1.16);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case "wolf": {
        ctx.fillStyle = ch.color;
        for (const sd of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(sd * r * 0.26, -r * 0.82);
          ctx.lineTo(sd * r * 0.78, -r * 1.42);
          ctx.lineTo(sd * r * 0.88, -r * 0.68);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          // battle notch
          ctx.fillStyle = "#1c1a24";
          ctx.beginPath();
          ctx.moveTo(sd * r * 0.8, -r * 1.06);
          ctx.lineTo(sd * r * 0.92, -r * 1.0);
          ctx.lineTo(sd * r * 0.84, -r * 0.94);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = ch.dark;
          ctx.beginPath();
          ctx.moveTo(sd * r * 0.42, -r * 0.86);
          ctx.lineTo(sd * r * 0.72, -r * 1.22);
          ctx.lineTo(sd * r * 0.78, -r * 0.78);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = ch.color;
        }
        break;
      }
      case "shards": {
        // jagged rock crown
        ctx.fillStyle = "#6b6460";
        for (const [sx, h] of [[-0.5, 0.4], [-0.15, 0.62], [0.22, 0.5], [0.55, 0.32]]) {
          ctx.beginPath();
          ctx.moveTo(sx * r - r * 0.13, -r * 0.8);
          ctx.lineTo(sx * r + r * 0.02, -r * (0.8 + h));
          ctx.lineTo(sx * r + r * 0.15, -r * 0.78);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        // magma cracks across the body
        ctx.strokeStyle = a;
        ctx.lineWidth = Math.max(1.5, r * 0.05);
        ctx.globalAlpha = 0.65 + 0.35 * Math.abs(Math.sin(t * 1.8));
        ctx.beginPath();
        ctx.moveTo(-r * 0.62, -r * 0.1);
        ctx.lineTo(-r * 0.3, r * 0.08); ctx.lineTo(-r * 0.42, r * 0.42);
        ctx.moveTo(r * 0.3, -r * 0.4);
        ctx.lineTo(r * 0.5, -r * 0.12); ctx.lineTo(r * 0.34, r * 0.2); ctx.lineTo(r * 0.58, r * 0.44);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case "backcap": {
        ctx.fillStyle = d;
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.78, r * 0.62, r * 0.38, 0, Math.PI, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // backwards brim
        ctx.fillStyle = d;
        ctx.beginPath();
        ctx.roundRect(-r * 0.98, -r * 0.86, r * 0.42, r * 0.16, r * 0.06);
        ctx.fill(); ctx.stroke();
        // paint splats on the cap
        ctx.fillStyle = a;
        ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.92, r * 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3dff9e";
        ctx.beginPath(); ctx.arc(r * 0.22, -r * 0.86, r * 0.055, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case "antennae": {
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * r * 0.2, -r * 0.9);
          ctx.quadraticCurveTo(s * r * 0.55, -r * 1.5, s * r * 0.85, -r * 1.35 + Math.sin(t * 3 + s) * r * 0.06);
          ctx.stroke();
          ctx.fillStyle = a;
          ctx.beginPath();
          ctx.arc(s * r * 0.85, -r * 1.35 + Math.sin(t * 3 + s) * r * 0.06, r * 0.12, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
        // small wings
        ctx.fillStyle = "rgba(215,194,255,0.55)";
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(s * r * 0.9, -r * 0.1, r * 0.42, r * 0.72, s * (0.5 + Math.sin(t * 9) * 0.12), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }
    ctx.restore();
  }

  function drawFace(ctx, ch, r, aimX, aimY, wob, blink) {
    const fx = aimX * r * 0.16, fy = aimY * r * 0.14 + wob;
    ctx.save();
    ctx.translate(fx, fy);
    const eye = (x, open = 1, w = r * 0.18) => {
      ctx.fillStyle = "#1c1a24";
      ctx.beginPath();
      ctx.ellipse(x, -r * 0.22, w * 0.5, Math.max(r * 0.02, r * 0.24 * open * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
      if (open > 0.4) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x + w * 0.12, -r * 0.28, r * 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const b = blink ? 0.08 : 1;
    switch (ch.eyes) {
      case "wide": eye(-r * 0.3, b, r * 0.24); eye(r * 0.3, b, r * 0.24); smile(ctx, r, 0.5); break;
      case "wink": eye(-r * 0.3, b); eye(r * 0.3, 0.12); smile(ctx, r, 0.6); break;
      case "smug": eye(-r * 0.3, b * 0.55); eye(r * 0.3, b * 0.55); smile(ctx, r, 0.35, r * 0.14); break;
      case "stern": brow(ctx, -r * 0.3, r, 0.24); brow(ctx, r * 0.3, r, -0.24); eye(-r * 0.3, b * 0.7); eye(r * 0.3, b * 0.7); frown(ctx, r); break;
      case "calm": eye(-r * 0.3, b * 0.8); eye(r * 0.3, b * 0.8); smile(ctx, r, 0.4); break;
      case "dizzy": spiralEye(ctx, -r * 0.3, r); spiralEye(ctx, r * 0.3, r); smile(ctx, r, 0.7); break;
      case "fierce": brow(ctx, -r * 0.3, r, 0.35); brow(ctx, r * 0.3, r, -0.35); eye(-r * 0.3, b); eye(r * 0.3, b); grin(ctx, r); break;
      case "halflid": eye(-r * 0.3, b * 0.5); eye(r * 0.3, b * 0.5); flat(ctx, r); break;
      case "slit": {
        ctx.fillStyle = ch.accent;
        ctx.beginPath();
        ctx.ellipse(-r * 0.28, -r * 0.22, r * 0.16, r * 0.05, 0, 0, Math.PI * 2);
        ctx.ellipse(r * 0.28, -r * 0.22, r * 0.16, r * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "monocle": {
        eye(-r * 0.3, b * 0.8); eye(r * 0.3, b);
        ctx.strokeStyle = "#caa43c";
        ctx.lineWidth = r * 0.06;
        ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.22, r * 0.24, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.1); ctx.lineTo(r * 0.56, r * 0.2); ctx.stroke();
        mustache(ctx, r); break;
      }
      case "led": {
        ctx.fillStyle = ch.accent;
        ctx.fillRect(-r * 0.42, -r * 0.34, r * 0.26, r * 0.22);
        ctx.fillRect(r * 0.16, -r * 0.34, r * 0.26, r * 0.22);
        ctx.strokeStyle = "#1c1a24"; ctx.lineWidth = r * 0.05;
        ctx.strokeRect(-r * 0.42, -r * 0.34, r * 0.26, r * 0.22);
        ctx.strokeRect(r * 0.16, -r * 0.34, r * 0.26, r * 0.22);
        smile(ctx, r, 0.45); break;
      }
      case "glow": {
        ctx.fillStyle = ch.accent;
        ctx.shadowColor = ch.accent; ctx.shadowBlur = r * 0.3;
        ctx.beginPath();
        ctx.arc(-r * 0.28, -r * 0.22, r * 0.11 * b + r * 0.01, 0, Math.PI * 2);
        ctx.arc(r * 0.28, -r * 0.22, r * 0.11 * b + r * 0.01, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        smile(ctx, r, 0.4); break;
      }
      case "xeye": {
        eye(-r * 0.3, b);
        ctx.strokeStyle = "#f2e2c9";
        ctx.lineWidth = Math.max(2, r * 0.09);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(r * 0.18, -r * 0.34); ctx.lineTo(r * 0.42, -r * 0.1);
        ctx.moveTo(r * 0.42, -r * 0.34); ctx.lineTo(r * 0.18, -r * 0.1);
        ctx.stroke();
        flat(ctx, r);
        break;
      }
      case "patch": {
        eye(-r * 0.3, b);
        ctx.fillStyle = "#14121c";
        ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.22, r * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#14121c";
        ctx.lineWidth = Math.max(2, r * 0.07);
        ctx.beginPath();
        ctx.moveTo(r * 0.12, -r * 0.38); ctx.lineTo(r * 0.62, -r * 0.55);
        ctx.moveTo(r * 0.46, -r * 0.1); ctx.lineTo(r * 0.72, r * 0.05);
        ctx.stroke();
        flat(ctx, r);
        break;
      }
      case "pixel": {
        ctx.fillStyle = ch.accent;
        ctx.fillRect(-r * 0.4, -r * 0.32, r * 0.2, r * 0.2);
        ctx.fillRect(r * 0.2, -r * 0.32, r * 0.2, r * 0.2);
        ctx.fillStyle = "#ff2ea8";
        ctx.fillRect(-r * 0.44, -r * 0.36, r * 0.08, r * 0.08);
        ctx.fillRect(r * 0.36, -r * 0.16, r * 0.08, r * 0.08);
        ctx.strokeStyle = ch.accent;
        ctx.lineWidth = Math.max(2, r * 0.07);
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(-r * 0.24, r * 0.24);
        ctx.lineTo(-r * 0.1, r * 0.14); ctx.lineTo(r * 0.04, r * 0.26); ctx.lineTo(r * 0.18, r * 0.14);
        ctx.stroke();
        break;
      }
      case "goggles": {
        // goggles worn over the eyes: amber lenses with a strap
        ctx.strokeStyle = "#14121c";
        ctx.lineWidth = Math.max(2.5, r * 0.09);
        ctx.beginPath(); ctx.moveTo(-r * 0.85, -r * 0.22); ctx.lineTo(r * 0.85, -r * 0.22); ctx.stroke();
        for (const sd of [-1, 1]) {
          ctx.fillStyle = "#14121c";
          ctx.beginPath(); ctx.arc(sd * r * 0.3, -r * 0.22, r * 0.24, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#e8b23d";
          ctx.beginPath(); ctx.arc(sd * r * 0.3, -r * 0.22, r * 0.18, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.65)";
          ctx.beginPath(); ctx.arc(sd * r * 0.3 - r * 0.06, -r * 0.28, r * 0.06, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = "#f2e2c9";
        ctx.lineWidth = Math.max(2, r * 0.07);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-r * 0.14, r * 0.26); ctx.lineTo(r * 0.14, r * 0.26);
        ctx.stroke();
        break;
      }
      case "scar": {
        brow(ctx, -r * 0.3, r, 0.2); brow(ctx, r * 0.3, r, -0.2);
        eye(-r * 0.3, b * 0.75); eye(r * 0.3, b * 0.75);
        ctx.strokeStyle = "#f2e2c9";
        ctx.lineWidth = Math.max(1.5, r * 0.05);
        ctx.beginPath();
        ctx.moveTo(r * 0.14, -r * 0.5); ctx.lineTo(r * 0.46, r * 0.02);
        ctx.moveTo(r * 0.18, -r * 0.32); ctx.lineTo(r * 0.34, -r * 0.38);
        ctx.moveTo(r * 0.28, -r * 0.14); ctx.lineTo(r * 0.44, -r * 0.2);
        ctx.stroke();
        flat(ctx, r);
        break;
      }
      case "manic": {
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.18, r * 0.19, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.16, r * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#14121c";
        ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.16, r * 0.08 * b + r * 0.01, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.32, -r * 0.15, r * 0.05 * b + r * 0.01, 0, Math.PI * 2); ctx.fill();
        grin(ctx, r);
        break;
      }
      case "hollow": {
        ctx.fillStyle = "#14121c";
        ctx.beginPath();
        ctx.ellipse(-r * 0.28, -r * 0.2, r * 0.13, r * 0.17 * b + r * 0.01, 0, 0, Math.PI * 2);
        ctx.ellipse(r * 0.28, -r * 0.2, r * 0.13, r * 0.17 * b + r * 0.01, 0, 0, Math.PI * 2);
        ctx.fill();
        // spectral drip from one socket
        ctx.fillStyle = ch.accent;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(-r * 0.31, -r * 0.06, r * 0.06, r * 0.22);
        ctx.globalAlpha = 1;
        flat(ctx, r);
        break;
      }
      case "feral": {
        ctx.fillStyle = ch.accent;
        for (const sd of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(sd * r * 0.14, -r * 0.2);
          ctx.lineTo(sd * r * 0.46, -r * 0.36);
          ctx.lineTo(sd * r * 0.44, -r * 0.16);
          ctx.closePath(); ctx.fill();
        }
        flat(ctx, r);
        // one visible fang
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(-r * 0.1, r * 0.24); ctx.lineTo(-r * 0.03, r * 0.42); ctx.lineTo(r * 0.04, r * 0.24);
        ctx.closePath(); ctx.fill();
        break;
      }
      case "bandit": {
        brow(ctx, -r * 0.3, r, 0.24); brow(ctx, r * 0.3, r, -0.24);
        eye(-r * 0.3, b); eye(r * 0.3, b);
        // paint-splattered bandana over the mouth
        ctx.fillStyle = ch.dark;
        ctx.beginPath();
        ctx.moveTo(-r * 0.75, r * 0.02);
        ctx.quadraticCurveTo(0, r * 0.28, r * 0.75, r * 0.02);
        ctx.lineTo(r * 0.62, r * 0.55);
        ctx.quadraticCurveTo(0, r * 0.78, -r * 0.62, r * 0.55);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#1c1a24";
        ctx.lineWidth = Math.max(1.5, r * 0.05);
        ctx.stroke();
        ctx.fillStyle = ch.accent;
        ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.34, r * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3dff9e";
        ctx.beginPath(); ctx.arc(r * 0.18, r * 0.42, r * 0.05, 0, Math.PI * 2); ctx.fill();
        break;
      }
      default: eye(-r * 0.3, b); eye(r * 0.3, b); smile(ctx, r, 0.5);
    }
    ctx.restore();
  }

  function smile(ctx, r, k, offset = 0) {
    ctx.strokeStyle = "#1c1a24";
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(offset, r * 0.1, r * 0.3, Math.PI * (0.5 - k / 2), Math.PI * (0.5 + k / 2));
    ctx.stroke();
  }
  function frown(ctx, r) {
    ctx.strokeStyle = "#1c1a24"; ctx.lineWidth = Math.max(2, r * 0.08); ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, r * 0.45, r * 0.28, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke();
  }
  function flat(ctx, r) {
    ctx.strokeStyle = "#1c1a24"; ctx.lineWidth = Math.max(2, r * 0.08); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-r * 0.14, r * 0.24); ctx.lineTo(r * 0.14, r * 0.24); ctx.stroke();
  }
  function grin(ctx, r) {
    ctx.fillStyle = "#1c1a24";
    ctx.beginPath(); ctx.arc(0, r * 0.14, r * 0.26, 0.15, Math.PI - 0.15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-r * 0.18, r * 0.16, r * 0.12, r * 0.08);
  }
  function brow(ctx, x, r, tilt) {
    ctx.strokeStyle = "#1c1a24"; ctx.lineWidth = Math.max(2.5, r * 0.09); ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - r * 0.16, -r * 0.42 - tilt * r * 0.12);
    ctx.lineTo(x + r * 0.16, -r * 0.42 + tilt * r * 0.12);
    ctx.stroke();
  }
  function mustache(ctx, r) {
    ctx.strokeStyle = "#8a6a30"; ctx.lineWidth = r * 0.07; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, r * 0.08); ctx.quadraticCurveTo(-r * 0.2, r * 0.14, -r * 0.34, r * 0.02);
    ctx.moveTo(0, r * 0.08); ctx.quadraticCurveTo(r * 0.2, r * 0.14, r * 0.34, r * 0.02);
    ctx.stroke();
  }
  function spiralEye(ctx, x, r) {
    ctx.strokeStyle = "#1c1a24"; ctx.lineWidth = Math.max(2, r * 0.06);
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 4; a += 0.3) {
      const rr = (a / (Math.PI * 4)) * r * 0.16;
      const px = x + Math.cos(a) * rr, py = -r * 0.22 + Math.sin(a) * rr;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  function leaf(ctx, x, y, size, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.6, -size * 0.5, size, 0);
    ctx.quadraticCurveTo(size * 0.6, size * 0.5, 0, 0);
    ctx.restore();
  }
  function star(ctx, x, y, ro, ri, points, rot = 0) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i += 1) {
      const rr = i % 2 === 0 ? ro : ri;
      const a = rot + (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // Weapon sticks out toward aim. Drawn rotated; base at body edge.
  function drawWeapon(ctx, ch, r, aimX, aimY) {
    const angle = Math.atan2(aimY, aimX);
    ctx.save();
    ctx.rotate(angle);
    if (aimX < 0) ctx.scale(1, -1); // keep asymmetric weapons upright when aiming left
    ctx.translate(r * 0.55, 0);
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.strokeStyle = "#1c1a24";
    const L = r * 1.5; // barrel length
    switch (ch.weapon) {
      case "scythe": {
        ctx.fillStyle = "#2b2333";
        rr(ctx, 0, -r * 0.08, L * 0.72, r * 0.16, r * 0.05); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.accent;
        ctx.beginPath();
        ctx.moveTo(L * 0.68, -r * 0.05);
        ctx.quadraticCurveTo(L * 1.06, -r * 0.1, L * 0.98, r * 0.62);
        ctx.quadraticCurveTo(L * 1.0, r * 0.05, L * 0.66, r * 0.12);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case "sawnoff": {
        ctx.fillStyle = "#3d3e42";
        rr(ctx, 0, -r * 0.2, L * 0.58, r * 0.18, r * 0.07); ctx.fill(); ctx.stroke();
        rr(ctx, 0, 0.02 * r, L * 0.58, r * 0.18, r * 0.07); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#6e4a2a";
        rr(ctx, -L * 0.1, -r * 0.14, L * 0.16, r * 0.3, r * 0.06); ctx.fill(); ctx.stroke();
        break;
      }
      case "glitchgun": {
        for (const [ox, oy, w2, col] of [[0, -0.14, 0.5, "#2b3140"], [0.1, -0.02, 0.62, ch.accent], [0.04, 0.08, 0.45, "#ff2ea8"]]) {
          ctx.fillStyle = col;
          rr(ctx, L * ox, oy * r - r * 0.05, L * w2, r * 0.12, r * 0.03); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case "flamer": {
        ctx.fillStyle = "#57493f";
        rr(ctx, 0, -r * 0.14, L * 0.55, r * 0.28, r * 0.07); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#8f959e";
        ctx.beginPath();
        ctx.moveTo(L * 0.55, -r * 0.2); ctx.lineTo(L * 0.78, -r * 0.26); ctx.lineTo(L * 0.78, r * 0.26); ctx.lineTo(L * 0.55, r * 0.2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.accent;
        ctx.beginPath();
        ctx.moveTo(L * 0.8, -r * 0.12);
        ctx.quadraticCurveTo(L * 1.02, 0, L * 0.8, r * 0.12);
        ctx.quadraticCurveTo(L * 0.92, 0, L * 0.8, -r * 0.12);
        ctx.closePath(); ctx.fill();
        break;
      }
      case "twindagger": {
        ctx.fillStyle = "#2a2340";
        rr(ctx, 0, -r * 0.16, L * 0.45, r * 0.32, r * 0.06); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#d8d2f0";
        for (const dy of [-0.11, 0.11]) {
          ctx.beginPath();
          ctx.moveTo(L * 0.44, dy * r - r * 0.05);
          ctx.lineTo(L * (dy < 0 ? 0.95 : 0.8), dy * r);
          ctx.lineTo(L * 0.44, dy * r + r * 0.05);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case "katana": {
        ctx.fillStyle = "#1c1a24";
        rr(ctx, 0, -r * 0.06, L * 0.22, r * 0.12, r * 0.03); ctx.fill();
        ctx.strokeStyle = ch.accent;
        ctx.lineWidth = Math.max(1.5, r * 0.05);
        for (const wx of [0.05, 0.12, 0.19]) {
          ctx.beginPath(); ctx.moveTo(L * wx, -r * 0.06); ctx.lineTo(L * (wx + 0.03), r * 0.06); ctx.stroke();
        }
        ctx.strokeStyle = "#1c1a24";
        ctx.lineWidth = Math.max(2, r * 0.08);
        ctx.fillStyle = "#8f8a75";
        ctx.beginPath(); ctx.ellipse(L * 0.25, 0, r * 0.06, r * 0.16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#e8e4f2";
        ctx.beginPath();
        ctx.moveTo(L * 0.28, -r * 0.13);
        ctx.lineTo(L * 1.06, -r * 0.15);
        ctx.lineTo(L * 1.16, -r * 0.02);
        ctx.lineTo(L * 0.28, r * 0.09);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = Math.max(1.5, r * 0.045);
        ctx.beginPath();
        ctx.moveTo(L * 0.32, -r * 0.02); ctx.lineTo(L * 1.08, -r * 0.05);
        ctx.stroke();
        break;
      }
      case "launcher": {
        ctx.fillStyle = "#4a4f37";
        rr(ctx, 0, -r * 0.22, L * 0.7, r * 0.44, r * 0.14); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#1c1a24";
        ctx.beginPath(); ctx.arc(L * 0.72, 0, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.accent;
        ctx.beginPath(); ctx.arc(L * 0.72, 0, r * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#33381c";
        ctx.beginPath(); ctx.arc(L * 0.28, r * 0.3, r * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        break;
      }
      case "spectral": {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#8fa398";
        rr(ctx, 0, -r * 0.1, L * 0.95, r * 0.2, r * 0.08); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.accent;
        ctx.globalAlpha = 0.9;
        rr(ctx, L * 0.2, -r * 0.04, L * 0.6, r * 0.08, r * 0.04); ctx.fill();
        ctx.beginPath(); ctx.arc(L * 0.98, 0, r * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        break;
      }
      case "coilgun": {
        ctx.fillStyle = "#33333f";
        rr(ctx, 0, -r * 0.09, L * 0.85, r * 0.18, r * 0.05); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.accent;
        for (const wx of [0.25, 0.45, 0.65]) {
          rr(ctx, L * wx, -r * 0.17, L * 0.07, r * 0.34, r * 0.03); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(L * 0.9, 0, r * 0.07, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case "chainblade": {
        ctx.fillStyle = "#3d4752";
        rr(ctx, 0, -r * 0.12, L * 0.5, r * 0.24, r * 0.06); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#c9ccd4";
        ctx.beginPath();
        ctx.moveTo(L * 0.5, -r * 0.12); ctx.lineTo(L * 0.95, 0); ctx.lineTo(L * 0.5, r * 0.12);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#8f959e";
        ctx.lineWidth = Math.max(1.5, r * 0.05);
        for (let i = 0; i < 4; i += 1) {
          ctx.beginPath();
          ctx.arc(L * (0.15 + i * 0.14), r * (0.3 + Math.sin(i * 1.8) * 0.06), r * 0.06, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case "gauntlet": {
        ctx.fillStyle = "#4a4542";
        rr(ctx, 0, -r * 0.2, L * 0.42, r * 0.4, r * 0.1); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#5c5652";
        rr(ctx, L * 0.4, -r * 0.28, L * 0.42, r * 0.56, r * 0.16); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.accent;
        for (const dy of [-0.16, 0, 0.16]) {
          ctx.beginPath(); ctx.arc(L * 0.78, dy * r, r * 0.055, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case "spraygat": {
        ctx.fillStyle = "#2c3b3a";
        rr(ctx, 0, -r * 0.18, L * 0.45, r * 0.36, r * 0.1); ctx.fill(); ctx.stroke();
        for (const [dy, col] of [[-0.14, ch.accent], [0, "#3dff9e"], [0.14, "#29b6ff"]]) {
          ctx.fillStyle = "#c9ccd4";
          rr(ctx, L * 0.45, dy * r - r * 0.05, L * 0.34, r * 0.1, r * 0.04); ctx.fill(); ctx.stroke();
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(L * 0.82, dy * r, r * 0.05, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case "peashooter": {
        ctx.fillStyle = "#a0713d";
        rr(ctx, 0, -r * 0.16, L * 0.8, r * 0.32, r * 0.12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#7ed957"; // cork
        ctx.beginPath(); ctx.arc(L * 0.82, 0, r * 0.17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        break;
      }
      case "tesla": {
        ctx.fillStyle = "#2b6fb0";
        rr(ctx, 0, -r * 0.14, L * 0.62, r * 0.28, r * 0.08); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.accent;
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath(); ctx.arc(L * (0.3 + i * 0.2), 0, r * (0.2 - i * 0.03), 0, Math.PI * 2);
          ctx.globalAlpha = 0.9 - i * 0.25; ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case "bubble": {
        ctx.fillStyle = "#e07ba5";
        rr(ctx, 0, -r * 0.18, L * 0.55, r * 0.36, r * 0.16); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.beginPath(); ctx.arc(L * 0.68, 0, r * 0.24, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.stroke();
        break;
      }
      case "blunderbuss": {
        ctx.fillStyle = "#8f6a3a";
        rr(ctx, 0, -r * 0.14, L * 0.5, r * 0.28, r * 0.08); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#c9a86a";
        ctx.beginPath();
        ctx.moveTo(L * 0.5, -r * 0.14);
        ctx.lineTo(L * 0.95, -r * 0.34);
        ctx.lineTo(L * 0.95, r * 0.34);
        ctx.lineTo(L * 0.5, r * 0.14);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case "raygun": {
        ctx.fillStyle = "#d8d8e8";
        rr(ctx, 0, -r * 0.13, L * 0.75, r * 0.26, r * 0.13); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.accent;
        for (const fx of [0.25, 0.5]) {
          ctx.beginPath(); ctx.ellipse(L * fx, 0, r * 0.06, r * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = "#ff5b8d";
        ctx.beginPath(); ctx.arc(L * 0.8, 0, r * 0.14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        break;
      }
      case "spray": {
        ctx.fillStyle = "#5aa31d";
        rr(ctx, 0, -r * 0.2, L * 0.45, r * 0.4, r * 0.1); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#eaffd0";
        rr(ctx, L * 0.45, -r * 0.1, L * 0.4, r * 0.2, r * 0.08); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(L * 0.2, -r * 0.2); ctx.lineTo(L * 0.2, -r * 0.45); ctx.stroke(); // pump
        break;
      }
      case "flare": {
        ctx.fillStyle = "#b82a1c";
        rr(ctx, 0, -r * 0.18, L * 0.55, r * 0.36, r * 0.1); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.accent;
        ctx.beginPath(); ctx.arc(L * 0.62, 0, r * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        break;
      }
      case "frost": {
        ctx.fillStyle = "#9fd4ef";
        rr(ctx, 0, -r * 0.12, L * 0.62, r * 0.24, r * 0.06); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#eaf9ff";
        for (const [dy, len] of [[-0.16, 0.22], [0, 0.36], [0.16, 0.22]]) {
          ctx.beginPath();
          ctx.moveTo(L * 0.6, dy * r - r * 0.07);
          ctx.lineTo(L * (0.62 + len), dy * r);
          ctx.lineTo(L * 0.6, dy * r + r * 0.07);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case "kunai": {
        ctx.fillStyle = "#33333f";
        rr(ctx, 0, -r * 0.12, L * 0.5, r * 0.24, r * 0.05); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#b9b9cc";
        ctx.beginPath();
        ctx.moveTo(L * 0.5, -r * 0.1); ctx.lineTo(L * 0.92, 0); ctx.lineTo(L * 0.5, r * 0.1);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case "longrifle": {
        ctx.fillStyle = "#f5efdc";
        rr(ctx, 0, -r * 0.1, L * 1.05, r * 0.2, r * 0.06); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ch.accent;
        rr(ctx, L * 0.15, -r * 0.13, L * 0.16, r * 0.26, r * 0.04); ctx.fill(); ctx.stroke();
        break;
      }
      case "rivet": {
        ctx.fillStyle = "#7a7a85";
        rr(ctx, 0, -r * 0.2, L * 0.6, r * 0.4, r * 0.08); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#ffd98f";
        for (const fy of [-0.12, 0.12]) {
          ctx.beginPath(); ctx.arc(L * 0.3, fy * r, r * 0.05, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = "#5b5b66";
        rr(ctx, L * 0.6, -r * 0.12, L * 0.28, r * 0.24, r * 0.05); ctx.fill(); ctx.stroke();
        break;
      }
      case "prism": {
        ctx.fillStyle = "#8a63d2";
        rr(ctx, 0, -r * 0.1, L * 0.5, r * 0.2, r * 0.06); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(215,194,255,0.9)";
        ctx.beginPath();
        ctx.moveTo(L * 0.5, 0); ctx.lineTo(L * 0.72, -r * 0.3); ctx.lineTo(L * 0.94, 0); ctx.lineTo(L * 0.72, r * 0.3);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = Math.max(1.5, r * 0.04);
        ctx.beginPath();
        ctx.moveTo(L * 0.72, -r * 0.3); ctx.lineTo(L * 0.72, r * 0.3);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  function rr(ctx, x, y, w, h, rad) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, rad);
  }

  // Juggernaut's shell. Drawn BEHIND the fighter and a little wider than they
  // are, so it reads as their outline thickening into studded iron rather than
  // as a separate object hovering around them. Stacks add plate and rivets.
  function drawIronHull(ctx, r, stacks = 1, t = 0) {
    const n = Math.max(1, stacks);
    const outer = r * (1.2 + 0.05 * (n - 1));
    const inner = r * 0.98;
    ctx.save();
    // the ring itself, lit from above like rolled steel
    const g = ctx.createLinearGradient(0, -outer, 0, outer);
    g.addColorStop(0, "#9aa3b4");
    g.addColorStop(0.35, "#5d6675");
    g.addColorStop(0.62, "#3b4250");
    g.addColorStop(1, "#22262f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, outer, 0, Math.PI * 2);
    ctx.arc(0, 0, inner, 0, Math.PI * 2, true);   // even-odd leaves a band
    ctx.fill("evenodd");
    // a bright top edge and a dark seam, so the band has thickness
    ctx.strokeStyle = "rgba(226,234,246,0.55)";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, outer - 0.8, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    ctx.strokeStyle = "rgba(10,12,16,0.75)";
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, outer, 0, Math.PI * 2); ctx.stroke();
    // rivets, marching slowly round the rim
    const studs = 10 + (n - 1) * 4;
    const rr = (outer + inner) / 2;
    const spin = t * 0.35;
    for (let i = 0; i < studs; i += 1) {
      const a = spin + (i / studs) * Math.PI * 2;
      const sx = Math.cos(a) * rr, sy = Math.sin(a) * rr;
      const sr = Math.max(1.5, (outer - inner) * 0.32);
      ctx.fillStyle = "#20242c";
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#aab3c4";
      ctx.beginPath(); ctx.arc(sx - sr * 0.28, sy - sr * 0.32, sr * 0.62, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  window.ROUNDERS.CHARACTERS = CHARACTERS;
  window.ROUNDERS.drawCharacter = drawCharacter;
  window.ROUNDERS.drawIronHull = drawIronHull;
  window.ROUNDERS.setProceduralCharacters = setProceduralCharacters;
  window.ROUNDERS.characterImage = { has: hasImage, get: getImage };
})();

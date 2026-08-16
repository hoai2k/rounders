// Minimal dependency-free PNG reader/writer for the intake tools.
// Reads 8/16-bit greyscale, RGB, palette and alpha variants (non-interlaced);
// always writes 8-bit RGBA. Enough for generated game art, not a general codec.
import { inflateSync, deflateSync } from "node:zlib";

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crcTable() {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
}
const TABLE = crcTable();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function unfilter(data, w, h, bpp) {
  const stride = w * bpp;
  const out = Buffer.alloc(stride * h);
  let pos = 0;
  for (let y = 0; y < h; y += 1) {
    const filter = data[pos]; pos += 1;
    const row = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x += 1) {
      const raw = data[pos + x];
      const a = x >= bpp ? row[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v;
      switch (filter) {
        case 0: v = raw; break;
        case 1: v = raw + a; break;
        case 2: v = raw + b; break;
        case 3: v = raw + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`unsupported PNG filter ${filter}`);
      }
      row[x] = v & 0xff;
    }
    pos += stride;
  }
  return out;
}

// -> { width, height, rgba: Uint8Array }
export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIG)) throw new Error("not a PNG");
  let pos = 8;
  let ihdr = null, palette = null, trns = null;
  const idat = [];
  while (pos < buffer.length) {
    const len = buffer.readUInt32BE(pos);
    const type = buffer.toString("ascii", pos + 4, pos + 8);
    const data = buffer.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === "IHDR") {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        color: data[9],
        interlace: data[12]
      };
    } else if (type === "PLTE") palette = Buffer.from(data);
    else if (type === "tRNS") trns = Buffer.from(data);
    else if (type === "IDAT") idat.push(Buffer.from(data));
    else if (type === "IEND") break;
  }
  if (!ihdr) throw new Error("PNG has no header");
  if (ihdr.interlace) throw new Error("interlaced PNGs are not supported");
  if (ihdr.depth !== 8 && ihdr.depth !== 16) throw new Error(`unsupported bit depth ${ihdr.depth}`);
  const ch = CHANNELS[ihdr.color];
  if (!ch) throw new Error(`unsupported color type ${ihdr.color}`);

  const { width: w, height: h, depth } = ihdr;
  const bpp = ch * (depth / 8);
  const raw = unfilter(inflateSync(Buffer.concat(idat)), w, h, bpp);
  const step = depth === 16 ? 2 : 1; // 16-bit samples are truncated to their high byte
  const rgba = new Uint8Array(w * h * 4);

  for (let p = 0; p < w * h; p += 1) {
    const s = p * bpp;
    const o = p * 4;
    let r, g, b, a = 255;
    if (ihdr.color === 3) {
      const idx = raw[s];
      r = palette[idx * 3]; g = palette[idx * 3 + 1]; b = palette[idx * 3 + 2];
      if (trns && idx < trns.length) a = trns[idx];
    } else if (ihdr.color === 0 || ihdr.color === 4) {
      r = g = b = raw[s];
      if (ihdr.color === 4) a = raw[s + step];
    } else {
      r = raw[s]; g = raw[s + step]; b = raw[s + step * 2];
      if (ihdr.color === 6) a = raw[s + step * 3];
    }
    rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = a;
  }
  return { width: w, height: h, rgba };
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride)
      .copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  return Buffer.concat([
    SIG,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

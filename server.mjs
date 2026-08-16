import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname);
const port = Number(process.env.PORT || 4173);
const host = "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav"
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${host}:${port}`);
    const pathname = decodeURIComponent(url.pathname);
    // "/" and "/workbench/" both serve the directory's index.html
    const rel = pathname === "/" || pathname.endsWith("/") ? `${pathname}index.html` : pathname;
    const file = resolve(join(root, rel));
    if (!file.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    const type = types[extname(file)] || "application/octet-stream";
    const media = type.startsWith("audio/") || type.startsWith("video/");

    // Media is streamed with byte-range support so a multi-megabyte track
    // starts playing immediately instead of being buffered whole.
    if (media) {
      const { size } = await stat(file);
      const headers = {
        "content-type": type,
        "accept-ranges": "bytes",
        "cache-control": "public, max-age=86400"
      };
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range || "");
      let start = 0;
      let end = size - 1;
      if (range) {
        if (range[1] === "" && range[2] === "") { start = 0; }
        else if (range[1] === "") { start = Math.max(0, size - Number(range[2])); }
        else {
          start = Number(range[1]);
          if (range[2] !== "") end = Math.min(end, Number(range[2]));
        }
        if (start > end || start >= size) {
          response.writeHead(416, { "content-range": `bytes */${size}` });
          response.end();
          return;
        }
        headers["content-range"] = `bytes ${start}-${end}/${size}`;
      }
      headers["content-length"] = String(end - start + 1);
      response.writeHead(range ? 206 : 200, headers);
      if (request.method === "HEAD") { response.end(); return; }
      const stream = createReadStream(file, { start, end });
      stream.on("error", () => response.destroy());
      response.on("close", () => stream.destroy());
      stream.pipe(response);
      return;
    }

    const body = await readFile(file);
    response.writeHead(200, {
      "content-type": type,
      "cache-control": "no-store"
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(port, host, () => {
  console.log(`Rounder running at http://${host}:${port}`);
});

import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, stat, truncate, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { platform } from "node:process";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const PREFIX = "/skins-storage";
const KEY = /^(?:skins\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.osk|bundles\/all\.zip)$/;
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const CHUNK_LIMIT = 8 * 1024 * 1024;
const execFileAsync = promisify(execFile);

async function readJsonBody(req, limit = 1024 * 1024) {
  const parts = [];
  let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > limit) throw new Error("Manifest too large");
    parts.push(part);
  }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function keyFromPath(value) {
  try {
    const key = decodeURIComponent(value);
    return KEY.test(key) ? key : null;
  } catch { return null; }
}

function safeName(value) {
  if (typeof value !== "string") return null;
  const name = value.replace(/[\\/\r\n\x00-\x1f\x7f]/g, "_").trim();
  return name && name.length <= 512 ? name : null;
}

function sameSecret(candidate, expected) {
  const a = Buffer.from(candidate ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function ticketFromRequest(req, secret, key) {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  const [data, signature, extra] = token?.split(".") ?? [];
  if (!data || !signature || extra || data.length > 2048) return null;
  const actual = Buffer.from(signature, "base64url");
  const expected = createHmac("sha256", secret).update(data).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  let ticket;
  try { ticket = JSON.parse(Buffer.from(data, "base64url").toString("utf8")); }
  catch { return null; }
  const sizeLimit = key === "bundles/all.zip" ? 2 * 1024 ** 3 : 200 * 1024 ** 2;
  if (ticket.key !== key || !UUID.test(ticket.nonce) || !safeName(ticket.name)) return null;
  if (!Number.isSafeInteger(ticket.expires) || ticket.expires < Date.now()) return null;
  if (!Number.isSafeInteger(ticket.size) || ticket.size < 1 || ticket.size > sizeLimit) return null;
  return ticket;
}

async function status(root, key) {
  const file = join(root, key);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return { exists: false };
  const meta = await readFile(`${file}.json`, "utf8").then(JSON.parse).catch(() => ({}));
  return {
    exists: true, size: info.size, sha256: meta.sha256 ?? null,
    nonce: meta.nonce ?? null, name: meta.name ?? null,
    builtAt: meta.builtAt ?? info.mtime.toISOString(),
    fileCount: meta.fileCount ?? 0, totalBytes: meta.totalBytes ?? 0,
  };
}

async function digest(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function serve(req, res, root, key, url) {
  const file = join(root, key);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return send(res, 404, { error: "File not found" });
  const meta = await readFile(`${file}.json`, "utf8").then(JSON.parse).catch(() => ({}));
  const name = safeName(url.searchParams.get("name")) ?? meta.name ?? (key === "bundles/all.zip" ? "osu-yuzu-skins.zip" : key.split("/").at(-1));
  const ascii = name.replace(/[^\x20-\x7e"\\]/g, "_").replace(/["\\]/g, "_");
  const headers = {
    "Accept-Ranges": "bytes", "Cache-Control": key === "bundles/all.zip" ? "no-store" : "public, max-age=3600",
    "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    "Content-Type": key === "bundles/all.zip" ? "application/zip" : "application/octet-stream",
    "Last-Modified": info.mtime.toUTCString(), "X-Content-Type-Options": "nosniff",
  };
  let start = 0;
  let end = info.size - 1;
  if (req.headers.range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
    if (!match) { res.writeHead(416, { "Content-Range": `bytes */${info.size}` }); return res.end(); }
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : end;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || end >= info.size) {
      res.writeHead(416, { "Content-Range": `bytes */${info.size}` }); return res.end();
    }
    headers["Content-Range"] = `bytes ${start}-${end}/${info.size}`;
  }
  headers["Content-Length"] = String(end - start + 1);
  res.writeHead(req.headers.range ? 206 : 200, headers);
  if (req.method === "HEAD") return res.end();
  await pipeline(createReadStream(file, { start, end }), res);
}

export function createStorageServer({ root, secret, allowedOrigins = ["https://skins.yuzuctus.fr"] }) {
  if (!root || !secret || secret.length < 32) throw new Error("Storage root and 32-character secret required");
  const busy = new Set();
  return createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) return send(res, 403, { error: "Origin not allowed" });
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, PUT, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range");
    }
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    try {
      const url = new URL(req.url, "http://localhost");
      const path = url.pathname;
      if (path === `${PREFIX}/health` && req.method === "GET") return send(res, 200, { ok: true });
      if (path.startsWith(`${PREFIX}/files/`) && ["GET", "HEAD"].includes(req.method)) {
        const key = keyFromPath(path.slice(`${PREFIX}/files/`.length));
        return key ? await serve(req, res, root, key, url) : send(res, 404, { error: "File not found" });
      }
      if (path.startsWith(`${PREFIX}/admin/`)) {
        if (!sameSecret(req.headers.authorization?.replace(/^Bearer /, ""), secret)) return send(res, 401, { error: "Unauthorized" });
        if (path === `${PREFIX}/admin/bundle/rebuild` && req.method === "POST") {
          if (busy.has("bundle-rebuild")) return send(res, 409, { error: "Bundle rebuild already running" });
          busy.add("bundle-rebuild");
          const manifest = join(dirname(root), `.bundle-manifest-${randomUUID()}.json`);
          try {
            const rows = await readJsonBody(req);
            if (!Array.isArray(rows) || rows.length > 1000) return send(res, 400, { error: "Invalid manifest" });
            await writeFile(manifest, JSON.stringify(rows));
            const { stdout } = await execFileAsync(process.env.PYTHON ?? (platform === "win32" ? "python" : "python3"), [
              fileURLToPath(new URL("./build-bundle.py", import.meta.url)), "--root", dirname(root), "--manifest", manifest,
            ], { timeout: 120_000, maxBuffer: 1024 * 1024 });
            return send(res, 200, JSON.parse(stdout));
          } finally {
            busy.delete("bundle-rebuild");
            await unlink(manifest).catch(() => {});
          }
        }
        const key = keyFromPath(path.slice(`${PREFIX}/admin/`.length));
        if (!key) return send(res, 404, { error: "Unknown file" });
        if (req.method === "GET") return send(res, 200, await status(root, key));
        if (req.method === "DELETE") {
          for (const file of [join(root, key), `${join(root, key)}.json`]) {
            await unlink(file).catch(error => { if (error.code !== "ENOENT") throw error; });
          }
          return send(res, 200, { ok: true });
        }
        return send(res, 405, { error: "Method not allowed" });
      }
      if (path.startsWith(`${PREFIX}/upload/`)) {
        const complete = path.endsWith("/complete");
        const key = keyFromPath(path.slice(`${PREFIX}/upload/`.length, complete ? -"/complete".length : undefined));
        if (!key) return send(res, 404, { error: "Unknown file" });
        const ticket = ticketFromRequest(req, secret, key);
        if (!ticket) return send(res, 401, { error: "Invalid upload ticket" });
        const temp = join(root, ".uploads", `${ticket.nonce}.part`);
        if (req.method === "GET" && !complete) {
          const info = await stat(temp).catch(() => null);
          return send(res, 200, { offset: info?.size ?? 0 });
        }
        if (busy.has(ticket.nonce)) return send(res, 409, { error: "Upload busy" });
        busy.add(ticket.nonce);
        try {
          if (req.method === "PUT" && !complete) {
            const offset = Number(url.searchParams.get("offset"));
            const length = Number(req.headers["content-length"]);
            if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(length) || length < 1 || length > CHUNK_LIMIT || offset + length > ticket.size) {
              return send(res, 400, { error: "Invalid chunk" });
            }
            await mkdir(dirname(temp), { recursive: true });
            const current = await stat(temp).catch(() => null);
            if ((current?.size ?? 0) !== offset) return send(res, 409, { error: "Offset mismatch", offset: current?.size ?? 0 });
            let received = 0;
            req.on("data", chunk => { received += chunk.length; if (received > length) req.destroy(); });
            await pipeline(req, createWriteStream(temp, { flags: offset === 0 ? "w" : "r+", start: offset }));
            if (received !== length) {
              await truncate(temp, offset);
              return send(res, 400, { error: "Incomplete chunk", offset });
            }
            return send(res, 200, { offset: offset + received });
          }
          if (req.method === "POST" && complete) {
            const current = await stat(temp).catch(() => null);
            if (!current || current.size !== ticket.size) return send(res, 409, { error: "Incomplete upload", offset: current?.size ?? 0 });
            const sha256 = await digest(temp);
            const destination = join(root, key);
            await mkdir(dirname(destination), { recursive: true });
            await rename(temp, destination);
            await writeFile(`${destination}.json`, JSON.stringify({
              name: safeName(ticket.name), size: ticket.size, sha256, nonce: ticket.nonce,
              uploadedAt: new Date().toISOString(), builtAt: ticket.builtAt ?? null,
              fileCount: ticket.fileCount ?? 0, totalBytes: ticket.totalBytes ?? 0,
            }));
            return send(res, 200, { key, size: ticket.size, sha256, nonce: ticket.nonce });
          }
        } finally { busy.delete(ticket.nonce); }
        return send(res, 405, { error: "Method not allowed" });
      }
      return send(res, 404, { error: "Not found" });
    } catch (error) {
      console.error("Storage request failed", error);
      if (!res.headersSent) send(res, 500, { error: "Storage error" });
      else res.destroy(error);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.env.STORAGE_ROOT;
  const secret = process.env.STORAGE_SECRET;
  const port = Number(process.env.STORAGE_PORT ?? 8790);
  const allowedOrigins = (process.env.STORAGE_ORIGINS ?? "https://skins.yuzuctus.fr").split(",");
  createStorageServer({ root, secret, allowedOrigins }).listen(port, "127.0.0.1", () => {
    console.log(`Skin storage listening on 127.0.0.1:${port}`);
  });
}

import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { once } from "node:events";
import { createStorageServer } from "./server.mjs";

const secret = "test-secret-abcdefghijklmnopqrstuvwxyz-123456789";
const id = randomUUID();
const key = `skins/${id}.osk`;
const data = Buffer.from("a test skin file");
let root;
let parent;
let server;
let base;

function ticket() {
  const payload = Buffer.from(JSON.stringify({
    key, size: data.length, name: "étoile.osk", nonce: randomUUID(),
    expires: Date.now() + 60_000,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

before(async () => {
  parent = await mkdtemp(join(tmpdir(), "skins-storage-test-"));
  root = join(parent, "files");
  await mkdir(root);
  server = createStorageServer({ root, secret, allowedOrigins: ["https://skins.yuzuctus.fr"] });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/skins-storage`;
});

after(async () => {
  server.close();
  await once(server, "close");
  await rm(parent, { recursive: true, force: true });
});

test("signed chunks become a downloadable file with the original name and range support", async () => {
  const authorization = `Bearer ${ticket()}`;
  const uploadUrl = `${base}/upload/${key}`;
  const first = await fetch(`${uploadUrl}?offset=0`, {
    method: "PUT", headers: { authorization }, body: data.subarray(0, 7),
  });
  assert.equal(first.status, 200);
  assert.equal((await first.json()).offset, 7);

  const wrongOffset = await fetch(`${uploadUrl}?offset=0`, {
    method: "PUT", headers: { authorization }, body: data.subarray(7),
  });
  assert.equal(wrongOffset.status, 409);
  assert.equal((await wrongOffset.json()).offset, 7);

  const second = await fetch(`${uploadUrl}?offset=7`, {
    method: "PUT", headers: { authorization }, body: data.subarray(7),
  });
  assert.equal(second.status, 200);
  const complete = await fetch(`${uploadUrl}/complete`, { method: "POST", headers: { authorization } });
  assert.equal(complete.status, 200);
  const completed = await complete.json();
  assert.equal(completed.key, key);
  assert.equal(completed.size, data.length);
  assert.match(completed.sha256, /^[a-f0-9]{64}$/);

  const replay = await fetch(`${uploadUrl}?offset=0`, {
    method: "PUT", headers: { authorization }, body: data,
  });
  assert.equal(replay.status, 409);

  const file = await fetch(`${base}/files/${key}`, { headers: { Origin: "https://skins.yuzuctus.fr" } });
  assert.equal(file.status, 200);
  assert.equal(file.headers.get("access-control-allow-origin"), "https://skins.yuzuctus.fr");
  assert.match(file.headers.get("content-disposition"), /%C3%A9toile\.osk/);
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), data);

  const range = await fetch(`${base}/files/${key}`, { headers: { Range: "bytes=2-5" } });
  assert.equal(range.status, 206);
  assert.equal(range.headers.get("content-range"), `bytes 2-5/${data.length}`);
  assert.equal(await range.text(), data.subarray(2, 6).toString());

  const status = await fetch(`${base}/admin/${key}`, { headers: { authorization: `Bearer ${secret}` } });
  assert.equal(status.status, 200);
  assert.equal((await status.json()).nonce, completed.nonce);
});

test("rejects traversal, bad origins, unsigned uploads and unauthenticated admin access", async () => {
  const traversal = await fetch(`${base}/files/%2e%2e%2fetc%2fpasswd`);
  assert.equal(traversal.status, 404);
  const origin = await fetch(`${base}/files/${key}`, { headers: { Origin: "https://example.com" } });
  assert.equal(origin.status, 403);
  const unsigned = await fetch(`${base}/upload/${key}?offset=0`, { method: "PUT", body: data });
  assert.equal(unsigned.status, 401);
  const admin = await fetch(`${base}/admin/${key}`);
  assert.equal(admin.status, 401);
});

test("admin rebuild creates the archive on the VPS without browser file transfers", async () => {
  const response = await fetch(`${base}/admin/bundle/rebuild`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify([{
      name: "Étoile", skin_file_key: key, skin_file_name: "étoile.osk",
      skin_file_size: data.length, download_url: null,
    }]),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.fileCount, 1);
  const bundle = await fetch(`${base}/files/bundles/all.zip`, { method: "HEAD" });
  assert.equal(bundle.status, 200);
  assert.equal(bundle.headers.get("cache-control"), "no-store");
  assert.ok(Number(bundle.headers.get("content-length")) > data.length);
});

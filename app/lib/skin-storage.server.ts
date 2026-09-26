const KEY = /^(?:skins\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.osk|bundles\/all\.zip)$/;

export const BUNDLE_KEY = "bundles/all.zip";

export function isSkinStorageKey(key: unknown): key is string {
  return typeof key === "string" && key.startsWith("skins/") && KEY.test(key);
}

export function skinStorageKey(id: string): string {
  const key = `skins/${id}.osk`;
  if (!KEY.test(key)) throw new Error("Invalid skin ID");
  return key;
}

function storageUrl(env: Env, path: string): string {
  return `${env.SKIN_STORAGE_ORIGIN}${path}`;
}

export function publicFileUrl(env: Env, key: string, name?: string): string {
  if (!KEY.test(key)) throw new Error("Invalid storage key");
  const url = new URL(storageUrl(env, `/files/${key}`));
  if (name) url.searchParams.set("name", name);
  return url.toString();
}

export function uploadUrl(env: Env, key: string): string {
  if (!KEY.test(key)) throw new Error("Invalid storage key");
  return storageUrl(env, `/upload/${key}`);
}

export interface StoredFileStatus {
  exists: boolean;
  size?: number;
  sha256?: string | null;
  name?: string | null;
  nonce?: string | null;
  builtAt?: string;
  fileCount?: number;
  totalBytes?: number;
}

export async function storedFileStatus(env: Env, key: string): Promise<StoredFileStatus> {
  if (!KEY.test(key)) throw new Error("Invalid storage key");
  const response = await fetch(storageUrl(env, `/admin/${key}`), {
    headers: { Authorization: `Bearer ${env.SKIN_STORAGE_SECRET}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Storage status HTTP ${response.status}`);
  return response.json() as Promise<StoredFileStatus>;
}

export async function deleteStoredFile(env: Env, key: string): Promise<void> {
  if (!KEY.test(key)) throw new Error("Invalid storage key");
  const response = await fetch(storageUrl(env, `/admin/${key}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${env.SKIN_STORAGE_SECRET}` },
  });
  if (!response.ok) throw new Error(`Storage deletion HTTP ${response.status}`);
}

export async function rebuildStoredBundle(env: Env, rows: Array<{
  name: string;
  skin_file_key: string | null;
  skin_file_name: string | null;
  skin_file_size: number | null;
  download_url: string | null;
}>): Promise<void> {
  const response = await fetch(storageUrl(env, "/admin/bundle/rebuild"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SKIN_STORAGE_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`Bundle rebuild HTTP ${response.status}`);
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signUploadTicket(
  env: Env,
  data: { key: string; size: number; name: string; fileCount?: number; totalBytes?: number },
): Promise<{ token: string; nonce: string }> {
  if (!KEY.test(data.key)) throw new Error("Invalid storage key");
  const nonce = crypto.randomUUID();
  const payload = {
    ...data,
    nonce,
    expires: Date.now() + 2 * 60 * 60 * 1000,
    ...(data.key === BUNDLE_KEY ? { builtAt: new Date().toISOString() } : {}),
  };
  const encoded = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env.SKIN_STORAGE_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded)));
  return { token: `${encoded}.${base64url(signature)}`, nonce };
}

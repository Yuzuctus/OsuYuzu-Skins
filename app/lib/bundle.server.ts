import type { SkinWithTags } from "./db.server";
import { normalizeOptionalHttpUrl } from "./security.server";

export interface BundleR2Entry {
  kind: "r2";
  archiveName: string;
  /** R2 object key of the skin file. */
  key: string;
  label: string;
  /** Size in bytes as stored in D1 (0 when unknown, e.g. legacy rows). */
  size: number;
  /** Same-origin URL serving this single file (proven passthrough pattern). */
  downloadPath: string;
}

export interface BundleExternalEntry {
  kind: "external";
  archiveName: string;
  url: string;
  label: string;
}

export interface BundleManifest {
  generatedAt: string;
  files: Array<BundleR2Entry | BundleExternalEntry>;
  /** Human-readable notes for skins that cannot be embedded. */
  missing: string[];
  /** Sum of known R2 sizes (unknown sizes excluded, see ESTIMATED_SIZE). */
  totalR2Bytes: number;
  r2Count: number;
}

/** Rough per-file estimate used when D1 has no size (legacy rows). */
export const ESTIMATED_UNKNOWN_FILE_BYTES = 15 * 1024 * 1024;

const textEncoder = new TextEncoder();

export function sanitizeFileName(fileName: string): string {
  const normalized = fileName.trim().replace(/[\\/:*?"<>|]/g, "_");
  return normalized.length > 0 ? normalized : "skin.osk";
}

export function buildUniqueFileName(
  fileName: string,
  usedNames: Set<string>,
): string {
  const baseName = sanitizeFileName(fileName);
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }

  const lastDot = baseName.lastIndexOf(".");
  const name = lastDot > 0 ? baseName.slice(0, lastDot) : baseName;
  const ext = lastDot > 0 ? baseName.slice(lastDot) : "";

  let index = 2;
  let candidate = `${name}-${index}${ext}`;
  while (usedNames.has(candidate)) {
    index += 1;
    candidate = `${name}-${index}${ext}`;
  }

  usedNames.add(candidate);
  return candidate;
}

export function buildBundleManifest(skins: SkinWithTags[]): BundleManifest {
  const usedNames = new Set<string>();
  const files: BundleManifest["files"] = [];
  const missing: string[] = [];
  let totalR2Bytes = 0;
  let r2Count = 0;

  for (const skin of skins) {
    if (skin.skin_file_key) {
      const rawName = skin.skin_file_name || `${skin.name}.osk`;
      const size = skin.skin_file_size || 0;
      files.push({
        kind: "r2",
        archiveName: buildUniqueFileName(rawName, usedNames),
        key: skin.skin_file_key,
        label: skin.name,
        size,
        downloadPath: `/api/download/${skin.id}`,
      });
      totalR2Bytes += size;
      r2Count += 1;
      continue;
    }

    // External files (e.g. Google Drive) are never proxied by the Worker:
    // each proxied fetch costs subrequests + buffered memory, and Drive
    // often blocks Cloudflare IPs. Consumers embed a `.url` shortcut instead.
    const safeUrl = normalizeOptionalHttpUrl(skin.download_url);
    if (safeUrl) {
      files.push({
        kind: "external",
        archiveName: buildUniqueFileName(`${skin.name}.url`, usedNames),
        url: safeUrl,
        label: skin.name,
      });
      continue;
    }

    missing.push(`${skin.name} : aucun fichier local ni URL valide.`);
  }

  return {
    generatedAt: new Date().toISOString(),
    files,
    missing,
    totalR2Bytes,
    r2Count,
  };
}

/** Conservative total used to decide whether on-demand streaming is safe. */
export function estimateBundleBytes(manifest: BundleManifest): number {
  let total = manifest.totalR2Bytes;
  for (const file of manifest.files) {
    if (file.kind === "r2" && file.size <= 0) {
      total += ESTIMATED_UNKNOWN_FILE_BYTES;
    }
  }
  return total;
}

export function internetShortcut(url: string): Uint8Array {
  return textEncoder.encode(`[InternetShortcut]\r\nURL=${url}\r\n`);
}

export function externalLinksFile(
  files: BundleExternalEntry[],
  usedNames: Set<string>,
): { name: string; data: Uint8Array } | null {
  if (files.length === 0) return null;
  const links = [
    "Téléchargements externes (ouvrez les liens ci-dessous) :",
    "",
    ...files.map((e) => `- ${e.label} : ${e.url}`),
    "",
    "Astuce : les fichiers `.url` à côté s'ouvrent d'un double-clic sous Windows.",
  ].join("\n");
  return {
    name: buildUniqueFileName("LIENS-EXTERNES.txt", usedNames),
    data: textEncoder.encode(links),
  };
}

export function missingSkinsFile(
  missing: string[],
  usedNames: Set<string>,
): { name: string; data: Uint8Array } | null {
  if (missing.length === 0) return null;
  const readme = [
    "Les skins ci-dessous n'ont pas pu être inclus dans l'archive :",
    "",
    ...missing,
  ].join("\n");
  return {
    name: buildUniqueFileName("README-missing-skins.txt", usedNames),
    data: textEncoder.encode(readme),
  };
}

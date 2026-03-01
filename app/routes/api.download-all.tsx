import JSZip from "jszip";
import type { Route } from "./+types/api.download-all";
import { getAllSkins } from "~/lib/db.server";
import { getFile } from "~/lib/r2.server";
import { normalizeOptionalHttpUrl } from "~/lib/security.server";

function sanitizeFileName(fileName: string): string {
  const normalized = fileName.trim().replace(/[\\/:*?"<>|]/g, "_");
  return normalized.length > 0 ? normalized : "skin.osk";
}

function hasKnownArchiveExtension(fileName: string): boolean {
  return /\.(osk|zip|rar|7z)$/i.test(fileName);
}

function inferFileNameFromUrl(url: string, fallback: string): string {
  try {
    const parsed = new URL(url);
    const raw = parsed.pathname.split("/").pop() ?? "";
    const decoded = decodeURIComponent(raw);
    if (!decoded) {
      return fallback;
    }

    const candidate = sanitizeFileName(decoded);
    if (hasKnownArchiveExtension(candidate)) {
      return candidate;
    }

    return `${candidate}.osk`;
  } catch {
    return fallback;
  }
}

function buildUniqueFileName(
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

export async function loader({ context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.R2_BUCKET;

  const skins = await getAllSkins(db);
  if (skins.length === 0) {
    return new Response("No skins available", { status: 404 });
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();
  const skipped: string[] = [];
  let addedFiles = 0;

  for (const skin of skins) {
    const fallbackName = sanitizeFileName(`${skin.name}.osk`);

    if (skin.skin_file_key) {
      const file = await getFile(bucket, skin.skin_file_key);
      if (!file) {
        skipped.push(`${skin.name}\u00A0: fichier introuvable dans le stockage.`);
        continue;
      }

      const rawName = skin.skin_file_name || fallbackName;
      const finalName = buildUniqueFileName(rawName, usedNames);
      const bytes = await file.arrayBuffer();

      zip.file(finalName, bytes);
      addedFiles += 1;
      continue;
    }

    const safeUrl = normalizeOptionalHttpUrl(skin.download_url);
    if (!safeUrl) {
      skipped.push(`${skin.name}\u00A0: aucun fichier local ni URL valide.`);
      continue;
    }

    try {
      const response = await fetch(safeUrl);
      if (!response.ok) {
        skipped.push(`${skin.name}\u00A0: téléchargement distant impossible (${response.status}).`);
        continue;
      }

      const remoteBytes = await response.arrayBuffer();
      const rawName = inferFileNameFromUrl(safeUrl, fallbackName);
      const finalName = buildUniqueFileName(rawName, usedNames);

      zip.file(finalName, remoteBytes);
      addedFiles += 1;
    } catch {
      skipped.push(`${skin.name}\u00A0: erreur réseau lors du téléchargement distant.`);
    }
  }

  if (addedFiles === 0) {
    return new Response("No downloadable skins available", { status: 404 });
  }

  if (skipped.length > 0) {
    zip.file(
      "README-missing-skins.txt",
      [
        "Les skins ci-dessous n'ont pas pu être inclus dans l'archive\u00A0:",
        "",
        ...skipped,
      ].join("\n"),
    );
  }

  const zipData = await zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });

  const now = new Date().toISOString().slice(0, 10);
  const archiveName = `osu-yuzu-skins-${now}.zip`;
  const safeArchiveName = archiveName.replace(/[^\x20-\x7E]/g, "_");
  const encodedArchiveName = encodeURIComponent(archiveName).replace(
    /%20/g,
    " ",
  );

  return new Response(zipData, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeArchiveName}"; filename*=UTF-8''${encodedArchiveName}`,
      "Content-Length": String(zipData.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
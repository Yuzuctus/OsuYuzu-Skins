import type { Route } from "./+types/api.download-all";
import { getAllSkins } from "~/lib/db.server";
import { getFile } from "~/lib/r2.server";
import { normalizeOptionalHttpUrl } from "~/lib/security.server";
import { ZipStreamWriter } from "~/lib/zip-stream.server";

const textEncoder = new TextEncoder();

function sanitizeFileName(fileName: string): string {
  const normalized = fileName.trim().replace(/[\\/:*?"<>|]/g, "_");
  return normalized.length > 0 ? normalized : "skin.osk";
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

  const usedNames = new Set<string>();
  const now = new Date();

  type LocalEntry = { archiveName: string; key: string; label: string };
  type ExternalEntry = { archiveName: string; url: string; label: string };

  const localEntries: LocalEntry[] = [];
  const externalEntries: ExternalEntry[] = [];
  const skipped: string[] = [];

  for (const skin of skins) {
    if (skin.skin_file_key) {
      const rawName = skin.skin_file_name || `${skin.name}.osk`;
      localEntries.push({
        archiveName: buildUniqueFileName(rawName, usedNames),
        key: skin.skin_file_key,
        label: skin.name,
      });
      continue;
    }

    const safeUrl = normalizeOptionalHttpUrl(skin.download_url);
    if (safeUrl) {
      // Les fichiers externes (ex. Google Drive) ne sont volontairement PAS
      // re-téléchargés par le Worker : chaque `fetch()` externe coûte une
      // subrequest + du buffering mémoire, et Drive bloque souvent les IPs
      // de Cloudflare (page de confirmation / 403). On embarque un raccourci
      // `.url` + une liste de liens à la place.
      externalEntries.push({
        archiveName: buildUniqueFileName(`${skin.name}.url`, usedNames),
        url: safeUrl,
        label: skin.name,
      });
      continue;
    }

    skipped.push(`${skin.name} : aucun fichier local ni URL valide.`);
  }

  if (
    localEntries.length === 0 &&
    externalEntries.length === 0 &&
    skipped.length === 0
  ) {
    return new Response("No downloadable skins available", { status: 404 });
  }

  // Pas de `Content-Length` : la réponse est streamée au fur et à mesure de
  // la lecture R2, la mémoire reste constante quel que soit le volume total.
  // Méthode STORE (sans compression) : CPU quasi nul, pas de dépassement
  // des limites du Worker contrairement à DEFLATE niveau 9 sur JSZip.
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const zip = new ZipStreamWriter(stream.writable);

  // Le producteur tourne en tâche de fond ; toute erreur mid-stream abort
  // le flux (le client reçoit un zip tronqué plutôt qu'un Worker en erreur).
  void (async () => {
    try {
      const missingDuringStream: string[] = [...skipped];

      for (const entry of localEntries) {
        const file = await getFile(bucket, entry.key);
        if (!file) {
          missingDuringStream.push(
            `${entry.label} : fichier introuvable dans le stockage.`,
          );
          continue;
        }
        await zip.addFile(entry.archiveName, file.body, now);
      }

      for (const entry of externalEntries) {
        const shortcut = textEncoder.encode(
          `[InternetShortcut]\r\nURL=${entry.url}\r\n`,
        );
        await zip.addBuffer(entry.archiveName, shortcut, now);
      }

      if (externalEntries.length > 0) {
        const links = [
          "Téléchargements externes (ouvrez les liens ci-dessous) :",
          "",
          ...externalEntries.map((e) => `- ${e.label} : ${e.url}`),
          "",
          "Astuce : les fichiers `.url` à côté s'ouvrent d'un double-clic sous Windows.",
        ].join("\n");
        await zip.addBuffer(
          buildUniqueFileName("LIENS-EXTERNES.txt", usedNames),
          textEncoder.encode(links),
          now,
        );
      }

      if (missingDuringStream.length > 0) {
        const readme = [
          "Les skins ci-dessous n'ont pas pu être inclus dans l'archive :",
          "",
          ...missingDuringStream,
        ].join("\n");
        await zip.addBuffer(
          buildUniqueFileName("README-missing-skins.txt", usedNames),
          textEncoder.encode(readme),
          now,
        );
      }

      await zip.finish();
    } catch (error) {
      await zip.abort(error);
    }
  })();

  const today = now.toISOString().slice(0, 10);
  const archiveName = `osu-yuzu-skins-${today}.zip`;
  const safeArchiveName = archiveName.replace(/[^\x20-\x7E]/g, "_");
  const encodedArchiveName = encodeURIComponent(archiveName).replace(
    /%20/g,
    " ",
  );

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeArchiveName}"; filename*=UTF-8''${encodedArchiveName}`,
      "Cache-Control": "no-store",
    },
  });
}

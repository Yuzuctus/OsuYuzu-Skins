import type { Route } from "./+types/api.download-all";
import { getAllSkins } from "~/lib/db.server";
import {
  buildBundleManifest,
  estimateBundleBytes,
  externalLinksFile,
  internetShortcut,
  missingSkinsFile,
  type BundleExternalEntry,
} from "~/lib/bundle.server";
import { BUNDLE_KEY, getFile } from "~/lib/r2.server";
import { ZipStreamWriter } from "~/lib/zip-stream.server";

/**
 * On-demand streaming is only a fallback for small collections: a slow
 * client keeps the Worker pump alive too long and the stream gets cut
 * mid-archive ("unexpected end of data"). Above this, serve the prebuilt
 * bundle (or fail loudly instead of serving a corrupt zip).
 */
const STREAM_FALLBACK_MAX_BYTES = 25 * 1024 * 1024;

function archiveHeaders(archiveName: string): Record<string, string> {
  const safeArchiveName = archiveName.replace(/[^\x20-\x7E]/g, "_");
  const encodedArchiveName = encodeURIComponent(archiveName).replace(
    /%20/g,
    " ",
  );
  return {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${safeArchiveName}"; filename*=UTF-8''${encodedArchiveName}`,
    "Cache-Control": "no-store",
  };
}

function archiveName(): string {
  return `osu-yuzu-skins-${new Date().toISOString().slice(0, 10)}.zip`;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.R2_BUCKET;

  // HEAD probes (uptime checks, link previews) must not start the pump:
  // with no body consumer, backpressure blocks forever and the Worker dies.
  if (request.method === "HEAD") {
    return new Response(null, { headers: archiveHeaders(archiveName()) });
  }

  // Primary path: relay the prebuilt bundle. Pure R2 passthrough, exactly
  // like the single-file endpoint that already works on Workers Free —
  // no JS touches the bytes, so no CPU/memory limits can trip.
  const cached = await getFile(bucket, BUNDLE_KEY);
  if (cached) {
    return new Response(cached.body, {
      headers: {
        ...archiveHeaders(archiveName()),
        "Content-Length": String(cached.size),
        ETag: cached.etag,
      },
    });
  }

  // Fallback: assemble on the fly, only when the total is small enough to
  // complete before the stream gets cut. Refuse loudly otherwise: a
  // truncated zip is worse than a clear error.
  const skins = await getAllSkins(db);
  if (skins.length === 0) {
    return new Response("No skins available", { status: 404 });
  }
  const manifest = buildBundleManifest(skins);
  if (estimateBundleBytes(manifest) > STREAM_FALLBACK_MAX_BYTES) {
    return Response.json(
      {
        error:
          "Archive complète en cours de génération par l'administrateur. Réessayez plus tard.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const usedNames = new Set<string>(
    manifest.files.map((f) => f.archiveName),
  );
  const external = manifest.files.filter(
    (f): f is BundleExternalEntry => f.kind === "external",
  );

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const zip = new ZipStreamWriter(stream.writable);

  const pump = (async () => {
    try {
      const missing = [...manifest.missing];
      for (const file of manifest.files) {
        if (file.kind !== "r2") continue;
        const obj = await getFile(bucket, file.key);
        if (!obj) {
          missing.push(
            `${file.label} : fichier introuvable dans le stockage.`,
          );
          continue;
        }
        await zip.addFile(file.archiveName, obj.body);
      }
      for (const file of external) {
        await zip.addBuffer(file.archiveName, internetShortcut(file.url));
      }
      const links = externalLinksFile(external, usedNames);
      if (links) await zip.addBuffer(links.name, links.data);
      const readme = missingSkinsFile(missing, usedNames);
      if (readme) await zip.addBuffer(readme.name, readme.data);
      await zip.finish();
    } catch (error) {
      await zip.abort(error);
    }
  })();

  // Attach the pump to the request lifetime: without waitUntil, background
  // work may be cancelled while the response is still streaming.
  context.cloudflare.ctx.waitUntil(pump);

  return new Response(stream.readable, {
    headers: archiveHeaders(archiveName()),
  });
}

import type { Route } from "./+types/api.admin.bundle";
import { getMaxSkinUpdatedAt } from "~/lib/db.server";
import { BUNDLE_KEY, headBundle, storeBundleStream } from "~/lib/r2.server";
import {
  assertSameOrigin,
  requireAdminSession,
} from "~/lib/security.server";

/**
 * Prebuilt "download all" bundle, stored at `bundles/all.zip` in R2.
 *
 * - GET (admin): freshness status (exists / builtAt / stale / sizes).
 * - PUT (admin): stores a browser-assembled archive via R2 multipart
 *   upload. The Worker only relays fixed-size parts (constant memory,
 *   ~zero CPU), so this is safe on Workers Free, unlike zip assembly.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.R2_BUCKET;
  await requireAdminSession(request, db);

  const [bundle, skinsUpdatedAt] = await Promise.all([
    headBundle(bucket),
    getMaxSkinUpdatedAt(db),
  ]);

  return Response.json(
    {
      key: BUNDLE_KEY,
      exists: bundle !== null,
      builtAt: bundle?.builtAt ?? null,
      fileCount: bundle?.fileCount ?? 0,
      size: bundle?.size ?? 0,
      skinsUpdatedAt,
      stale:
        !bundle || (skinsUpdatedAt !== null && bundle.builtAt < skinsUpdatedAt),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.R2_BUCKET;
  await requireAdminSession(request, db);
  assertSameOrigin(request);

  if (request.method !== "PUT") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.includes("zip")) {
    return Response.json(
      { error: "Content-Type application/zip requis." },
      { status: 400 },
    );
  }

  if (!request.body) {
    return Response.json({ error: "Corps de requête vide." }, { status: 400 });
  }

  const fileCount = Number(request.headers.get("X-Bundle-File-Count") ?? 0);
  const totalBytes = Number(request.headers.get("X-Bundle-Total-Bytes") ?? 0);

  try {
    const stored = await storeBundleStream(bucket, request.body, {
      builtAt: new Date().toISOString(),
      fileCount: Number.isFinite(fileCount) ? fileCount : 0,
      totalBytes: Number.isFinite(totalBytes) ? totalBytes : 0,
    });
    return Response.json({ ok: true, ...stored });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Échec du stockage.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function headers() {
  return { "Cache-Control": "no-store" };
}

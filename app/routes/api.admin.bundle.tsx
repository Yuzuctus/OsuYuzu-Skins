import type { Route } from "./+types/api.admin.bundle";
import { getMaxSkinUpdatedAt } from "~/lib/db.server";
import { BUNDLE_KEY, headBundle } from "~/lib/r2.server";
import { requireAdminSession } from "~/lib/security.server";

/**
 * Prebuilt "download all" bundle, stored at `bundles/all.zip` in R2.
 *
 * - GET (admin): freshness status (exists / builtAt / stale / sizes).
 * - Uploads go through `api/admin/bundle-upload` (chunked, 1 chunk =
 *   1 R2 part) because a single proxied upload is capped (~100 Mo → 413).
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

export async function action() {
  // Uploads use the chunked `api/admin/bundle-upload` endpoint (a single
  // big PUT is rejected with 413 by the Cloudflare proxy on Free).
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}

export async function headers() {
  return { "Cache-Control": "no-store" };
}

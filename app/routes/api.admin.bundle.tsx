import type { Route } from "./+types/api.admin.bundle";
import { getAllSkins, getMaxSkinUpdatedAt } from "~/lib/db.server";
import { BUNDLE_KEY, rebuildStoredBundle, storedFileStatus } from "~/lib/skin-storage.server";
import { assertSameOrigin, requireAdminSession } from "~/lib/security.server";

/**
 * Prebuilt "download all" bundle, stored on the skin VPS.
 *
 * - GET (admin): freshness status (exists / builtAt / stale / sizes).
 * - POST (admin): ask the VPS to rebuild from the existing files and current
 *   D1 metadata, without downloading the full collection into the browser.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  await requireAdminSession(request, db);

  const [bundle, skinsUpdatedAt] = await Promise.all([
    storedFileStatus(context.cloudflare.env, BUNDLE_KEY),
    getMaxSkinUpdatedAt(db),
  ]);

  return Response.json(
    {
      key: BUNDLE_KEY,
      exists: bundle.exists,
      builtAt: bundle.builtAt ?? null,
      fileCount: bundle.fileCount ?? 0,
      size: bundle.size ?? 0,
      skinsUpdatedAt,
      stale:
        !bundle.exists || (skinsUpdatedAt !== null && !!bundle.builtAt && bundle.builtAt < skinsUpdatedAt),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  await requireAdminSession(request, context.cloudflare.env.DB);
  assertSameOrigin(request);
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const skins = await getAllSkins(context.cloudflare.env.DB);
  await rebuildStoredBundle(context.cloudflare.env, skins.map((skin) => ({
    name: skin.name,
    skin_file_key: skin.skin_file_key,
    skin_file_name: skin.skin_file_name,
    skin_file_size: skin.skin_file_size,
    download_url: skin.download_url,
  })));
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function headers() {
  return { "Cache-Control": "no-store" };
}

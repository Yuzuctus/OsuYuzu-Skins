import type { Route } from "./+types/api.download-manifest";
import { getAllSkins } from "~/lib/db.server";
import { buildBundleManifest } from "~/lib/bundle.server";

/**
 * Public manifest consumed by the admin "rebuild bundle" tool: one entry
 * per downloadable skin, pointing at the single-file passthrough endpoint.
 * Tiny JSON, zero heavy lifting in the Worker.
 */
export async function loader({ context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const skins = await getAllSkins(db);
  const manifest = buildBundleManifest(skins);

  return Response.json(manifest, {
    headers: { "Cache-Control": "no-store" },
  });
}

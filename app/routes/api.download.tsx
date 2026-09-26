import type { Route } from "./+types/api.download";
import { getSkinById } from "~/lib/db.server";
import { getFile } from "~/lib/r2.server";
import { normalizeOptionalHttpUrl } from "~/lib/security.server";
import { publicFileUrl } from "~/lib/skin-storage.server";

export async function loader({ params, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.R2_BUCKET;

  const skin = await getSkinById(db, params.id!);
  if (!skin) {
    return new Response("Not found", { status: 404 });
  }

  // A successful VPS HEAD keeps bytes off Workers. R2 remains a temporary
  // read-only fallback while the production copy is verified and for rollback.
  if (skin.skin_file_key) {
    const fileName = skin.skin_file_name || `${skin.name}.osk`;
    const vpsUrl = publicFileUrl(context.cloudflare.env, skin.skin_file_key, fileName);
    const vpsHead = await fetch(vpsUrl, { method: "HEAD" }).catch(() => null);
    if (vpsHead?.ok) {
      return Response.redirect(vpsUrl, 302);
    }

    const file = await getFile(bucket, skin.skin_file_key);
    if (!file) {
      return new Response("File not found", { status: 404 });
    }

    // ASCII-safe filename fallback + RFC 5987 UTF-8 encoded filename
    const safeFileName = fileName.replace(/[^\x20-\x7E]/g, "_");
    const encodedFileName = encodeURIComponent(fileName).replace(/%20/g, " ");

    return new Response(file.body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`,
        "Content-Length": String(file.size),
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  // Fallback: redirect to external download URL
  if (skin.download_url) {
    const safeUrl = normalizeOptionalHttpUrl(skin.download_url);
    if (!safeUrl) {
      return new Response("Invalid download URL", { status: 400 });
    }
    return Response.redirect(safeUrl, 302);
  }

  return new Response("No download available", { status: 404 });
}

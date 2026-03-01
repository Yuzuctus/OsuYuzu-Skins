import type { Route } from "./+types/api.image";
import { getSkinById } from "~/lib/db.server";
import { getFile } from "~/lib/r2.server";

export async function loader({ params, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.R2_BUCKET;

  const skin = await getSkinById(db, params.id!);
  if (!skin?.image_key) {
    return new Response("Not found", { status: 404 });
  }

  const file = await getFile(bucket, skin.image_key);
  if (!file) {
    return new Response("Image not found", { status: 404 });
  }

  return new Response(file.body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: file.etag,
    },
  });
}

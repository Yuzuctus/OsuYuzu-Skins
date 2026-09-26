import type { Route } from "./+types/api.admin.storage-ticket";
import { signUploadTicket, skinStorageKey, uploadUrl } from "~/lib/skin-storage.server";
import { assertSameOrigin, requireAdminSession } from "~/lib/security.server";

const MAX_SKIN_BYTES = 200 * 1024 * 1024;
const SKIN_EXT = /\.(?:osk|zip|rar|7z)$/i;

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  await requireAdminSession(request, env.DB);
  assertSameOrigin(request);
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || body.kind !== "skin") {
    return Response.json({ error: "Type de fichier invalide." }, { status: 400 });
  }
  const size = body.size;
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 1 || size > MAX_SKIN_BYTES) {
    return Response.json({ error: "Taille de fichier invalide." }, { status: 400 });
  }
  if (typeof body.name !== "string" || !SKIN_EXT.test(body.name) || body.name.length > 512) {
    return Response.json({ error: "Fichier skin invalide." }, { status: 400 });
  }
  const key = skinStorageKey(crypto.randomUUID());
  const { token, nonce } = await signUploadTicket(env, { key, name: body.name, size });
  return Response.json({ key, token, nonce, uploadUrl: uploadUrl(env, key) }, {
    headers: { "Cache-Control": "no-store" },
  });
}

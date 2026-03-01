import { redirect } from "react-router";
import { getSession } from "~/lib/db.server";
import { getSessionId } from "~/lib/session.server";

const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_SKIN_UPLOAD_BYTES = 200 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/webp",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/avif",
]);

const ALLOWED_SKIN_EXTENSIONS = [".osk", ".zip", ".rar", ".7z"];

export async function requireAdminSession(
  request: Request,
  db: D1Database,
): Promise<void> {
  const sessionId = getSessionId(request);
  if (!sessionId) {
    throw redirect("/osu-direct/login");
  }

  const session = await getSession(db, sessionId);
  if (!session) {
    throw redirect("/osu-direct/login");
  }
}

export function assertSameOrigin(request: Request): void {
  if (request.method === "GET" || request.method === "HEAD") return;

  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("Origin");
  if (origin && origin === requestOrigin) return;

  const referer = request.headers.get("Referer");
  if (referer) {
    try {
      if (new URL(referer).origin === requestOrigin) return;
    } catch {
      // invalid referer
    }
  }

  throw new Response("Forbidden", { status: 403 });
}

export function normalizeOptionalHttpUrl(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function validateImageUpload(file: File): string | null {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return "Image trop volumineuse (max 8 MB).";
  }

  if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Format d'image non supporté.";
  }

  return null;
}

export function validateSkinUpload(file: File): string | null {
  if (file.size > MAX_SKIN_UPLOAD_BYTES) {
    return "Fichier skin trop volumineux (max 200 MB).";
  }

  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_SKIN_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext),
  );
  if (!hasAllowedExtension) {
    return "Extension de fichier skin non autorisée.";
  }

  return null;
}

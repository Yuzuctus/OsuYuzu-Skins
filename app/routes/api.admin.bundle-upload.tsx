import type { Route } from "./+types/api.admin.bundle-upload";
import {
  abortBundleUpload,
  completeBundleUpload,
  initBundleUpload,
  uploadBundlePart,
} from "~/lib/r2.server";
import {
  assertSameOrigin,
  requireAdminSession,
} from "~/lib/security.server";

/**
 * Chunked bundle upload (admin only).
 *
 * A single proxied upload is capped (~100 Mo on Free → 413), so the browser
 * sends the archive in small chunks which map 1:1 to R2 multipart parts:
 * - POST ?op=init     JSON {fileCount, totalBytes} → {uploadId}
 * - PUT  ?op=part&uploadId=…&partNumber=N   raw chunk (≤ 32 Mo) → {etag}
 * - POST ?op=complete JSON {uploadId, parts:[{partNumber, etag}]} → {size}
 * - POST ?op=abort    JSON {uploadId} → {ok:true}
 */
const MAX_CHUNK_BYTES = 32 * 1024 * 1024;
const MAX_PART_NUMBER = 10_000;

function isValidUploadId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}

function error(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.R2_BUCKET;
  await requireAdminSession(request, db);
  assertSameOrigin(request);

  const url = new URL(request.url);
  const op = url.searchParams.get("op");

  try {
    if (op === "init") {
      if (request.method !== "POST") return error("Method not allowed", 405);
      const body = (await request.json().catch(() => null)) as {
        fileCount?: unknown;
        totalBytes?: unknown;
      } | null;
      const fileCount = Number(body?.fileCount ?? 0);
      const totalBytes = Number(body?.totalBytes ?? 0);
      if (!Number.isFinite(fileCount) || !Number.isFinite(totalBytes)) {
        return error("Paramètres invalides.");
      }
      const { uploadId } = await initBundleUpload(bucket, {
        builtAt: new Date().toISOString(),
        fileCount,
        totalBytes,
      });
      return Response.json({ uploadId });
    }

    if (op === "part") {
      if (request.method !== "PUT") return error("Method not allowed", 405);
      const uploadId = url.searchParams.get("uploadId") ?? "";
      const partNumber = Number(url.searchParams.get("partNumber") ?? 0);
      if (!isValidUploadId(uploadId)) return error("uploadId invalide.");
      if (
        !Number.isInteger(partNumber) ||
        partNumber < 1 ||
        partNumber > MAX_PART_NUMBER
      ) {
        return error("partNumber invalide.");
      }
      const chunk = await request.arrayBuffer();
      if (chunk.byteLength === 0) return error("Chunk vide.");
      if (chunk.byteLength > MAX_CHUNK_BYTES) return error("Chunk trop gros.");
      const { etag } = await uploadBundlePart(
        bucket,
        uploadId,
        partNumber,
        chunk,
      );
      return Response.json({ partNumber, etag });
    }

    if (op === "complete") {
      if (request.method !== "POST") return error("Method not allowed", 405);
      const body = (await request.json().catch(() => null)) as {
        uploadId?: unknown;
        parts?: unknown;
      } | null;
      if (!isValidUploadId(body?.uploadId)) return error("uploadId invalide.");
      if (!Array.isArray(body?.parts) || body.parts.length === 0) {
        return error("parts invalide.");
      }
      for (const part of body.parts) {
        const p = part as { partNumber?: unknown; etag?: unknown };
        if (
          !Number.isInteger(p.partNumber) ||
          (p.partNumber as number) < 1 ||
          typeof p.etag !== "string" ||
          p.etag.length === 0
        ) {
          return error("parts invalide.");
        }
      }
      const { size } = await completeBundleUpload(
        bucket,
        body.uploadId,
        body.parts as Array<{ partNumber: number; etag: string }>,
      );
      return Response.json({ ok: true, size });
    }

    if (op === "abort") {
      if (request.method !== "POST") return error("Method not allowed", 405);
      const body = (await request.json().catch(() => null)) as {
        uploadId?: unknown;
      } | null;
      if (!isValidUploadId(body?.uploadId)) return error("uploadId invalide.");
      await abortBundleUpload(bucket, body.uploadId);
      return Response.json({ ok: true });
    }

    return error("Opération inconnue (op=init|part|complete|abort).", 404);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de l'envoi.";
    return Response.json({ error: message }, { status: 500 });
  }
}

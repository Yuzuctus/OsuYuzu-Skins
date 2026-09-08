/**
 * R2 Storage helpers for images and skin files
 */

export async function uploadImage(
  bucket: R2Bucket,
  file: ArrayBuffer,
  id: string,
): Promise<string> {
  const key = `images/${id}.webp`;
  await bucket.put(key, file, {
    httpMetadata: {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    },
  });
  return key;
}

export async function uploadSkinFile(
  bucket: R2Bucket,
  file: ArrayBuffer,
  id: string,
  originalName: string,
): Promise<string> {
  const key = `skins/${id}.osk`;
  await bucket.put(key, file, {
    httpMetadata: {
      contentType: "application/octet-stream",
      contentDisposition: `attachment; filename="${originalName}"`,
    },
    customMetadata: {
      originalName,
    },
  });
  return key;
}

export async function getFile(
  bucket: R2Bucket,
  key: string,
): Promise<R2ObjectBody | null> {
  return bucket.get(key);
}

export async function deleteFile(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}

export async function fileExists(
  bucket: R2Bucket,
  key: string,
): Promise<boolean> {
  const head = await bucket.head(key);
  return head !== null;
}

// ─── Prebuilt "download all" bundle ─────────────────────────────

/** R2 key holding the prebuilt all-skins archive (built by the admin). */
export const BUNDLE_KEY = "bundles/all.zip";

export interface BundleMetadata {
  builtAt: string;
  size: number;
  fileCount: number;
  totalBytes: string;
}

export async function headBundle(
  bucket: R2Bucket,
): Promise<BundleMetadata | null> {
  const head = await bucket.head(BUNDLE_KEY);
  if (!head) return null;
  return {
    builtAt: head.customMetadata?.builtAt ?? head.uploaded.toISOString(),
    size: head.size,
    fileCount: Number(head.customMetadata?.fileCount ?? 0),
    totalBytes: head.customMetadata?.totalBytes ?? String(head.size),
  };
}

/**
 * Chunked bundle upload (each HTTP request carries a small chunk).
 *
 * Why: Cloudflare caps a single proxied upload (~100 Mo on Free) with a
 * 413, and our archive is bigger. The browser therefore sends 8 Mo chunks;
 * each one becomes exactly one R2 multipart part. No server state needed:
 * the client holds the R2 uploadId and the completed-parts list.
 * Per request: constant memory, ~zero CPU — safe on Workers Free.
 */
export interface BundleUploadInit {
  builtAt: string;
  fileCount: number;
  totalBytes: number;
}

export async function initBundleUpload(
  bucket: R2Bucket,
  metadata: BundleUploadInit,
): Promise<{ uploadId: string }> {
  const upload = await bucket.createMultipartUpload(BUNDLE_KEY, {
    httpMetadata: {
      contentType: "application/zip",
      cacheControl: "no-store",
    },
    customMetadata: {
      builtAt: metadata.builtAt,
      fileCount: String(metadata.fileCount),
      totalBytes: String(metadata.totalBytes),
    },
  });
  return { uploadId: upload.uploadId };
}

export async function uploadBundlePart(
  bucket: R2Bucket,
  uploadId: string,
  partNumber: number,
  chunk: ArrayBuffer,
): Promise<{ etag: string }> {
  const upload = bucket.resumeMultipartUpload(BUNDLE_KEY, uploadId);
  const part = await upload.uploadPart(partNumber, chunk);
  return { etag: part.etag };
}

export async function completeBundleUpload(
  bucket: R2Bucket,
  uploadId: string,
  parts: Array<{ partNumber: number; etag: string }>,
): Promise<{ size: number }> {
  const upload = bucket.resumeMultipartUpload(BUNDLE_KEY, uploadId);
  const object = await upload.complete(parts);
  return { size: object.size };
}

export async function abortBundleUpload(
  bucket: R2Bucket,
  uploadId: string,
): Promise<void> {
  const upload = bucket.resumeMultipartUpload(BUNDLE_KEY, uploadId);
  await upload.abort();
}

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

/**
 * Minimum part size for R2 multipart uploads (5 MiB, except the last part).
 * We use 8 MiB parts so memory stays constant no matter the archive size.
 */
const BUNDLE_PART_SIZE = 8 * 1024 * 1024;

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
 * Store a (potentially huge) bundle without ever buffering it in memory:
 * the incoming stream is sliced into 8 MiB parts uploaded sequentially via
 * R2 multipart upload. CPU per byte is ~zero (plain memory copies), so this
 * stays far below Workers Free limits, unlike zip assembly with checksums.
 */
export async function storeBundleStream(
  bucket: R2Bucket,
  body: ReadableStream<Uint8Array>,
  metadata: { builtAt: string; fileCount: number; totalBytes: number },
): Promise<{ bytes: number; parts: number }> {
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

  const reader = body.getReader();
  let part = new Uint8Array(BUNDLE_PART_SIZE);
  let partLen = 0;
  let partNumber = 0;
  let totalBytes = 0;
  const completedParts: R2UploadedPart[] = [];

  async function flush(final: boolean): Promise<void> {
    if (partLen === 0 && !final) return;
    if (partLen === 0 && final && partNumber > 0) return;
    partNumber += 1;
    // uploadPart is awaited: the buffer is only reused once R2 has it.
    completedParts.push(await upload.uploadPart(partNumber, part.slice(0, partLen)));
    partLen = 0;
  }

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.length === 0) continue;
      let offset = 0;
      while (offset < value.length) {
        const room = part.length - partLen;
        const n = Math.min(room, value.length - offset);
        part.set(value.subarray(offset, offset + n), partLen);
        partLen += n;
        offset += n;
        totalBytes += n;
        if (partLen === part.length) {
          await flush(false);
        }
      }
    }

    if (totalBytes === 0) {
      throw new Error("Archive vide : rien à stocker.");
    }
    await flush(true);
    await upload.complete(completedParts);
    return { bytes: totalBytes, parts: partNumber };
  } catch (error) {
    try {
      await upload.abort();
    } catch {
      // Ignore abort failures: the original error is what matters.
    }
    throw error;
  } finally {
    reader.releaseLock();
  }
}

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

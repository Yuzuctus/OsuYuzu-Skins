/** R2 remains the home of image previews and a read-only download fallback. */
export async function uploadImage(bucket: R2Bucket, file: ArrayBuffer, id: string): Promise<string> {
  const key = `images/${id}.webp`;
  await bucket.put(key, file, {
    httpMetadata: {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    },
  });
  return key;
}

export async function getFile(bucket: R2Bucket, key: string): Promise<R2ObjectBody | null> {
  return bucket.get(key);
}

export async function deleteFile(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}

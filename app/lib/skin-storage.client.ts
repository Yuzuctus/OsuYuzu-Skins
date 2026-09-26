const CHUNK_BYTES = 8 * 1024 * 1024;

export interface CompletedUpload {
  key: string;
  size: number;
  sha256: string;
  nonce: string;
}

type UploadTarget = { kind: "skin"; name: string };

async function errorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error ?? `HTTP ${response.status}`;
}

export async function uploadToSkinVps(
  file: Blob,
  target: UploadTarget,
  onProgress: (sent: number, total: number) => void,
): Promise<CompletedUpload> {
  const ticketResponse = await fetch("/api/admin/storage-ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...target, size: file.size }),
  });
  if (!ticketResponse.ok) throw new Error(await errorMessage(ticketResponse));
  const ticket = await ticketResponse.json() as { uploadUrl: string; token: string; nonce: string; key: string };
  const authorization = `Bearer ${ticket.token}`;
  let offset = 0;
  let failures = 0;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_BYTES);
    try {
      const response = await fetch(`${ticket.uploadUrl}?offset=${offset}`, {
        method: "PUT",
        headers: { Authorization: authorization, "Content-Type": "application/octet-stream" },
        body: chunk,
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const result = await response.json() as { offset: number };
      if (!Number.isSafeInteger(result.offset) || result.offset <= offset || result.offset > file.size) {
        throw new Error("Progression d'envoi invalide.");
      }
      offset = result.offset;
      failures = 0;
      onProgress(offset, file.size);
    } catch (error) {
      failures += 1;
      if (failures >= 3) throw error;
      const status = await fetch(ticket.uploadUrl, { headers: { Authorization: authorization } });
      if (!status.ok) throw new Error(await errorMessage(status));
      const result = await status.json() as { offset: number };
      if (!Number.isSafeInteger(result.offset) || result.offset < offset || result.offset > file.size) {
        throw new Error("Reprise d'envoi impossible.");
      }
      offset = result.offset;
      onProgress(offset, file.size);
    }
  }

  const complete = await fetch(`${ticket.uploadUrl}/complete`, {
    method: "POST", headers: { Authorization: authorization },
  });
  if (!complete.ok) throw new Error(await errorMessage(complete));
  const uploaded = await complete.json() as CompletedUpload;
  if (uploaded.key !== ticket.key || uploaded.nonce !== ticket.nonce || uploaded.size !== file.size) {
    throw new Error("La vérification du fichier envoyé a échoué.");
  }
  return uploaded;
}

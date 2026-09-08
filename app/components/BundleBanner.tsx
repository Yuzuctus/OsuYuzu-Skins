import { useCallback, useEffect, useState } from "react";

interface BundleStatus {
  exists: boolean;
  builtAt: string | null;
  fileCount: number;
  size: number;
  skinsUpdatedAt: string | null;
  stale: boolean;
}

interface BundleManifest {
  files: Array<
    | { kind: "r2"; archiveName: string; label: string; downloadPath: string }
    | { kind: "external"; archiveName: string; url: string; label: string }
  >;
  missing: string[];
  totalR2Bytes: number;
}

type Phase =
  | { name: "idle" }
  | { name: "fetch"; done: number; total: number }
  | { name: "zip"; percent: number }
  | { name: "upload"; doneParts: number; totalParts: number; doneMB: number };

/** One HTTP request = one R2 part. Stays far below the ~100 Mo proxy cap. */
const UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;
const PART_MAX_RETRIES = 3;

async function readError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? `${fallback} (HTTP ${res.status}).`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 Mo";
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "jamais";
  return new Date(iso).toLocaleString("fr-FR");
}

/**
 * Uploads the assembled archive in small chunks (1 chunk = 1 R2 part).
 * A single big PUT is rejected with 413 by the Cloudflare proxy, so each
 * request stays at 8 Mo. Failed parts are retried, then the session is
 * aborted server-side to avoid orphaned multipart uploads.
 */
async function uploadBundle(
  blob: Blob,
  fileCount: number,
  totalBytes: number,
  onProgress: (doneParts: number, totalParts: number, doneMB: number) => void,
): Promise<void> {
  const initRes = await fetch("/api/admin/bundle-upload?op=init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileCount, totalBytes }),
  });
  if (!initRes.ok) throw new Error(await readError(initRes, "Initialisation impossible"));
  const { uploadId } = (await initRes.json()) as { uploadId: string };

  const totalParts = Math.max(1, Math.ceil(blob.size / UPLOAD_CHUNK_BYTES));
  const etags: Array<{ partNumber: number; etag: string }> = [];
  let doneBytes = 0;

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
      const start = (partNumber - 1) * UPLOAD_CHUNK_BYTES;
      const chunk = blob.slice(start, start + UPLOAD_CHUNK_BYTES);
      let lastError = "Échec de l'envoi.";
      for (let attempt = 1; attempt <= PART_MAX_RETRIES; attempt += 1) {
        const partRes = await fetch(
          `/api/admin/bundle-upload?op=part&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream" },
            body: chunk,
          },
        );
        if (partRes.ok) {
          const { etag } = (await partRes.json()) as { etag: string };
          etags.push({ partNumber, etag });
          doneBytes += chunk.size;
          onProgress(partNumber, totalParts, doneBytes / 1024 / 1024);
          lastError = "";
          break;
        }
        lastError = await readError(partRes, "Échec de l'envoi");
      }
      if (lastError) {
        throw new Error(`Part ${partNumber}/${totalParts} : ${lastError}`);
      }
    }

    const completeRes = await fetch("/api/admin/bundle-upload?op=complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId, parts: etags }),
    });
    if (!completeRes.ok) {
      throw new Error(await readError(completeRes, "Finalisation impossible"));
    }
  } catch (error) {
    await fetch("/api/admin/bundle-upload?op=abort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId }),
    }).catch(() => undefined);
    throw error;
  }
}

/**
 * Banner shown on every admin page: freshness of the prebuilt "download
 * all" archive + one-click rebuild. The archive is assembled HERE, in the
 * admin browser (JSZip, desktop-grade RAM/CPU), then streamed to R2 — the
 * Worker only relays fixed-size parts, so Workers Free limits can't trip.
 */
export function BundleBanner() {
  const [status, setStatus] = useState<BundleStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [rebuildError, setRebuildError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bundle");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus((await res.json()) as BundleStatus);
      setStatusError(null);
    } catch {
      setStatusError("Statut de l'archive indisponible.");
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const rebuilding = phase.name !== "idle";

  async function rebuild() {
    setRebuildError(null);
    try {
      const manifestRes = await fetch("/api/download-manifest");
      if (!manifestRes.ok) throw new Error("Manifest illisible.");
      const manifest = (await manifestRes.json()) as BundleManifest;
      if (manifest.files.length === 0) {
        throw new Error("Aucun skin à archiver.");
      }

      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const usedNames = new Set<string>();
      let fileCount = 0;

      let done = 0;
      for (const file of manifest.files) {
        setPhase({ name: "fetch", done, total: manifest.files.length });
        if (file.kind === "r2") {
          const res = await fetch(file.downloadPath);
          if (!res.ok) {
            throw new Error(
              `Téléchargement impossible : ${file.label} (HTTP ${res.status}).`,
            );
          }
          const buffer = await res.arrayBuffer();
          zip.file(file.archiveName, buffer, { compression: "STORE" });
          usedNames.add(file.archiveName);
          fileCount += 1;
        } else {
          zip.file(
            file.archiveName,
            `[InternetShortcut]\r\nURL=${file.url}\r\n`,
            { compression: "STORE" },
          );
          usedNames.add(file.archiveName);
        }
        done += 1;
      }
      setPhase({ name: "fetch", done, total: manifest.files.length });

      const externals = manifest.files.filter((f) => f.kind === "external");
      if (externals.length > 0) {
        let name = "LIENS-EXTERNES.txt";
        let i = 2;
        while (usedNames.has(name)) name = `LIENS-EXTERNES-${i++}.txt`;
        zip.file(
          name,
          [
            "Téléchargements externes (ouvrez les liens ci-dessous) :",
            "",
            ...externals.map(
              (e) => `- ${(e as { label: string; url: string }).label} : ${(e as { url: string }).url}`,
            ),
            "",
            "Astuce : les fichiers `.url` à côté s'ouvrent d'un double-clic sous Windows.",
          ].join("\n"),
          { compression: "STORE" },
        );
      }
      if (manifest.missing.length > 0) {
        zip.file(
          "README-missing-skins.txt",
          [
            "Les skins ci-dessous n'ont pas pu être inclus dans l'archive :",
            "",
            ...manifest.missing,
          ].join("\n"),
          { compression: "STORE" },
        );
      }

      const blob = await zip.generateAsync(
        { type: "blob", compression: "STORE" },
        (metadata) => setPhase({ name: "zip", percent: metadata.percent }),
      );

      setPhase({ name: "upload", doneParts: 0, totalParts: 1, doneMB: 0 });
      await uploadBundle(blob, fileCount, manifest.totalR2Bytes, (doneParts, totalParts, doneMB) =>
        setPhase({ name: "upload", doneParts, totalParts, doneMB }),
      );

      setPhase({ name: "idle" });
      await refreshStatus();
    } catch (error) {
      setPhase({ name: "idle" });
      setRebuildError(
        error instanceof Error ? error.message : "Échec de la reconstruction.",
      );
    }
  }

  const stale = !status || status.stale;
  const bannerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    marginBottom: "1.25rem",
    fontSize: "0.9rem",
    border: `1px solid ${stale ? "#f59e0b" : "#10b981"}`,
    background: stale ? "rgba(245, 158, 11, 0.08)" : "rgba(16, 185, 129, 0.08)",
  };

  return (
    <div style={bannerStyle} role="status">
      <i
        className={`fas ${stale ? "fa-triangle-exclamation" : "fa-circle-check"}`}
        style={{ color: stale ? "#f59e0b" : "#10b981" }}
      />
      <div style={{ flex: "1 1 auto", minWidth: 220 }}>
        {statusError ? (
          <span>{statusError}</span>
        ) : !status ? (
          <span>Chargement du statut de l'archive…</span>
        ) : stale ? (
          <span>
            <strong>Archive « Tout télécharger » obsolète</strong>
            {status.exists
              ? ` (générée le ${formatDate(status.builtAt)}, ${formatBytes(status.size)}).`
              : " (aucune archive générée). "}
            Reconstruisez-la après chaque ajout / modification / suppression.
          </span>
        ) : (
          <span>
            <strong>Archive « Tout télécharger » à jour</strong> —{" "}
            {formatBytes(status.size)}, générée le {formatDate(status.builtAt)}.
          </span>
        )}
        {rebuildError && (
          <div style={{ color: "#ef4444", marginTop: "0.25rem" }}>
            {rebuildError}
          </div>
        )}
        {phase.name === "fetch" && (
          <div style={{ marginTop: "0.25rem" }}>
            Téléchargement des skins… {phase.done}/{phase.total}
          </div>
        )}
        {phase.name === "zip" && (
          <div style={{ marginTop: "0.25rem" }}>
            Compression… {Math.round(phase.percent)} %
          </div>
        )}
        {phase.name === "upload" && (
          <div style={{ marginTop: "0.25rem" }}>
            Envoi vers le stockage… {phase.doneParts}/{phase.totalParts} parts
            ({phase.doneMB.toFixed(1)} Mo)
          </div>
        )}
      </div>
      <button
        type="button"
        className="btn-primary btn-small"
        onClick={rebuild}
        disabled={rebuilding}
      >
        <i
          className={`fas ${rebuilding ? "fa-spinner fa-spin" : "fa-rotate"}`}
        ></i>{" "}
        {rebuilding ? "Reconstruction…" : "Reconstruire l'archive"}
      </button>
    </div>
  );
}

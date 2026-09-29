import { useCallback, useEffect, useState } from "react";

interface BundleStatus {
  exists: boolean;
  builtAt: string | null;
  fileCount: number;
  size: number;
  skinsUpdatedAt: string | null;
  stale: boolean;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("fr-FR") : "jamais";
}

/** The VPS rebuilds the archive from its own files; the browser only sends a request. */
export function BundleBanner() {
  const [status, setStatus] = useState<BundleStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildError, setRebuildError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/bundle");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setStatus((await response.json()) as BundleStatus);
      setStatusError(null);
    } catch {
      setStatusError("Statut de l'archive indisponible.");
    }
  }, []);

  useEffect(() => { void refreshStatus(); }, [refreshStatus]);

  async function rebuild() {
    setRebuilding(true);
    setRebuildError(null);
    try {
      const response = await fetch("/api/admin/bundle", { method: "POST" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await refreshStatus();
    } catch (error) {
      setRebuildError(error instanceof Error ? error.message : "Échec de la reconstruction.");
    } finally {
      setRebuilding(false);
    }
  }

  const stale = !status || status.stale;
  return (
    <div className="bundle-status" data-state={stale ? "stale" : "ready"} role="status">
      <span aria-hidden="true" className="bundle-status-symbol">{stale ? "!" : "✓"}</span>
      <div className="bundle-status-main">
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
        {rebuildError && <div className="bundle-status-error">{rebuildError}</div>}
        {rebuilding && <div className="bundle-status-detail">Reconstruction sur le VPS…</div>}
      </div>
      <button type="button" className="ag-button ag-button--solid ag-button--sm" onClick={rebuild} disabled={rebuilding}>
        {rebuilding ? "Reconstruction…" : "Reconstruire l'archive"}
      </button>
    </div>
  );
}

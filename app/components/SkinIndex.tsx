import { useMemo } from "react";
import type { Skin } from "~/lib/db.server";

function downloadUrl(skin: Skin): string | null {
  if (skin.skin_file_key) return `/api/download/${skin.id}`;
  return skin.download_url || null;
}

/**
 * Each entry keeps its original preference rank, preview, credits and download.
 */
function SkinRow({ skin, rank }: { skin: Skin; rank: number }) {
  const dl = downloadUrl(skin);
  const external = !skin.skin_file_key;
  const shot = skin.image_key ? `/api/image/${skin.id}` : null;

  return (
    <article className={`ag-record skins-record${dl ? " skins-record--downloadable" : ""}`}>
      {dl && (
        <a
          className="skins-record__download"
          href={dl}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          aria-label={`Télécharger ${skin.name}`}
        >
          <span className="skins-visually-hidden">Télécharger {skin.name}</span>
        </a>
      )}
      <span className="ag-label skins-record__rank">{String(rank).padStart(2, "0")}</span>
      <div className="ag-record__copy">
        <h3 className="ag-record__title">{skin.name}</h3>
      </div>
      <div className="ag-record__actions">
        {skin.forum_link && (
          <a
            className="ag-action ag-action--text skins-source-link"
            href={skin.forum_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Source ↗</span>
          </a>
        )}
        {!dl && (
          <span className="ag-label">Bientôt disponible</span>
        )}
      </div>
      <figure className="ag-record__media skins-record__media">
        {shot ? (
          <img src={shot} alt={`Aperçu du skin ${skin.name}`} loading="lazy" decoding="async" />
        ) : (
          <span className="skins-preview-empty">Aperçu indisponible</span>
        )}
      </figure>
    </article>
  );
}

export function SkinDirectory({
  skins,
  startRank,
}: {
  skins: Skin[];
  startRank: number;
}) {
  const rankedSkins = useMemo(
    () => skins.map((skin, index) => ({ skin, rank: startRank + index })),
    [skins, startRank],
  );

  return (
    <div id="skins-container" aria-label="Collection complète des skins">
      <div className="skins-directory">
        {rankedSkins.map(({ skin, rank }) => (
          <SkinRow key={skin.id} skin={skin} rank={rank} />
        ))}
        {rankedSkins.length === 0 && (
          <div className="ag-state">
            <p className="ag-state__title">Aucun autre skin dans la collection.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The preferred skin gets a dedicated image room because preference order is
 * real collection data. It is not a larger copy of the directory row.
 */
export function FeaturedSkin({ skin }: { skin: Skin }) {
  const imageUrl = skin.image_key ? `/api/image/${skin.id}` : null;
  const dl = downloadUrl(skin);
  const external = !skin.skin_file_key;

  return (
    <section className="ag-section skins-feature" aria-labelledby="t-main">
      <div className="ag-container">
        <div className="ag-feature">
          <div className="skins-feature__copy">
            <p className="ag-label">01 — Skin utilisé actuellement</p>
            <h2 id="t-main" className="ag-feature__title">{skin.name}</h2>
            <div className="ag-hero__actions">
              {dl ? (
                <a
                  className="ag-action ag-action--solid"
                  href={dl}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                >
                  <span>Télécharger ↓</span>
                </a>
              ) : (
                <span className="ag-label">Bientôt disponible</span>
              )}
              {skin.forum_link && (
                <a
                  className="ag-action ag-action--text skins-source-link"
                  href={skin.forum_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Voir la source ↗</span>
                </a>
              )}
            </div>
          </div>
          <figure className="ag-feature__media skins-feature__media">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`Aperçu du skin ${skin.name}`}
                decoding="async"
                loading="eager"
                fetchPriority="high"
              />
            ) : (
              <span className="skins-preview-empty">Aperçu indisponible</span>
            )}
          </figure>
        </div>
      </div>
    </section>
  );
}

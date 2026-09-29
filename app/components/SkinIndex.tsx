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
    <li className="ag-record">
      <span className="ag-record__rank">{String(rank).padStart(2, "0")}</span>
      <div className="ag-record__copy">
        <h3 className="ag-record__title">{skin.name}</h3>
      </div>
      {dl && (
        <a
          className="ag-record__primary"
          href={dl}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          aria-label={`Télécharger ${skin.name}`}
        >
          <span className="ag-visually-hidden">Télécharger {skin.name}</span>
        </a>
      )}
      <div className="ag-record__actions">
        {skin.forum_link && (
          <a
            className="ag-action ag-action--text"
            href={skin.forum_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Source ↗</span>
          </a>
        )}
        {!dl && (
          <span className="ag-kicker">Bientôt disponible</span>
        )}
      </div>
      <figure className="ag-record__media">
        {shot ? (
          <img src={shot} alt={`Aperçu du skin ${skin.name}`} loading="lazy" decoding="async" />
        ) : (
          <span className="ag-empty-media">Aperçu indisponible</span>
        )}
      </figure>
    </li>
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
    <div id="skins-container">
      {rankedSkins.length > 0 ? (
        <ol className="ag-records" aria-label="Collection complète des skins">
          {rankedSkins.map(({ skin, rank }) => (
            <SkinRow key={skin.id} skin={skin} rank={rank} />
          ))}
        </ol>
      ) : (
        <div className="ag-state">
          <p className="ag-state__title">Aucun autre skin dans la collection.</p>
        </div>
      )}
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
    <section className="ag-chapter" aria-labelledby="t-main">
      <div className="ag-container ag-feature">
        <div>
          <p className="ag-kicker">01 — Skin utilisé actuellement</p>
          <h2 id="t-main" className="ag-feature__title">{skin.name}</h2>
          <div className="ag-feature__actions">
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
              <span className="ag-kicker">Bientôt disponible</span>
            )}
            {skin.forum_link && (
              <a
                className="ag-action ag-action--text"
                href={skin.forum_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Voir la source ↗</span>
              </a>
            )}
          </div>
        </div>
        <figure className="ag-feature__media">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`Aperçu du skin ${skin.name}`}
              decoding="async"
              loading="eager"
              fetchPriority="high"
            />
          ) : (
            <span className="ag-empty-media">Aperçu indisponible</span>
          )}
        </figure>
      </div>
    </section>
  );
}

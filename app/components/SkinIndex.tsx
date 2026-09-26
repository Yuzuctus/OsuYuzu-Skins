import { useMemo } from "react";
import type { Skin } from "~/lib/db.server";
import { Motif } from "~/components/SiteNav";

const FALLBACK_IMG = "/img/Characters/yuzuchibi1_nobg_nofog_kourihase.png";

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
  const shot = skin.image_key ? `/api/image/${skin.id}` : FALLBACK_IMG;

  return (
    <article className="yz-dir-row" data-band="mint">
      <span className="yz-dir-num">{String(rank).padStart(2, "0")}</span>
      <div className="yz-dir-copy">
        <h3 className="yz-dir-name">
          <Motif className="yz-motif yz-dir-motif" />
          <span>{skin.name}</span>
        </h3>
      </div>
      <div className="yz-dir-shot">
        <img
          src={shot}
          alt={skin.image_key ? `Aperçu du skin ${skin.name}` : ""}
          loading="lazy"
          decoding="async"
        />
      </div>
      <span className="yz-dir-act">
        {skin.forum_link && (
          <a
            className="yz-plain-link yz-dir-forum"
            href={skin.forum_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Source
          </a>
        )}
        <span className="yz-dir-arrow" aria-hidden="true">
          {dl ? "↓" : "—"}
        </span>
      </span>
      {dl && (
        <a
          className="yz-dir-stretch"
          href={dl}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          aria-label={`Télécharger ${skin.name}`}
        />
      )}
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
    <div id="skins-container">
      <div className="yz-dir-head yz-micro" aria-hidden="true">
        <span>№</span>
        <span>Skin</span>
        <span>Aperçu</span>
        <span>Liens</span>
      </div>
      <div className="yz-directory" aria-label="Collection complète des skins">
        {rankedSkins.map(({ skin, rank }) => (
          <SkinRow key={skin.id} skin={skin} rank={rank} />
        ))}
      </div>
    </div>
  );
}

/**
 * The preferred skin gets a dedicated image room because preference order is
 * real collection data. It is not a larger copy of the directory row.
 */
export function FeaturedSkin({ skin }: { skin: Skin }) {
  const imageUrl = skin.image_key ? `/api/image/${skin.id}` : FALLBACK_IMG;
  const dl = downloadUrl(skin);
  const external = !skin.skin_file_key;

  return (
    <section className="yz-stratum color yz-mint-field" aria-labelledby="t-main">
      <div className="yz-wrap">
        <figure className="yz-featured-figure">
          <div className="yz-cut yz-featured-media">
            <img
              src={imageUrl}
              alt={skin.image_key ? `Aperçu du skin ${skin.name}` : ""}
              decoding="async"
              loading="eager"
              fetchPriority="high"
            />
          </div>
          <figcaption className="yz-featured-caption">
            <div>
              <p className="yz-micro">01 — Skin utilisé actuellement</p>
              <h2 id="t-main" className="yz-feat-title">
                {skin.name}
              </h2>
            </div>
            <div className="yz-featured-actions">
              {dl ? (
                <a
                  className="yz-btn-cut"
                  href={dl}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                >
                  Télécharger
                  <span aria-hidden="true">↓</span>
                </a>
              ) : (
                <span className="yz-micro">Bientôt disponible</span>
              )}
              {skin.forum_link && (
                <a
                  className="yz-plain-link"
                  href={skin.forum_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Voir la source
                </a>
              )}
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

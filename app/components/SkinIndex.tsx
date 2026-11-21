import { useEffect, useMemo, useState } from "react";
import type { SkinWithTags, Tag } from "~/lib/db.server";
import { COPY, type Lang } from "~/lib/i18n";

export interface RankedSkin {
  skin: SkinWithTags;
  rank: number;
}

function downloadUrl(skin: SkinWithTags): string | null {
  if (skin.skin_file_key) return `/api/download/${skin.id}`;
  return skin.download_url || null;
}

export function formatSkinSize(bytes: number, lang: Lang): string | null {
  if (!bytes || bytes < 1024) return null;
  const mb = bytes / (1024 * 1024);
  const unit = lang === "fr" ? "Mo" : "MB";
  if (mb >= 1) {
    return `${mb.toFixed(1)} ${unit}`;
  }
  const kb = Math.round(bytes / 1024);
  return `${kb} ${lang === "fr" ? "Ko" : "KB"}`;
}

/* ═══════════════════════════════════════════════════════════
 * 01 · SKIN UTILISÉ ACTUELLEMENT (FEATURED MAIN SKIN)
 * ═══════════════════════════════════════════════════════════ */
export function FeaturedSkin({
  skin,
  lang,
  onInspect,
}: {
  skin: SkinWithTags;
  lang: Lang;
  onInspect: (skin: SkinWithTags, rank: number) => void;
}) {
  const t = COPY[lang];
  const imageUrl = skin.image_key ? `/api/image/${skin.id}` : null;
  const dl = downloadUrl(skin);
  const external = !skin.skin_file_key;
  const sizeLabel = formatSkinSize(skin.skin_file_size, lang);

  return (
    <article
      id="featured"
      className="ed-spread sk-featured"
      aria-labelledby="t-featured-skin"
    >
      <div className="sk-featured__meta">
        <span className="yz-mono cr-spread__kicker">{t.featured.kicker}</span>
        <div className="sk-featured__badges">
          <span className="yz-badge yz-badge--accent yz-mono">
            {t.featured.badgeMain}
          </span>
          {sizeLabel && (
            <span className="yz-badge yz-mono">{sizeLabel}</span>
          )}
          {skin.tags?.map((tag) => (
            <span
              key={tag.id}
              className="yz-badge sk-tag-chip"
              style={{ borderLeftColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>

      <div className="ed-spread__header">
        <h2 id="t-featured-skin" className="ed-spread__title">
          {skin.name}
        </h2>
      </div>

      <figure className="sk-featured__media yz-viewfinder">
        {imageUrl ? (
          <button
            type="button"
            className="sk-media-trigger"
            onClick={() => onInspect(skin, 1)}
            aria-label={`${t.featured.inspectBtn} — ${skin.name}`}
          >
            <img
              src={imageUrl}
              alt={`${t.featured.previewAltPrefix} ${skin.name}`}
              decoding="async"
              loading="eager"
              fetchPriority="high"
            />
            <span className="yz-mono sk-media-trigger__badge" aria-hidden="true">
              #01 · ⤢
            </span>
          </button>
        ) : (
          <div className="sk-empty-media">{t.featured.noPreview}</div>
        )}
      </figure>

      <div className="ed-spread__actions sk-featured__actions">
        {dl ? (
          <a
            className="yz-btn yz-btn--accent"
            href={dl}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
          >
            <span>{t.featured.downloadBtn}</span>
            {sizeLabel && (
              <span className="yz-mono sk-btn-size">({sizeLabel})</span>
            )}
          </a>
        ) : (
          <span className="yz-badge">{t.featured.comingSoon}</span>
        )}

        {imageUrl && (
          <button
            type="button"
            className="yz-btn"
            onClick={() => onInspect(skin, 1)}
          >
            <span>{t.featured.inspectBtn}</span>
          </button>
        )}

        {skin.forum_link && (
          <a
            className="ed-link-draw"
            href={skin.forum_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{t.featured.sourceLink}</span>
          </a>
        )}
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════
 * CARTE GALERIE (VUE GALERIE 2 COLONNES)
 * ═══════════════════════════════════════════════════════════ */
function SkinGalleryCard({
  skin,
  rank,
  lang,
  onInspect,
}: {
  skin: SkinWithTags;
  rank: number;
  lang: Lang;
  onInspect: (skin: SkinWithTags, rank: number) => void;
}) {
  const t = COPY[lang];
  const dl = downloadUrl(skin);
  const external = !skin.skin_file_key;
  const shot = skin.image_key ? `/api/image/${skin.id}` : null;
  const sizeLabel = formatSkinSize(skin.skin_file_size, lang);
  const rankStr = String(rank).padStart(2, "0");
  const isPodium = rank <= 3;

  return (
    <article
      className={`sk-card ${isPodium ? "is-podium" : ""}`}
      data-rank={rank}
    >
      <div className="sk-card__media">
        {shot ? (
          <button
            type="button"
            className="sk-media-trigger"
            onClick={() => onInspect(skin, rank)}
            aria-label={`${t.directory.inspectAction} — ${skin.name}`}
          >
            <img
              src={shot}
              alt={`${t.featured.previewAltPrefix} ${skin.name}`}
              loading="lazy"
              decoding="async"
            />
            <span
              className={`yz-mono sk-card__rank-pill ${isPodium ? "is-podium" : ""}`}
            >
              #{rankStr}
            </span>
            <span className="yz-mono sk-media-trigger__zoom" aria-hidden="true">
              ⤢
            </span>
          </button>
        ) : (
          <div className="sk-empty-media">
            <span className="yz-mono sk-card__rank-pill">#{rankStr}</span>
            <span>{t.featured.noPreview}</span>
          </div>
        )}
      </div>

      <div className="sk-card__body">
        <div className="sk-card__top">
          <h3 className="sk-card__title">{skin.name}</h3>
          {(sizeLabel || (skin.tags && skin.tags.length > 0)) && (
            <div className="sk-card__tags">
              {sizeLabel && (
                <span className="yz-mono sk-card__size">{sizeLabel}</span>
              )}
              {skin.tags?.map((tag) => (
                <span
                  key={tag.id}
                  className="yz-badge sk-tag-chip"
                  style={{ borderLeftColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="sk-card__foot">
          {dl ? (
            <a
              className="yz-btn yz-btn--solid yz-btn--sm"
              href={dl}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
            >
              <span>{t.directory.downloadAction}</span>
            </a>
          ) : (
            <span className="yz-badge">{t.featured.comingSoon}</span>
          )}

          <div className="sk-card__links">
            {skin.forum_link && (
              <a
                className="ed-link-draw"
                href={skin.forum_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{t.directory.sourceAction}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════
 * LIGNE INDEX (VUE COMPACTE ÉDITORIALE)
 * ═══════════════════════════════════════════════════════════ */
function SkinIndexRow({
  skin,
  rank,
  lang,
  onInspect,
}: {
  skin: SkinWithTags;
  rank: number;
  lang: Lang;
  onInspect: (skin: SkinWithTags, rank: number) => void;
}) {
  const t = COPY[lang];
  const dl = downloadUrl(skin);
  const external = !skin.skin_file_key;
  const shot = skin.image_key ? `/api/image/${skin.id}` : null;
  const sizeLabel = formatSkinSize(skin.skin_file_size, lang);
  const rankStr = String(rank).padStart(2, "0");

  return (
    <li className="sk-row">
      <span className={`yz-mono sk-row__rank ${rank <= 3 ? "is-podium" : ""}`}>
        #{rankStr}
      </span>

      <div className="sk-row__thumb">
        {shot ? (
          <button
            type="button"
            className="sk-row__thumb-btn"
            onClick={() => onInspect(skin, rank)}
            aria-label={`${t.directory.inspectAction} — ${skin.name}`}
          >
            <img
              src={shot}
              alt={`${t.featured.previewAltPrefix} ${skin.name}`}
              loading="lazy"
              decoding="async"
            />
          </button>
        ) : (
          <div className="sk-row__thumb-empty">—</div>
        )}
      </div>

      <div className="sk-row__info">
        <h3 className="sk-row__title">{skin.name}</h3>
        {skin.tags && skin.tags.length > 0 && (
          <div className="sk-row__tags">
            {skin.tags.map((tag) => (
              <span
                key={tag.id}
                className="yz-badge sk-tag-chip"
                style={{ borderLeftColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <span className="yz-mono sk-row__size">{sizeLabel ?? "—"}</span>

      <div className="sk-row__actions">
        {skin.forum_link && (
          <a
            className="ed-link-draw"
            href={skin.forum_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{t.directory.sourceAction}</span>
          </a>
        )}
        {dl ? (
          <a
            className="yz-btn yz-btn--solid yz-btn--sm"
            href={dl}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
          >
            <span>{t.directory.downloadAction}</span>
          </a>
        ) : (
          <span className="yz-mono sk-row__soon">{t.featured.comingSoon}</span>
        )}
      </div>
    </li>
  );
}

/* ═══════════════════════════════════════════════════════════
 * 02 · LA COLLECTION COMPLÈTE (GALERIE + INDEX + FILTRES)
 * ═══════════════════════════════════════════════════════════ */
export function SkinDirectory({
  skins,
  tags,
  startRank,
  lang,
  onInspect,
}: {
  skins: SkinWithTags[];
  tags: Tag[];
  startRank: number;
  lang: Lang;
  onInspect: (skin: SkinWithTags, rank: number) => void;
}) {
  const t = COPY[lang];
  const [query, setQuery] = useState("");
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"gallery" | "index">("gallery");

  const rankedSkins = useMemo<RankedSkin[]>(
    () => skins.map((skin, index) => ({ skin, rank: startRank + index })),
    [skins, startRank],
  );

  const filteredSkins = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rankedSkins.filter(({ skin }) => {
      const matchesQuery = !q || skin.name.toLowerCase().includes(q);
      const matchesTag =
        !activeTagId || skin.tags?.some((tg) => tg.id === activeTagId);
      return matchesQuery && matchesTag;
    });
  }, [rankedSkins, query, activeTagId]);

  const endRank = startRank + Math.max(0, skins.length - 1);

  return (
    <section
      id="collection"
      className="ed-spread sk-directory"
      aria-labelledby="t-collection"
    >
      <span className="yz-mono cr-spread__kicker">{t.directory.kicker}</span>

      <div className="ed-spread__header">
        <div>
          <h2 id="t-collection" className="ed-spread__title">
            {t.directory.title}
          </h2>
          {skins.length > 0 && (
            <p className="sk-directory__sub">
              {t.directory.subtitlePrefix}{" "}
              <span className="yz-mono">
                #{String(startRank).padStart(2, "0")}
              </span>{" "}
              {t.directory.subtitleTo}{" "}
              <span className="yz-mono">
                #{String(endRank).padStart(2, "0")}
              </span>
            </p>
          )}
        </div>

        {skins.length > 0 && (
          <a className="ed-link-draw" href="/api/download-all">
            <span>{t.directory.downloadAll}</span>
          </a>
        )}
      </div>

      {skins.length > 0 && (
        <div className="sk-toolbar">
          <div className="sk-search">
            <input
              type="search"
              className="yz-input sk-search__input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.directory.searchPlaceholder}
              aria-label={t.directory.searchAria}
            />
            {query && (
              <button
                type="button"
                className="sk-search__clear"
                onClick={() => setQuery("")}
                aria-label={t.directory.clearSearch}
              >
                ×
              </button>
            )}
          </div>

          <div className="sk-toolbar__right">
            {tags.length > 0 && (
              <div className="sk-tag-filters" role="group">
                <button
                  type="button"
                  className={`sk-filter-pill ${activeTagId === null ? "is-active" : ""}`}
                  onClick={() => setActiveTagId(null)}
                >
                  {t.directory.allTags}
                </button>
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={`sk-filter-pill ${activeTagId === tag.id ? "is-active" : ""}`}
                    style={
                      {
                        "--tag-color": tag.color,
                      } as React.CSSProperties
                    }
                    onClick={() =>
                      setActiveTagId((prev) =>
                        prev === tag.id ? null : tag.id,
                      )
                    }
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}

            <div
              className="yz-segmented"
              role="group"
              aria-label={t.directory.viewAria}
            >
              <button
                type="button"
                className="yz-segmented__item"
                aria-pressed={viewMode === "gallery"}
                onClick={() => setViewMode("gallery")}
              >
                {t.directory.viewGallery}
              </button>
              <button
                type="button"
                className="yz-segmented__item"
                aria-pressed={viewMode === "index"}
                onClick={() => setViewMode("index")}
              >
                {t.directory.viewIndex}
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="skins-container">
        {skins.length === 0 ? (
          <div className="sk-empty-state">
            <p>{t.directory.emptyCollection}</p>
          </div>
        ) : filteredSkins.length === 0 ? (
          <div className="sk-empty-state">
            <p>{t.directory.emptyFilter}</p>
            <button
              type="button"
              className="yz-btn yz-btn--sm"
              onClick={() => {
                setQuery("");
                setActiveTagId(null);
              }}
            >
              {t.directory.resetFilter}
            </button>
          </div>
        ) : viewMode === "gallery" ? (
          <div className="sk-gallery-grid">
            {filteredSkins.map(({ skin, rank }) => (
              <SkinGalleryCard
                key={skin.id}
                skin={skin}
                rank={rank}
                lang={lang}
                onInspect={onInspect}
              />
            ))}
          </div>
        ) : (
          <ol className="sk-index-list">
            {filteredSkins.map(({ skin, rank }) => (
              <SkinIndexRow
                key={skin.id}
                skin={skin}
                rank={rank}
                lang={lang}
                onInspect={onInspect}
              />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
 * VISIONNEUSE CHAMBRE NOIRE (LIGHTBOX PLEIN ÉCRAN)
 * ═══════════════════════════════════════════════════════════ */
export function SkinLightbox({
  active,
  allSkins,
  lang,
  onClose,
  onSelect,
}: {
  active: RankedSkin | null;
  allSkins: RankedSkin[];
  lang: Lang;
  onClose: () => void;
  onSelect: (next: RankedSkin) => void;
}) {
  const t = COPY[lang];

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const idx = allSkins.findIndex((s) => s.skin.id === active.skin.id);
        if (idx === -1) return;
        const delta = e.key === "ArrowRight" ? 1 : -1;
        const nextIdx = (idx + delta + allSkins.length) % allSkins.length;
        const nextItem = allSkins[nextIdx];
        if (nextItem) onSelect(nextItem);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, allSkins, onClose, onSelect]);

  if (!active) return null;

  const { skin, rank } = active;
  const imageUrl = skin.image_key ? `/api/image/${skin.id}` : null;
  const dl = downloadUrl(skin);
  const external = !skin.skin_file_key;
  const sizeLabel = formatSkinSize(skin.skin_file_size, lang);
  const rankStr = String(rank).padStart(2, "0");

  const currentIdx = allSkins.findIndex((s) => s.skin.id === skin.id);
  const goPrev = () => {
    if (allSkins.length <= 1) return;
    const prevIdx = (currentIdx - 1 + allSkins.length) % allSkins.length;
    const item = allSkins[prevIdx];
    if (item) onSelect(item);
  };
  const goNext = () => {
    if (allSkins.length <= 1) return;
    const nextIdx = (currentIdx + 1) % allSkins.length;
    const item = allSkins[nextIdx];
    if (item) onSelect(item);
  };

  return (
    <div
      className="sk-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={skin.name}
      onClick={onClose}
    >
      <div
        className="sk-lightbox__dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sk-lightbox__top">
          <div className="sk-lightbox__title-row">
            <span className="yz-badge yz-badge--accent yz-mono">
              #{rankStr}
            </span>
            <h3 className="sk-lightbox__title">{skin.name}</h3>
            {sizeLabel && (
              <span className="yz-mono sk-lightbox__size">{sizeLabel}</span>
            )}
          </div>

          <div className="sk-lightbox__controls">
            {allSkins.length > 1 && (
              <>
                <button
                  type="button"
                  className="yz-btn yz-btn--sm"
                  onClick={goPrev}
                  aria-label={t.lightbox.prev}
                  title={t.lightbox.prev}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="yz-btn yz-btn--sm"
                  onClick={goNext}
                  aria-label={t.lightbox.next}
                  title={t.lightbox.next}
                >
                  →
                </button>
              </>
            )}
            <button
              type="button"
              className="yz-btn yz-btn--sm"
              onClick={onClose}
              aria-label={t.lightbox.close}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="sk-lightbox__stage">
          {imageUrl ? (
            <img src={imageUrl} alt={skin.name} />
          ) : (
            <div className="sk-empty-media">{t.featured.noPreview}</div>
          )}
        </div>

        <div className="sk-lightbox__foot">
          <span className="yz-mono sk-lightbox__counter">
            {t.lightbox.rankPrefix} #{rankStr} /{" "}
            {String(allSkins.length).padStart(2, "0")}
          </span>

          <div className="sk-lightbox__actions">
            {skin.forum_link && (
              <a
                className="ed-link-draw"
                href={skin.forum_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{t.lightbox.source}</span>
              </a>
            )}
            {dl && (
              <a
                className="yz-btn yz-btn--accent yz-btn--sm"
                href={dl}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
              >
                <span>{t.lightbox.download}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

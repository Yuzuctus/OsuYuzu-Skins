import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "./+types/home";
import {
  getAllSkins,
  getAllTags,
  getMaxSkinUpdatedAt,
  type SkinWithTags,
} from "~/lib/db.server";
import { Hero } from "~/components/Hero";
import {
  FeaturedSkin,
  SkinDirectory,
  SkinLightbox,
  type RankedSkin,
} from "~/components/SkinIndex";
import { SiteNav } from "~/components/SiteNav";
import { BackToTop } from "~/components/BackToTop";
import { Footer } from "~/components/Footer";
import { DesertMirageBackdrop } from "~/design-system/fx/DesertMirageBackdrop";
import type { FilmMode } from "~/design-system/tokens";
import {
  COPY,
  FILM_STORAGE_KEY,
  getInitialLang,
  LANG_STORAGE_KEY,
  type Lang,
} from "~/lib/i18n";
import skinsStylesUrl from "~/styles/skins.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: skinsStylesUrl },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mes skins osu! — Collection personnelle de Yuzuctus" },
    {
      name: "description",
      content:
        "Les skins osu!standard que j'utilise vraiment quand je joue. Classés par ordre de préférence, avec aperçus, crédits et téléchargements directs.",
    },
    {
      name: "keywords",
      content: "yuzuctus, osu!standard, skins osu, téléchargements, osk",
    },
    { name: "author", content: "Yuzuctus" },
    {
      property: "og:title",
      content: "Mes skins osu! — Collection personnelle de Yuzuctus",
    },
    {
      property: "og:description",
      content:
        "Les skins que j'utilise vraiment quand je joue. Pioche dedans, c'est fait pour jouer.",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://skins.yuzuctus.fr/" },
    {
      property: "og:image",
      content: "https://skins.yuzuctus.fr/art/yuzu-hero-collage.webp",
    },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const [skins, tags, lastModifiedAt] = await Promise.all([
    getAllSkins(db),
    getAllTags(db),
    getMaxSkinUpdatedAt(db),
  ]);
  return { skins, tags, lastModifiedAt };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { skins, tags, lastModifiedAt } = loaderData;
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [film, setFilm] = useState<FilmMode>("negative");
  const [lang, setLang] = useState<Lang>("fr");
  const [activeSection, setActiveSection] = useState<
    "featured" | "collection" | "colophon"
  >("featured");
  const [inspectedSkin, setInspectedSkin] = useState<RankedSkin | null>(null);

  // Sync film & language from DOM / localStorage on mount
  useEffect(() => {
    const domFilm = document.documentElement.getAttribute("data-film");
    if (domFilm === "positive" || domFilm === "negative") {
      setFilm(domFilm);
    }
    const initialLang = getInitialLang();
    setLang(initialLang);
    document.documentElement.lang = initialLang;
  }, []);

  const handleFilmChange = useCallback((next: FilmMode) => {
    setFilm(next);
    document.documentElement.setAttribute("data-film", next);
    document.documentElement.setAttribute(
      "data-theme",
      next === "positive" ? "light" : "dark",
    );
    try {
      localStorage.setItem(FILM_STORAGE_KEY, next);
      localStorage.setItem("theme", next === "positive" ? "light" : "dark");
    } catch {
      // ignore
    }
  }, []);

  const handleLangChange = useCallback((next: Lang) => {
    setLang(next);
    document.documentElement.lang = next;
    document.title = COPY[next].meta.title;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  // Choreographed Hero smoothstep scroll progress
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let rafId = 0;
    const updateScrollVars = () => {
      rafId = 0;
      const vh = Math.max(window.innerHeight, 1);
      const y = window.scrollY;
      const rawP = Math.min(1, Math.max(0, y / (vh * 0.85)));
      const smoothE = rawP * rawP * (3 - 2 * rawP);
      const veil = Math.max(0, 1 - smoothE * 0.92);

      root.style.setProperty("--hero-p", rawP.toFixed(4));
      root.style.setProperty("--hero-e", smoothE.toFixed(4));
      root.style.setProperty("--bg-veil", veil.toFixed(4));
    };

    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(updateScrollVars);
    };

    updateScrollVars();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Scroll-spy for left sticky rail & topbar
  useEffect(() => {
    const ids: Array<"featured" | "collection" | "colophon"> = [
      "featured",
      "collection",
      "colophon",
    ];
    const onScroll = () => {
      const colophonEl = document.getElementById("colophon");
      if (
        colophonEl &&
        colophonEl.getBoundingClientRect().top <= window.innerHeight * 0.55
      ) {
        setActiveSection("colophon");
        return;
      }
      const collectionEl = document.getElementById("collection");
      if (
        collectionEl &&
        collectionEl.getBoundingClientRect().top <= window.innerHeight * 0.42
      ) {
        setActiveSection("collection");
        return;
      }
      if (ids.includes("featured")) {
        setActiveSection("featured");
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const main = skins[0];
  const rest = useMemo(() => skins.slice(1), [skins]);
  const allRankedSkins = useMemo<RankedSkin[]>(
    () => skins.map((skin, idx) => ({ skin, rank: idx + 1 })),
    [skins],
  );

  const lastModifiedDate = useMemo(() => {
    if (!lastModifiedAt) return null;
    try {
      return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", {
        timeZone: "Europe/Paris",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(lastModifiedAt));
    } catch {
      return null;
    }
  }, [lastModifiedAt, lang]);

  const handleInspect = useCallback((skin: SkinWithTags, rank: number) => {
    setInspectedSkin({ skin, rank });
  }, []);

  const t = COPY[lang];

  return (
    <div id="top" ref={rootRef} className="vitrine-root">
      <a className="yz-skip-link" href="#featured">
        {t.skipLink}
      </a>

      <DesertMirageBackdrop film={film} audioReactive fixed />

      <SiteNav
        film={film}
        onFilmChange={handleFilmChange}
        lang={lang}
        onLangChange={handleLangChange}
        activeSection={activeSection}
      />

      <main id="main">
        <Hero
          skinCount={skins.length}
          mainSkinName={main?.name ?? null}
          lastModifiedDate={lastModifiedDate}
          lastModifiedIso={lastModifiedAt}
          film={film}
          lang={lang}
        />

        <section className="ed-works" aria-label={t.directory.title}>
          <div className="yz-container ed-works__layout">
            {/* Rail gauche collant avec Yuzu en pied + résumé + index */}
            <aside className="ed-works__rail">
              <img
                src="/art/kourihase-full-nobg.webp"
                alt={t.rail.kouriAlt}
                className="ed-works__kouri"
                loading="lazy"
                decoding="async"
              />

              <div className="cr-lore-box">
                <span className="cr-lore-box__kicker">{t.rail.boxKicker}</span>
                <p className="cr-lore-box__poem">
                  <span className="cr-lore-box__line">{t.rail.boxLine1}</span>
                  <span className="cr-lore-box__line is-highlight">
                    {t.rail.boxLine2}
                  </span>
                </p>
                {skins.length > 0 && (
                  <div className="cr-lore-box__sub">
                    <a href="/api/download-all" className="ed-link-draw">
                      <span>{t.rail.downloadAll}</span>
                    </a>
                  </div>
                )}
              </div>

              <nav aria-label={t.rail.navAria} style={{ width: "100%" }}>
                <ol className="ed-works__index">
                  {main && (
                    <li>
                      <a
                        href="#featured"
                        className={
                          activeSection === "featured" ? "is-active" : ""
                        }
                      >
                        <span>01 · {t.rail.idxFeatured}</span>
                        <span className="yz-mono">#01</span>
                      </a>
                    </li>
                  )}
                  <li>
                    <a
                      href="#collection"
                      className={
                        activeSection === "collection" ? "is-active" : ""
                      }
                    >
                      <span>02 · {t.rail.idxCollection}</span>
                      <span className="yz-mono">
                        {String(rest.length).padStart(2, "0")}
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="#colophon"
                      className={
                        activeSection === "colophon" ? "is-active" : ""
                      }
                    >
                      <span>03 · {t.rail.idxResources}</span>
                      <span className="yz-mono">↗</span>
                    </a>
                  </li>
                </ol>
              </nav>
            </aside>

            {/* Colonne principale : 01 Main Skin + 02 Collection complète */}
            <div className="ed-spreads">
              {main && (
                <FeaturedSkin
                  skin={main}
                  lang={lang}
                  onInspect={handleInspect}
                />
              )}

              <SkinDirectory
                skins={rest}
                tags={tags}
                startRank={main ? 2 : 1}
                lang={lang}
                onInspect={handleInspect}
              />
            </div>
          </div>
        </section>
      </main>

      <Footer lang={lang} />
      <BackToTop lang={lang} />

      <SkinLightbox
        active={inspectedSkin}
        allSkins={allRankedSkins}
        lang={lang}
        onClose={() => setInspectedSkin(null)}
        onSelect={setInspectedSkin}
      />
    </div>
  );
}

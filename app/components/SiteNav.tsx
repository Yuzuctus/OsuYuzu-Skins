import { useEffect, useState } from "react";
import { FilmSwitch } from "~/design-system/core/FilmSwitch";
import type { FilmMode } from "~/design-system/tokens";
import { COPY, type Lang } from "~/lib/i18n";

interface SiteNavProps {
  film: FilmMode;
  onFilmChange: (next: FilmMode) => void;
  lang: Lang;
  onLangChange: (next: Lang) => void;
  activeSection: "featured" | "collection" | "colophon";
}

export function SiteNav({
  film,
  onFilmChange,
  lang,
  onLangChange,
  activeSection,
}: SiteNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const t = COPY[lang];

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`yz-topbar ${scrolled ? "is-scrolled" : ""}`}>
      <div className="yz-container yz-topbar__inner">
        <a
          className="yz-wordmark"
          href="#top"
          aria-label="Osu!Yuzu — haut de page"
        >
          Osu!<span className="yz-wordmark__accent">Yuzu.</span>
        </a>

        <nav className="yz-nav" aria-label={t.nav.ariaMain}>
          <a
            href="#featured"
            aria-current={activeSection === "featured" ? "location" : undefined}
          >
            {t.nav.mainSkin}
          </a>
          <a
            href="#collection"
            aria-current={
              activeSection === "collection" ? "location" : undefined
            }
          >
            {t.nav.collection}
          </a>
          <a
            href="#colophon"
            aria-current={activeSection === "colophon" ? "location" : undefined}
          >
            {t.nav.resources}
          </a>
          <a href="https://yuzuctus.fr/">{t.nav.mainSite} ↗</a>
        </nav>

        <div className="yz-topbar__controls">
          <div
            className="yz-lang-switch"
            role="group"
            aria-label={t.nav.langAria}
          >
            <button
              type="button"
              className={`yz-lang-switch__btn ${lang === "fr" ? "is-active" : ""}`}
              onClick={() => onLangChange("fr")}
              aria-pressed={lang === "fr"}
            >
              FR
            </button>
            <span className="yz-lang-switch__sep" aria-hidden="true">
              /
            </span>
            <button
              type="button"
              className={`yz-lang-switch__btn ${lang === "en" ? "is-active" : ""}`}
              onClick={() => onLangChange("en")}
              aria-pressed={lang === "en"}
            >
              EN
            </button>
          </div>

          <FilmSwitch
            film={film}
            onChange={onFilmChange}
            labels={{
              positive: t.film.positive,
              negative: t.film.negative,
              toNegativeAria: t.film.toNegativeAria,
              toPositiveAria: t.film.toPositiveAria,
              title: t.film.title,
            }}
          />
        </div>
      </div>
    </header>
  );
}

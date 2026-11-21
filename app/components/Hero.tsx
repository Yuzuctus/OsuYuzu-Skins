import { SolarizedStage } from "~/design-system/fx/SolarizedStage";
import type { FilmMode } from "~/design-system/tokens";
import { COPY, type Lang } from "~/lib/i18n";

type HeroProps = {
  skinCount: number;
  mainSkinName: string | null;
  lastModifiedDate: string | null;
  lastModifiedIso: string | null;
  film: FilmMode;
  lang: Lang;
};

export function Hero({
  skinCount,
  mainSkinName,
  lastModifiedDate,
  lastModifiedIso,
  film,
  lang,
}: HeroProps) {
  const t = COPY[lang];

  return (
    <div className="vh-hero-track">
      <section className="vh-hero" aria-label="Osu!Yuzu Skins">
        <div className="vh-hero__stage">
          <h1 className="vh-hero__word-back">{t.hero.backdropWord}</h1>

          <div className="vh-hero__art">
            <SolarizedStage
              src="/art/yuzu-hero-collage.webp"
              alt={t.hero.artAlt}
              film={film}
              fit="contain"
              trackWindow
              invertBaseInDark={false}
              params={{
                apertureMode: "loupe",
                loupeRadius: 0.145,
                solarizeCurve: 0.42,
                mirageWave: 0.25,
                dispersion: 0.58,
                grain: 0.042,
                edgeClean: 0,
                audioReactive: true,
              }}
            />
          </div>

          <div className="vh-hero__word-front" aria-hidden="true">
            {t.hero.backdropWord}
          </div>
        </div>

        <div className="yz-container vh-hero__footer">
          <div className="vh-hero__footer-grid">
            <div>
              <p className="vh-hero__tagline">{t.hero.tagline}</p>
              <p className="cr-hero__subtagline">{t.hero.subtagline}</p>
            </div>

            <div className="sk-hero-console">
              <div className="sk-hero-console__top">
                <span className="sk-hero-console__kicker">
                  <span className="yz-pulse-dot" aria-hidden="true" />
                  <span>{t.hero.telemetryKicker}</span>
                </span>
                {lastModifiedIso && lastModifiedDate && (
                  <span className="yz-mono sk-hero-console__date">
                    {t.hero.updatedPrefix}{" "}
                    <time dateTime={lastModifiedIso}>{lastModifiedDate}</time>
                  </span>
                )}
              </div>

              <div className="sk-hero-console__body">
                <div className="sk-hero-console__count">
                  <span className="yz-display sk-hero-console__num">
                    {String(skinCount).padStart(2, "0")}
                  </span>
                  <span className="yz-mono sk-hero-console__unit">
                    {t.hero.skinsLabel}
                  </span>
                </div>

                {mainSkinName && (
                  <a href="#featured" className="sk-hero-console__main">
                    <span className="yz-mono sk-hero-console__main-lbl">
                      #01 · {t.hero.mainSkinLabel}
                    </span>
                    <span className="sk-hero-console__main-name">
                      {mainSkinName}
                    </span>
                  </a>
                )}

                {skinCount > 0 && (
                  <a
                    href="/api/download-all"
                    className="yz-btn yz-btn--accent yz-btn--sm sk-hero-console__dl"
                  >
                    <span>{t.hero.downloadAll}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

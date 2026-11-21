import { useState } from "react";
import { COPY, type Lang } from "~/lib/i18n";

const CHIBI_POSES = [
  "/art/kourihase-chibi-3.png",
  "/art/kourihase-chibi-1.png",
  "/art/kourihase-chibi-2.png",
] as const;

export function Footer({ lang }: { lang: Lang }) {
  const [chibiIdx, setChibiIdx] = useState(0);
  const t = COPY[lang];

  return (
    <footer id="colophon" className="ed-colophon" aria-label="Colophon">
      <div className="yz-container">
        <div className="ed-colophon__grid">
          <div>
            <div className="ed-colophon__chibi-row">
              <button
                type="button"
                className="ed-colophon__chibi-btn"
                onClick={() =>
                  setChibiIdx((prev) => (prev + 1) % CHIBI_POSES.length)
                }
                aria-label={`${t.colophon.poseAria} ${chibiIdx + 1}/${CHIBI_POSES.length})`}
                title={`${t.colophon.poseAria} ${chibiIdx + 1}/${CHIBI_POSES.length})`}
              >
                <img
                  key={chibiIdx}
                  src={CHIBI_POSES[chibiIdx]}
                  alt=""
                  className="ed-colophon__chibi"
                  loading="lazy"
                />
              </button>
              <a
                href="#top"
                className="yz-wordmark"
                style={{ fontSize: "1.9rem" }}
              >
                Osu!<span className="yz-wordmark__accent">Yuzu.</span>
              </a>
            </div>
            <p
              style={{
                marginTop: 12,
                color: "var(--yz-ink-muted)",
                fontSize: "var(--yz-text-sm)",
                maxWidth: "36ch",
              }}
            >
              {t.colophon.tagline}
            </p>
          </div>

          <div className="ed-matrix">
            <div className="ed-matrix__col">
              <h3 className="ed-matrix__head">{t.colophon.colFind}</h3>
              <ul>
                <li>
                  <a
                    href="https://osu.ppy.sh/community/forums/109"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ed-matrix__link"
                  >
                    <span className="ed-matrix__label">
                      {t.colophon.forumOfficial}
                    </span>
                    <span className="ed-matrix__handle">osu.ppy.sh</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://compendium.skinship.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ed-matrix__link"
                  >
                    <span className="ed-matrix__label">
                      {t.colophon.skinship}
                    </span>
                    <span className="ed-matrix__handle">skinship.xyz</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://skins.osuck.net/fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ed-matrix__link"
                  >
                    <span className="ed-matrix__label">{t.colophon.osuck}</span>
                    <span className="ed-matrix__handle">osuck.net</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://osuskins.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ed-matrix__link"
                  >
                    <span className="ed-matrix__label">
                      {t.colophon.osuskins}
                    </span>
                    <span className="ed-matrix__handle">osuskins.net</span>
                  </a>
                </li>
              </ul>
            </div>

            <div className="ed-matrix__col">
              <h3 className="ed-matrix__head">{t.colophon.colResources}</h3>
              <ul>
                <li>
                  <a
                    href="https://osu.ppy.sh/community/forums/119"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ed-matrix__link"
                  >
                    <span className="ed-matrix__label">
                      {t.colophon.skinsWip}
                    </span>
                    <span className="ed-matrix__handle">forum #119</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://osu.ppy.sh/community/forums/124"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ed-matrix__link"
                  >
                    <span className="ed-matrix__label">
                      {t.colophon.skinsRemixed}
                    </span>
                    <span className="ed-matrix__handle">forum #124</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.reddit.com/r/OsuSkins/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ed-matrix__link"
                  >
                    <span className="ed-matrix__label">{t.colophon.reddit}</span>
                    <span className="ed-matrix__handle">r/OsuSkins</span>
                  </a>
                </li>
              </ul>
            </div>

            <div className="ed-matrix__col">
              <h3 className="ed-matrix__head">{t.colophon.colEcosystem}</h3>
              <ul>
                <li>
                  <a href="https://yuzuctus.fr/" className="ed-matrix__link">
                    <span className="ed-matrix__label">yuzuctus.fr</span>
                    <span className="ed-matrix__handle">
                      {t.colophon.mainSiteDesc}
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://osurea.yuzuctus.fr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ed-matrix__link"
                  >
                    <span className="ed-matrix__label">Osurea</span>
                    <span className="ed-matrix__handle">
                      {t.colophon.osureaDesc}
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://fm.yuzuctus.fr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ed-matrix__link"
                  >
                    <span className="ed-matrix__label">FM.Yuzuctus</span>
                    <span className="ed-matrix__handle">fm.yuzuctus.fr</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://yuzuctus.fr/credit"
                    className="ed-matrix__link"
                  >
                    <span className="ed-matrix__label">
                      {t.colophon.creditsLabel}
                    </span>
                    <span className="ed-matrix__handle">
                      {t.colophon.creditsDesc}
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/Yuzuctus"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ed-matrix__link"
                  >
                    <span className="ed-matrix__label">GitHub</span>
                    <span className="ed-matrix__handle">@Yuzuctus</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="ed-colophon__bottom">
          <span>{t.colophon.copyright}</span>
          <div className="ed-colophon__meta-links">
            <span>
              {t.colophon.artBy}{" "}
              <a href="https://yuzuctus.fr/credit" className="ed-link-draw">
                KouriHase · Mazuko · Joa
              </a>
            </span>
            <a href="#top" className="ed-link-draw">
              {t.colophon.backToTop}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

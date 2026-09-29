export function Footer() {
  return (
    <footer id="footer" className="ag-footer" aria-label="Pied de page">
      <div className="ag-container ag-footer__inner">
        <p className="ag-footer__mass">
          OSU!
          <br />
          YUZU
        </p>
        <div className="ag-footer__cols">
          <div>
            <h3 className="ag-kicker">Trouver des skins</h3>
            <ul>
              <li>
                <a
                  href="https://osu.ppy.sh/community/forums/109"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Forum officiel osu!
                </a>
              </li>
              <li>
                <a
                  href="https://compendium.skinship.xyz/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Compendium Skinship
                </a>
              </li>
              <li>
                <a
                  href="https://skins.osuck.net/fr"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Osuck Skins
                </a>
              </li>
              <li>
                <a href="https://osuskins.net/" target="_blank" rel="noopener noreferrer">
                  OsuSkins.net
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="ag-kicker">Ressources</h3>
            <ul>
              <li>
                <a
                  href="https://osu.ppy.sh/community/forums/119"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Skins en développement
                </a>
              </li>
              <li>
                <a
                  href="https://osu.ppy.sh/community/forums/124"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Skins remixés
                </a>
              </li>
              <li>
                <a
                  href="https://www.reddit.com/r/OsuSkins/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Reddit OsuSkins
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="ag-kicker">Ailleurs</h3>
            <ul>
              <li>
                <a
                  href="https://osurea.yuzuctus.fr/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  OsuRea — visualiseur d&rsquo;area
                </a>
              </li>
              <li>
                <a href="https://yuzuctus.fr/">
                  yuzuctus.fr
                </a>
              </li>
              <li>
                <a href="https://github.com/Yuzuctus" target="_blank" rel="noopener noreferrer">
                  GitHub — Yuzuctus
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="ag-footer__meta">
          <span>© 2026 Yuzuctus</span>
          <span>
            Illustrations :{" "}
            <a
              href="https://x.com/Kourihase"
              target="_blank"
              rel="noopener noreferrer"
            >
              Kourihase
            </a>
          </span>
          <span>
            <a href="#top">Haut de page ↑</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

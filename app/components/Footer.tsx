export function Footer() {
  return (
    <footer id="footer" className="site-footer">
      <div className="container footer-content">
        <div className="footer-info">
          <h3>Osu!Yuzu</h3>
          <p>
            Ma collection personnelle de skins Osu! que j'utilise quand je joue.
            Tous les crédits vont aux créateurs originaux !
          </p>
        </div>
        <div className="footer-links">
          <h4>Trouve d'autres skins</h4>
          <ul>
            <li>
              <a
                href="https://osu.ppy.sh/community/forums/109"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-comments"></i> Forum officiel Osu!
              </a>
            </li>
            <li>
              <a
                href="https://compendium.skinship.xyz/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-book"></i> Compendium Skinship
              </a>
            </li>
            <li>
              <a
                href="https://skins.osuck.net/fr"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-palette"></i> Osuck Skins
              </a>
            </li>
            <li>
              <a
                href="https://osuskins.net/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-paint-brush"></i> OsuSkins.net
              </a>
            </li>
          </ul>
        </div>
        <div className="footer-links">
          <h4>Ressources utiles</h4>
          <ul>
            <li>
              <a
                href="https://osu.ppy.sh/community/forums/119"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-cogs"></i> Skins en développement
              </a>
            </li>
            <li>
              <a
                href="https://osu.ppy.sh/community/forums/124"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-random"></i> Skins remixés
              </a>
            </li>
            <li>
              <a
                href="https://www.reddit.com/r/OsuSkins/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-reddit-alien"></i> Reddit OsuSkins
              </a>
            </li>
          </ul>
        </div>
        <div className="footer-links">
          <h4>Mes autres projets</h4>
          <ul>
            <li>
              <a
                href="https://osurea.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-chart-area"></i> OsuRea Area visualizer
              </a>
            </li>
            <li>
              <a
                href="https://github.com/sammy08300"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-github"></i> Mon GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="copyright">
        <p>
          © 2026 Collection personnelle Yuzuctus • Tous les skins appartiennent
          à leurs créateurs respectifs
        </p>
      </div>
    </footer>
  );
}

type HeroProps = {
  skinCount: number;
};

export function Hero({ skinCount }: HeroProps) {
  return (
    <section className="skins-hero" aria-labelledby="t-home">
      <div className="ag-container">
        <div className="ag-hero">
          <div className="ag-hero__copy">
            <p className="ag-label">osu!standard · {skinCount} {skinCount === 1 ? "entrée" : "entrées"}</p>
            <h1 id="t-home" className="ag-hero__title skins-hero__title">
              <span>MES</span>
              <span className="ag-hero__accent">SKINS</span>
              <span>OSU</span>
            </h1>
            <p className="ag-hero__lead">Les skins que j’utilise vraiment quand je joue. Pioche dedans, c’est fait pour jouer.</p>
            <div className="ag-hero__actions">
              <a className="ag-action ag-action--solid" href="#collection">
                <span>Voir la collection ↓</span>
              </a>
            </div>
            <p className="ag-label skins-hero__colophon">Aperçus, crédits et téléchargements</p>
          </div>
          <figure className="ag-hero__art skins-hero__art">
            <div className="skins-hero__shape" aria-hidden="true" />
            <img
              className="skins-hero__image"
              src="/img/Characters/vgentou7.2-ct-web_Mazuko.png"
              alt="Portrait illustré de Yuzu par Mazuko"
              decoding="async"
              loading="eager"
              fetchPriority="high"
              width="1200"
              height="1200"
            />
            <figcaption className="skins-hero__credit">
              Illustration par{" "}
              <a href="https://vgen.co/Mazuko" target="_blank" rel="noopener noreferrer">
                Mazuko
              </a>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

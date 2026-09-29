type HeroProps = {
  skinCount: number;
};

export function Hero({ skinCount }: HeroProps) {
  return (
    <section className="ag-container ag-hero" aria-labelledby="t-home">
      <div className="ag-hero__copy">
        <p className="ag-kicker">osu!standard · {skinCount} {skinCount === 1 ? "entrée" : "entrées"}</p>
        <h1 id="t-home" className="ag-hero__title">
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
        <p className="ag-kicker skins-hero__colophon">Aperçus, crédits et téléchargements</p>
      </div>
      <figure className="ag-art ag-art--portrait ag-hero__art">
        <img
          src="/img/Characters/vgentou7.2-ct-web_Mazuko.png"
          alt="Portrait illustré de Yuzu par Mazuko"
          decoding="async"
          loading="eager"
          fetchPriority="high"
          width="1200"
          height="1200"
        />
        <figcaption className="ag-credit">
          Illustration par{" "}
          <a href="https://vgen.co/Mazuko" target="_blank" rel="noopener noreferrer">
            Mazuko
          </a>
        </figcaption>
      </figure>
    </section>
  );
}

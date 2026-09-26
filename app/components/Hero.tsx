export type HeroArt = {
  src: string;
  artist: string;
  url: string;
  framing: "right-cutout" | "center-cutout" | "plate";
};

export const HERO_CHARACTERS: HeroArt[] = [
  {
    src: "/img/Characters/yuzuchibi1_nobg_kourihase.png",
    artist: "Kourihase",
    url: "https://x.com/Kourihase",
    framing: "right-cutout",
  },
  {
    src: "/img/Characters/yuzuchibi1_nobg_nofog_kourihase.png",
    artist: "Kourihase",
    url: "https://x.com/Kourihase",
    framing: "right-cutout",
  },
  {
    src: "/img/Characters/yuzuchibi2_nobg_kourihase.png",
    artist: "Kourihase",
    url: "https://x.com/Kourihase",
    framing: "center-cutout",
  },
  {
    src: "/img/Characters/yuzuchibi3_nobg_kourihase.png",
    artist: "Kourihase",
    url: "https://x.com/Kourihase",
    framing: "center-cutout",
  },
  {
    src: "/img/Characters/vgentou7.2-ct-web_Mazuko.png",
    artist: "Mazuko",
    url: "https://vgen.co/Mazuko",
    framing: "plate",
  },
  {
    src: "/img/Characters/yuzuv2alt-web_kourihase.png",
    artist: "Kourihase",
    url: "https://x.com/Kourihase",
    framing: "plate",
  },
];

type HeroProps = {
  character: HeroArt;
  skinCount: number;
};

export function Hero({ character, skinCount }: HeroProps) {
  return (
    <section className="yz-stratum yz-cover" aria-labelledby="t-home">
      <div className="yz-wrap">
        <div className="yz-cover-meta yz-micro">
          <span>Collection personnelle</span>
          <span>osu!standard</span>
          <span>{skinCount} entrées</span>
          <span className="yz-push-right">ordre de préférence · 2026</span>
        </div>

        <h1 id="t-home" className="yz-massive">
          MES
          <br />
          SKINS<span className="yz-accent-mark">.</span>
        </h1>

        <div className="yz-grid yz-cover-body">
          <div className="yz-s1-5">
            <p className="yz-lead">
              Mes skins osu!standard, classés par préférence.
            </p>
            <p className="yz-cover-link">
              <a className="yz-plain-link" href="#t-main">
              Voir le skin utilisé actuellement ↓
              </a>
            </p>
          </div>

          <div className="yz-s9-12">
            <figure className="yz-hero-art yz-cut">
              <div className="yz-field">
                <img
                  className={`yz-art-${character.framing}`}
                  src={character.src}
                  alt={`Yuzu, personnage original — illustration de ${character.artist}`}
                  decoding="async"
                  loading="eager"
                  fetchPriority="high"
                  width="2000"
                  height="2000"
                />
              </div>
              <figcaption className="yz-credit">
                Illustration :{" "}
                <a href={character.url} target="_blank" rel="noopener noreferrer">
                  {character.artist}
                </a>
              </figcaption>
            </figure>
          </div>
        </div>

        <p className="yz-colophon yz-micro">
          Aperçus, crédits et téléchargements
        </p>
      </div>
    </section>
  );
}

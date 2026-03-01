import { useEffect, useRef, useState } from "react";

export const HERO_CHARACTERS = [
  "/img/Characters/yuzuchibi1_nobg.png",
  "/img/Characters/yuzuchibi1_nobg_nofog.png",
  "/img/Characters/yuzuchibi2_nobg.png",
  "/img/Characters/yuzuchibi3_nobg.png",
];

type HeroProps = {
  character: string;
};

export function Hero({ character }: HeroProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const pendingOffsetRef = useRef({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
    pendingOffsetRef.current = { x, y };

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        setOffset(pendingOffsetRef.current);
        rafRef.current = null;
      });
    }
  }

  function handleMouseLeave() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setOffset({ x: 0, y: 0 });
  }

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <section
      className="hero-section"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="container hero-container">
        <div className="hero-content">
          <div className="hero-header">
            <div className="logo-container">
              <h1>
                <span className="logo-text">Osu!</span>
                <span className="logo-accent">Yuzu</span>
              </h1>
            </div>
          </div>

          <div className="hero-tag">
            <i className="fas fa-gamepad"></i> Osu! Player
          </div>
          <h2 className="hero-title">
            Hello, I'm <span className="hero-name">Yuzuctus</span>.
          </h2>
          <p className="hero-subtitle">
            Voici ma collection personnelle de skins.
          </p>
          <div className="hero-buttons">
            <a href="#skins-container" className="btn-primary">
              <i className="fas fa-layer-group"></i> Mes Skins
            </a>
            <a href="#footer" className="btn-secondary">
              <i className="fab fa-github"></i> Contact
            </a>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-img-placeholder animate-float">
            <img
              src={character}
              alt="Yuzuctus Character"
              decoding="async"
              loading="eager"
              fetchPriority="high"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                transition: offset.x === 0 ? "transform 0.5s ease" : "none",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

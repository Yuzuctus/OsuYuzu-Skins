import { useEffect, useState } from "react";

export function Motif({ className = "yz-motif" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path d="M12 12 L12 2.8 A9.2 9.2 0 0 1 20.4 8.4 Z" fill="currentColor" />
    </svg>
  );
}

export function Dot() {
  return (
    <svg className="yz-dot" viewBox="0 0 10 10" aria-hidden="true">
      <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 5L5 1A4 4 0 0 1 8.8 3.6Z" fill="currentColor" />
    </svg>
  );
}

export function YzThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const next =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "dark" ? "#0d1311" : "#f2f4ed");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "dark" ? "#0d1311" : "#f2f4ed");
    localStorage.setItem("theme", next);
  }

  return (
    <button
      className="yz-theme-btn"
      onClick={toggle}
      aria-pressed={theme === "dark"}
      aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
    >
      {theme === "dark" ? "Clair" : "Sombre"}
    </button>
  );
}

export function SiteNav() {
  return (
    <header className="yz-nav">
      <div className="yz-wrap">
        <a className="yz-brand" href="#top" aria-label="Osu!Yuzu — haut de page">
          <Motif />
          <span>
            <b>OSU!</b>YUZU
          </span>
        </a>
        <nav className="yz-nav-links" aria-label="Navigation">
          <a href="#collection" aria-current="page">
            <Dot />
            Collection
          </a>
          <a href="#footer">
            <Dot />
            Me trouver
          </a>
          <a href="https://yuzuctus.fr/">
            <Dot />
            yuzuctus.fr
          </a>
        </nav>
        <YzThemeToggle />
      </div>
    </header>
  );
}

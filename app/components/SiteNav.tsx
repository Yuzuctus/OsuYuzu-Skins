import { useEffect, useState } from "react";

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
      ?.setAttribute("content", next === "dark" ? "#1c2721" : "#fcf7ee");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "dark" ? "#1c2721" : "#fcf7ee");
    localStorage.setItem("theme", next);
  }

  return (
    <button
      className="ag-toggle"
      onClick={toggle}
      aria-pressed={theme === "dark"}
      aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
    >
      {theme === "dark" ? "Clair" : "Sombre"}
    </button>
  );
}

export function SiteNav() {
  const [currentSection, setCurrentSection] = useState<"collection" | "footer">("collection");

  useEffect(() => {
    const footer = document.getElementById("footer");
    if (!footer) return;

    const updateCurrentSection = () => {
      setCurrentSection(
        footer.getBoundingClientRect().top <= window.innerHeight * 0.6
          ? "footer"
          : "collection",
      );
    };

    updateCurrentSection();
    window.addEventListener("scroll", updateCurrentSection, { passive: true });
    window.addEventListener("resize", updateCurrentSection);
    return () => {
      window.removeEventListener("scroll", updateCurrentSection);
      window.removeEventListener("resize", updateCurrentSection);
    };
  }, []);

  return (
    <header className="ag-site-header skins-nav">
      <div className="ag-container ag-site-header__inner">
        <a className="ag-site-header__brand skins-nav__brand" href="#top" aria-label="Osu!Yuzu — haut de page">
          <span>
            <b>OSU!</b>YUZU
          </span>
        </a>
        <nav className="ag-site-header__nav" aria-label="Navigation">
          <a href="#collection" aria-current={currentSection === "collection" ? "location" : undefined}>
            Collection
          </a>
          <a href="#footer" aria-current={currentSection === "footer" ? "location" : undefined}>
            Me trouver
          </a>
          <a href="https://yuzuctus.fr/">
            yuzuctus.fr
          </a>
        </nav>
        <div className="ag-site-header__controls"><YzThemeToggle /></div>
      </div>
    </header>
  );
}

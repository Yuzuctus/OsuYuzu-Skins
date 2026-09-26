import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";
    if (current === "light") {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", "#f2f4ed");
    } else {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", "#0d1311");
    }
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
      className="theme-toggle-fixed"
      onClick={toggle}
      aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
      aria-pressed={theme === "dark"}
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</span>
    </button>
  );
}

import { useEffect, useState } from "react";

export function ThemeToggle({ inline = false }: { inline?: boolean }) {
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
        ?.setAttribute("content", "#f3f6ea");
    } else {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", "#131c17");
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "dark" ? "#131c17" : "#f3f6ea");
    localStorage.setItem("theme", next);
  }

  return (
    <button
      className={inline ? "ag-toggle" : "ag-toggle admin-theme-fixed"}
      onClick={toggle}
      aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
      aria-pressed={theme === "dark"}
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</span>
    </button>
  );
}

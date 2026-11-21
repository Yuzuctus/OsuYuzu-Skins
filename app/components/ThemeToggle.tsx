import { useEffect, useState } from "react";
import { FilmSwitch } from "~/design-system/core/FilmSwitch";
import type { FilmMode } from "~/design-system/tokens";
import { FILM_STORAGE_KEY } from "~/lib/i18n";

export function ThemeToggle({ inline = false }: { inline?: boolean }) {
  const [film, setFilm] = useState<FilmMode>("negative");

  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-film") === "positive"
        ? "positive"
        : "negative";
    setFilm(current);
  }, []);

  function handleFilmChange(next: FilmMode) {
    setFilm(next);
    document.documentElement.setAttribute("data-film", next);
    document.documentElement.setAttribute(
      "data-theme",
      next === "positive" ? "light" : "dark",
    );
    try {
      localStorage.setItem(FILM_STORAGE_KEY, next);
      localStorage.setItem("theme", next === "positive" ? "light" : "dark");
    } catch {
      // ignore
    }
  }

  if (inline) {
    return <FilmSwitch film={film} onChange={handleFilmChange} />;
  }

  return (
    <div className="admin-theme-fixed">
      <FilmSwitch film={film} onChange={handleFilmChange} />
    </div>
  );
}

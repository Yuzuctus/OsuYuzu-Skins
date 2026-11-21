import { useEffect, useState } from "react";
import { COPY, type Lang } from "~/lib/i18n";

export function BackToTop({ lang = "fr" }: { lang?: Lang }) {
  const [visible, setVisible] = useState(false);
  const t = COPY[lang];

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 420);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <a
      className={`sk-to-top${visible ? " is-visible" : ""}`}
      href="#top"
      aria-label={t.colophon.backToTop}
      title={t.colophon.backToTop}
    >
      ↑
    </a>
  );
}

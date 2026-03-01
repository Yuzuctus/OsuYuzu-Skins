import { useEffect, useState } from "react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 300);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      id="back-to-top"
      className={visible ? "visible" : ""}
      onClick={scrollToTop}
      aria-label="Back to Top"
    >
      <i className="fas fa-arrow-up"></i>
    </button>
  );
}

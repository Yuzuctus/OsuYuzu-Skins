import { useState, useMemo } from "react";
import type { Route } from "./+types/home";
import { getAllSkins, getAllTags } from "~/lib/db.server";
import { HERO_CHARACTERS, Hero } from "~/components/Hero";
import { SkinGrid } from "~/components/SkinGrid";
import { TagFilter } from "~/components/TagFilter";
import { ThemeToggle } from "~/components/ThemeToggle";
import { BackToTop } from "~/components/BackToTop";
import { Footer } from "~/components/Footer";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yuzuctus Osu Skins - Ma Collection Personnelle" },
    {
      name: "description",
      content:
        "Découvre les skins Osu! que j'utilise quand je joue\u00A0! Collection personnelle de Yuzuctus avec téléchargements gratuits.",
    },
    {
      name: "keywords",
      content:
        "yuzuctus, osu skins, collection personnelle, skins osu gratuits, télécharger skins osu",
    },
    { name: "author", content: "Yuzuctus" },
    {
      property: "og:title",
      content: "Skins Osu! de Yuzuctus - Ma Collection Personnelle",
    },
    {
      property: "og:description",
      content:
        "Découvre les skins Osu! que j'utilise personnellement quand je joue. Téléchargement gratuit\u00A0!",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://skins.yuzuctus.fr/" },
    { property: "og:image", content: "/img/og-preview.png" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const [skins, tags] = await Promise.all([getAllSkins(db), getAllTags(db)]);
  const heroCharacter =
    HERO_CHARACTERS[Math.floor(Math.random() * HERO_CHARACTERS.length)] ??
    HERO_CHARACTERS[0];

  return { skins, tags, heroCharacter };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { skins, tags, heroCharacter } = loaderData;
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);

  const filteredSkins = useMemo(() => {
    if (activeTagIds.length === 0) return skins;
    return skins.filter((skin) =>
      activeTagIds.every((tagId) => skin.tags.some((t) => t.id === tagId)),
    );
  }, [skins, activeTagIds]);

  return (
    <>
      <ThemeToggle />

      <main>
        <Hero character={heroCharacter} />

        <section className="skins-section">
          <div className="container">
            <h3 className="section-title">My Collection</h3>
            <TagFilter tags={tags} onFilter={setActiveTagIds} />
            <SkinGrid skins={filteredSkins} />
          </div>
        </section>
      </main>

      <Footer />
      <BackToTop />
    </>
  );
}

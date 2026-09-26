import type { Route } from "./+types/home";
import { getAllSkins } from "~/lib/db.server";
import { HERO_CHARACTERS, Hero } from "~/components/Hero";
import { FeaturedSkin, SkinDirectory } from "~/components/SkinIndex";
import { SiteNav } from "~/components/SiteNav";
import { BackToTop } from "~/components/BackToTop";
import { Footer } from "~/components/Footer";
import stylesUrl from "~/styles/skins-system.css?url";
import collectionStylesUrl from "~/styles/skins-collection.css?url";
import responsiveStylesUrl from "~/styles/skins-responsive.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap",
  },
  { rel: "stylesheet", href: stylesUrl },
  { rel: "stylesheet", href: collectionStylesUrl },
  { rel: "stylesheet", href: responsiveStylesUrl },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Skins osu!standard de Yuzuctus" },
    {
      name: "description",
      content:
        "Skins osu!standard utilisés par Yuzuctus, classés par préférence. Aperçus, crédits et liens de téléchargement.",
    },
    {
      name: "keywords",
      content: "yuzuctus, osu!standard, skins osu, téléchargements",
    },
    { name: "author", content: "Yuzuctus" },
    {
      property: "og:title",
      content: "Skins osu!standard de Yuzuctus",
    },
    {
      property: "og:description",
      content:
        "Skins osu!standard classés par préférence, avec aperçus, crédits et téléchargements.",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://skins.yuzuctus.fr/" },
    {
      property: "og:image",
      content: "https://skins.yuzuctus.fr/img/Characters/yuzuchibi1_nobg_kourihase.png",
    },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const skins = await getAllSkins(db);
  const heroCharacter =
    HERO_CHARACTERS[Math.floor(Math.random() * HERO_CHARACTERS.length)] ??
    HERO_CHARACTERS[0];

  return { skins, heroCharacter };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { skins, heroCharacter } = loaderData;
  const main = skins[0];
  const rest = skins.slice(1);

  return (
    <div
      className="yz-body"
      id="top"
      data-page-tone="library"
      data-product-mode="library"
    >
      <a className="yz-skip" href="#collection">
        Aller à la collection
      </a>
      <SiteNav />

      <main>
        <Hero character={heroCharacter} skinCount={skins.length} />

        <div className="yz-stratum thin" aria-label="Informations sur la collection">
          <div className="yz-wrap yz-strip yz-micro">
            <span>
              <strong>{skins.length}</strong> skins
            </span>
            <span>
              <strong>1</strong> main
            </span>
            <span>osu!standard</span>
            <span>skins.yuzuctus.fr</span>
            <span>Ordre = ordre de préférence</span>
            <a className="yz-strip-action" href="/api/download-all">
              Tout prendre (.zip) ↓
            </a>
          </div>
        </div>

        {main && <FeaturedSkin skin={main} />}

        <section
          className="yz-stratum"
          id="collection"
          aria-labelledby="t-collection"
        >
          <div className="yz-wrap">
            <div className="yz-grid yz-collection-heading">
              <p className="yz-micro yz-s1-2">02 — Collection</p>
              <h2 id="t-collection" className="yz-section-title yz-s3-8">
                La collection
              </h2>
            </div>
            <SkinDirectory skins={rest} startRank={2} />
          </div>
        </section>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}

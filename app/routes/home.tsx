import type { Route } from "./+types/home";
import { getAllSkins, getMaxSkinUpdatedAt } from "~/lib/db.server";
import { Hero } from "~/components/Hero";
import { FeaturedSkin, SkinDirectory } from "~/components/SkinIndex";
import { SiteNav } from "~/components/SiteNav";
import { BackToTop } from "~/components/BackToTop";
import { Footer } from "~/components/Footer";
import collectionStylesUrl from "~/styles/skins-agrume.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: "/agrume.css" },
  { rel: "stylesheet", href: collectionStylesUrl },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mes skins osu — carnet personnel de Yuzuctus" },
    {
      name: "description",
      content:
        "Les skins osu! que j'utilise vraiment quand je joue. Gratuits, avec les crédits des créateurs.",
    },
    {
      name: "keywords",
      content: "yuzuctus, osu!standard, skins osu, téléchargements",
    },
    { name: "author", content: "Yuzuctus" },
    {
      property: "og:title",
      content: "Mes skins osu — carnet personnel de Yuzuctus",
    },
    {
      property: "og:description",
      content:
        "Les skins que j'utilise vraiment quand je joue. Pioche dedans, c'est fait pour jouer.",
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
  const [skins, lastModifiedAt] = await Promise.all([
    getAllSkins(db),
    getMaxSkinUpdatedAt(db),
  ]);
  return { skins, lastModifiedAt };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { skins, lastModifiedAt } = loaderData;
  const main = skins[0];
  const rest = skins.slice(1);
  const lastModifiedDate = lastModifiedAt
    ? new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Europe/Paris",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(lastModifiedAt))
    : null;

  return (
    <div className="ag skins-app" id="top">
      <a className="ag-skip-link" href="#collection">
        Aller à la collection
      </a>
      <SiteNav />

      <main id="main">
        <Hero skinCount={skins.length} />

        <div className="skins-facts" aria-label="Informations sur la collection">
          <div className="ag-container skins-facts__inner ag-label">
            <span>
              <strong>{skins.length}</strong> skins
            </span>
            {lastModifiedAt && lastModifiedDate && (
              <span>
                Dernière modification le : <time dateTime={lastModifiedAt}>{lastModifiedDate}</time>
              </span>
            )}
            {main && (
              <a className="ag-action ag-action--text skins-facts__action" href="/api/download-all">
                <span>Tout prendre (.zip) ↓</span>
              </a>
            )}
          </div>
        </div>

        {main && <FeaturedSkin skin={main} />}

        <section className="ag-section skins-collection" id="collection" aria-labelledby="t-collection">
          <div className="ag-container">
            <div className="ag-section-heading">
              <h2 id="t-collection" className="ag-section-title">
                La collection
              </h2>
              <p className="ag-section-heading__note">02 — Collection · ordre de préférence</p>
            </div>
            {skins.length === 0 ? (
              <div className="ag-state">
                <p className="ag-state__title">La collection est vide.</p>
                <p className="ag-state__body">Les skins apparaîtront ici dès qu'ils seront disponibles.</p>
              </div>
            ) : (
              <SkinDirectory skins={rest} startRank={2} />
            )}
          </div>
        </section>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}

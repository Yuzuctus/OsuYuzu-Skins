import type { Route } from "./+types/osu-direct._index";
import { Link } from "react-router";
import { getAllSkins, getAllTags } from "~/lib/db.server";
import { requireAdminSession } from "~/lib/security.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  await requireAdminSession(request, db);
  const [skins, tags] = await Promise.all([getAllSkins(db), getAllTags(db)]);
  return { skinCount: skins.length, tagCount: tags.length };
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
  const { skinCount, tagCount } = loaderData;

  return (
    <>
      <div className="ag-page-head">
        <h1 className="ag-page-head__title">Dashboard</h1>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="stat-value">{skinCount}</div>
          <div className="ag-kicker stat-label">Skins</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-value">{tagCount}</div>
          <div className="ag-kicker stat-label">Tags</div>
        </div>
      </div>

      <section className="ag-section">
        <div className="ag-section__head">
          <h3 className="ag-section__title">Actions rapides</h3>
        </div>
        <div className="admin-quick-actions">
          <Link to="/osu-direct/skins/new" className="ag-button ag-button--solid">
            Ajouter un skin
          </Link>
          <Link to="/osu-direct/skins" className="ag-button ag-button--quiet">
            Réordonner les skins
          </Link>
          <Link to="/osu-direct/tags" className="ag-button ag-button--quiet">
            Gérer les tags
          </Link>
        </div>
      </section>
    </>
  );
}

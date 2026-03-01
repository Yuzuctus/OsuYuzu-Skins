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
      <div className="admin-page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="stat-value">{skinCount}</div>
          <div className="stat-label">Skins</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-value">{tagCount}</div>
          <div className="stat-label">Tags</div>
        </div>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>Actions rapides</h3>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link to="/osu-direct/skins/new" className="btn-primary">
            <i className="fas fa-plus"></i> Ajouter un skin
          </Link>
          <Link to="/osu-direct/skins" className="btn-secondary">
            <i className="fas fa-sort"></i> Réordonner les skins
          </Link>
          <Link to="/osu-direct/tags" className="btn-secondary">
            <i className="fas fa-tags"></i> Gérer les tags
          </Link>
        </div>
      </div>
    </>
  );
}

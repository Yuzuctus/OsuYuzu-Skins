import { Outlet, NavLink, redirect, Form } from "react-router";
import type { Route } from "./+types/osu-direct";
import { getAdmin, cleanExpiredSessions } from "~/lib/db.server";
import { requireAdminSession } from "~/lib/security.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;

  // Check if admin exists
  const admin = await getAdmin(db);
  if (!admin) {
    return redirect("/osu-direct/setup");
  }

  await requireAdminSession(request, db);

  // Probabilistic cleanup of expired sessions (~5% of requests)
  if (Math.random() < 0.05) {
    void cleanExpiredSessions(db);
  }

  return { admin: { username: admin.username } };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { admin } = loaderData;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>
            <span className="logo-text">Osu!</span>
            <span className="logo-accent">Direct</span>
          </h2>
          <span className="admin-badge">
            <i className="fas fa-shield-halved"></i> Admin
          </span>
        </div>
        <nav className="admin-nav">
          <NavLink
            to="/osu-direct"
            end
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <i className="fas fa-home"></i> Dashboard
          </NavLink>
          <NavLink
            to="/osu-direct/skins"
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <i className="fas fa-palette"></i> Skins
          </NavLink>
          <NavLink
            to="/osu-direct/tags"
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <i className="fas fa-tags"></i> Tags
          </NavLink>
          <a href="/" className="admin-nav-link" target="_blank">
            <i className="fas fa-external-link-alt"></i> Voir le site
          </a>
          <Form method="post" action="/osu-direct/logout" style={{ margin: 0 }}>
            <button type="submit" className="admin-nav-link logout-btn">
              <i className="fas fa-sign-out-alt"></i> Déconnexion
            </button>
          </Form>
        </nav>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

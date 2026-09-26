import { Outlet, NavLink, redirect, Form } from "react-router";
import type { Route } from "./+types/osu-direct";
import { BundleBanner } from "~/components/BundleBanner";
import { ThemeToggle } from "~/components/ThemeToggle";
import { getAdmin, cleanExpiredSessions } from "~/lib/db.server";
import { requireAdminSession } from "~/lib/security.server";
import stylesUrl from "~/styles/styles.css?url";
import adminUrl from "~/styles/admin.css?url";
import agrumeAdminUrl from "~/styles/admin-agrume.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: stylesUrl },
  { rel: "stylesheet", href: adminUrl },
  { rel: "stylesheet", href: agrumeAdminUrl },
];

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
    <div
      className="admin-layout"
      data-page-tone="tool"
      data-product-mode="admin"
    >
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>
            <span className="logo-text">Osu!</span>
            <span className="logo-accent">Direct</span>
          </h2>
          <span className="admin-badge">
            Admin
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
            Dashboard
          </NavLink>
          <NavLink
            to="/osu-direct/skins"
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
          >
            Skins
          </NavLink>
          <NavLink
            to="/osu-direct/tags"
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
          >
            Tags
          </NavLink>
          <a href="/" className="admin-nav-link" target="_blank">
            Voir le site
          </a>
          <Form method="post" action="/osu-direct/logout" className="admin-logout-form">
            <button type="submit" className="admin-nav-link logout-btn">
              Déconnexion
            </button>
          </Form>
        </nav>
        <ThemeToggle inline />
      </aside>
      <main className="admin-main">
        <BundleBanner />
        <Outlet />
      </main>
    </div>
  );
}

import { Outlet, NavLink, redirect, Form } from "react-router";
import type { Route } from "./+types/osu-direct";
import { BundleBanner } from "~/components/BundleBanner";
import { ThemeToggle } from "~/components/ThemeToggle";
import { getAdmin, cleanExpiredSessions } from "~/lib/db.server";
import { requireAdminSession } from "~/lib/security.server";
import agAppUrl from "~/styles/agrume/app.css?url";
import adminUrl from "~/styles/admin.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: agAppUrl },
  { rel: "stylesheet", href: adminUrl },
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
      <aside className="ag-site-header">
        <div className="ag-container ag-site-header__inner">
          <div className="admin-brand">
            <h2 className="ag-wordmark">
              Osu!<span className="ag-wordmark__accent">Direct</span>
            </h2>
            <span className="ag-kicker">Admin</span>
          </div>
          <nav className="ag-site-header__nav" aria-label="Administration">
            {/* NavLink sets aria-current="page" on the active link. */}
            <NavLink to="/osu-direct" end>
              Dashboard
            </NavLink>
            <NavLink to="/osu-direct/skins">Skins</NavLink>
            <NavLink to="/osu-direct/tags">Tags</NavLink>
            <a href="/" target="_blank">
              Voir le site
            </a>
            <Form method="post" action="/osu-direct/logout">
              <button type="submit">
                Déconnexion
              </button>
            </Form>
          </nav>
          <div className="ag-site-header__controls">
            <ThemeToggle inline />
          </div>
        </div>
      </aside>
      <main className="ag-container admin-main">
        <BundleBanner />
        <Outlet />
      </main>
    </div>
  );
}

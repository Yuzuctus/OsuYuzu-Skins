import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
// Agrume v3 core, copied verbatim from the kit (see README, "Design").
import agFontsUrl from "~/styles/agrume/fonts.css?url";
import agTokensUrl from "~/styles/agrume/tokens.css?url";
import agBaseUrl from "~/styles/agrume/base.css?url";
import agComponentsUrl from "~/styles/agrume/components.css?url";
import rootStylesUrl from "~/styles/root.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/favicon.svg" },
  { rel: "manifest", href: "/manifest.json" },
  { rel: "stylesheet", href: agFontsUrl },
  { rel: "stylesheet", href: agTokensUrl },
  { rel: "stylesheet", href: agBaseUrl },
  { rel: "stylesheet", href: agComponentsUrl },
  { rel: "stylesheet", href: rootStylesUrl },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#131c17" />
        <meta
          name="google-site-verification"
          content="TaES03KbkWLutAmQcc_QLwMWPLjYTguUHQoTviS0PAQ"
        />
        <Meta />
        <Links />
        {/* Anti-FOUC: apply saved theme before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";try{var s=localStorage.getItem("theme");if(s==="light"||s==="dark")t=s}catch(e){}document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="dark"?"#131c17":"#f3f6ea");if(history.scrollRestoration)history.scrollRestoration="manual";window.scrollTo(0,0)})()`,
          }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oups !";
  let details = "Une erreur inattendue est survenue.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Erreur";
    details =
      error.status === 404
        ? "Cette page n'existe pas."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="ag-container root-error">
      <p className="ag-kicker">Osu!Yuzu</p>
      <h1 className="ag-hero__title">{message}</h1>
      <p className="ag-hero__lead">{details}</p>
      <div className="ag-hero__actions">
        <a className="ag-action ag-action--text" href="/">
          <span>Retour à la collection</span>
        </a>
      </div>
      {stack && (
        <pre className="root-error__stack">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

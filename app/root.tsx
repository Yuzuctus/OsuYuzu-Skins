import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import yzTokensUrl from "~/design-system/tokens/tokens.css?url";
import yzBaseUrl from "~/design-system/core/base.css?url";
import yzComponentsUrl from "~/design-system/core/components.css?url";
import rootStylesUrl from "~/styles/root.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/favicon.svg" },
  { rel: "manifest", href: "/manifest.json" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600;700&family=Martian+Mono:wght@400;500;600&display=swap",
  },
  { rel: "stylesheet", href: yzTokensUrl },
  { rel: "stylesheet", href: yzBaseUrl },
  { rel: "stylesheet", href: yzComponentsUrl },
  { rel: "stylesheet", href: rootStylesUrl },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-film="negative" data-theme="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark light" />
        <meta name="theme-color" content="#0b0f0e" />
        <meta
          name="google-site-verification"
          content="TaES03KbkWLutAmQcc_QLwMWPLjYTguUHQoTviS0PAQ"
        />
        <Meta />
        <Links />
        {/* Anti-FOUC: apply saved film mode (negative / positive) and language before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var f="negative";try{var s=localStorage.getItem("yuzuctus-film");if(s==="positive"||s==="negative"){f=s}else{var lt=localStorage.getItem("theme");if(lt==="light")f="positive";else if(lt==="dark")f="negative"}var lg=localStorage.getItem("yuzuctus-language");if(lg==="fr"||lg==="en")document.documentElement.lang=lg}catch(e){}document.documentElement.setAttribute("data-film",f);document.documentElement.setAttribute("data-theme",f==="positive"?"light":"dark");var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",f==="negative"?"#0b0f0e":"#f5eee0")})()`,
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
    <main className="yz-container root-error">
      <p className="yz-mono root-error__kicker">OSU!YUZU · SKINS</p>
      <h1 className="yz-display root-error__title">{message}</h1>
      <p className="root-error__lead">{details}</p>
      <div className="root-error__actions">
        <a className="yz-btn yz-btn--solid" href="/">
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

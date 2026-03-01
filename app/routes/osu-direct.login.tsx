import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/osu-direct.login";
import { getAdmin, getSession, createSession } from "~/lib/db.server";
import { verifyPassword, verifyTOTP } from "~/lib/auth.server";
import { getSessionId, createSessionCookie } from "~/lib/session.server";
import { assertSameOrigin } from "~/lib/security.server";
import { ThemeToggle } from "~/components/ThemeToggle";

export function meta() {
  return [{ title: "OsuDirect — Login" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;

  // Check if admin exists
  const admin = await getAdmin(db);
  if (!admin) {
    return redirect("/osu-direct/setup");
  }

  // If already logged in, redirect to dashboard
  const sessionId = getSessionId(request);
  if (sessionId) {
    const session = await getSession(db, sessionId);
    if (session) {
      return redirect("/osu-direct");
    }
  }

  return { error: null };
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
  assertSameOrigin(request);

  const formData = await request.formData();
  const username = (formData.get("username") as string)?.trim();
  const password = (formData.get("password") as string) || "";
  const totpCode = (formData.get("totp") as string)?.trim();

  if (!username || !password || !totpCode) {
    return { error: "Tous les champs sont requis." };
  }

  if (totpCode.length !== 6 || !/^\d{6}$/.test(totpCode)) {
    return { error: "Code 2FA invalide." };
  }

  const admin = await getAdmin(db);
  if (!admin) {
    return { error: "Aucun compte admin configuré." };
  }

  // Verify username (case-insensitive)
  if (admin.username.toLowerCase() !== username.toLowerCase()) {
    return { error: "Identifiants incorrects." };
  }

  // Verify password
  const validPassword = await verifyPassword(password, admin.password_hash);
  if (!validPassword) {
    return { error: "Identifiants incorrects." };
  }

  // Verify TOTP
  if (admin.totp_enabled && admin.totp_secret) {
    const validTotp = verifyTOTP(admin.totp_secret, totpCode);
    if (!validTotp) {
      return { error: "Code 2FA invalide." };
    }
  }

  // Create session
  const sessionId = await createSession(db, admin.id);

  return redirect("/osu-direct", {
    headers: {
      "Set-Cookie": createSessionCookie(sessionId),
    },
  });
}

export default function LoginPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const error = actionData?.error;

  return (
    <>
      <ThemeToggle />
      <div className="login-container">
        <div className="login-card">
          <h1>
            <span className="logo-text">Osu!</span>
            <span className="logo-accent">Direct</span>
          </h1>
          <p className="login-subtitle">Connexion au panel admin</p>

          {error && <div className="login-error">{error}</div>}

          <Form method="post">
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Nom d'utilisateur
              </label>
              <input
                className="form-input"
                type="text"
                id="username"
                name="username"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Mot de passe
              </label>
              <input
                className="form-input"
                type="password"
                id="password"
                name="password"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="totp">
                Code 2FA (Bitwarden)
              </label>
              <input
                className="form-input"
                type="text"
                id="totp"
                name="totp"
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Connexion...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i> Se connecter
                </>
              )}
            </button>
          </Form>
        </div>
      </div>
    </>
  );
}

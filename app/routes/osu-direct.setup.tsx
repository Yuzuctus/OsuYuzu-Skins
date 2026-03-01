import { useState } from "react";
import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/osu-direct.setup";
import { getAdmin, createAdmin } from "~/lib/db.server";
import {
  hashPassword,
  generateTOTPSecret,
  getTOTPUri,
  verifyTOTP,
} from "~/lib/auth.server";
import { assertSameOrigin } from "~/lib/security.server";
import { ThemeToggle } from "~/components/ThemeToggle";
import { QRCodeSVG } from "qrcode.react";

export function meta() {
  return [{ title: "OsuDirect — Configuration initiale" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;

  // If admin already exists, redirect to login
  const admin = await getAdmin(db);
  if (admin) {
    return redirect("/osu-direct/login");
  }

  // Generate a TOTP secret for setup
  const totpSecret = generateTOTPSecret();
  const totpUri = getTOTPUri(totpSecret, "admin");

  return { totpSecret, totpUri };
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
  assertSameOrigin(request);

  // Check if admin already exists
  const existing = await getAdmin(db);
  if (existing) {
    return redirect("/osu-direct/login");
  }

  const formData = await request.formData();
  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const totpSecret = (formData.get("totpSecret") as string)?.trim();
  const totpCode = (formData.get("totpCode") as string)?.trim();

  if (!username || !password || !totpSecret || !totpCode) {
    return {
      error: "Tous les champs sont requis.",
      totpSecret,
      totpUri: getTOTPUri(totpSecret, "admin"),
    };
  }

  if (password.length < 8) {
    return {
      error: "Le mot de passe doit faire au moins 8 caractères.",
      totpSecret,
      totpUri: getTOTPUri(totpSecret, "admin"),
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Les mots de passe ne correspondent pas.",
      totpSecret,
      totpUri: getTOTPUri(totpSecret, "admin"),
    };
  }

  // Verify the TOTP code to make sure setup is correct
  const validTotp = verifyTOTP(totpSecret, totpCode);
  if (!validTotp) {
    return {
      error:
        "Code 2FA invalide. Scannez le QR code avec Bitwarden et réessayez.",
      totpSecret,
      totpUri: getTOTPUri(totpSecret, "admin"),
    };
  }

  // Create admin
  const passwordHash = await hashPassword(password);
  await createAdmin(db, {
    username,
    password_hash: passwordHash,
    totp_secret: totpSecret,
  });

  return redirect("/osu-direct/login");
}

export default function SetupPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const totpSecret = actionData?.totpSecret || loaderData.totpSecret;
  const totpUri = actionData?.totpUri || loaderData.totpUri;
  const error = actionData?.error;

  return (
    <>
      <ThemeToggle />
      <div className="setup-container">
        <div className="setup-card">
          <h1>
            <span className="logo-text">Osu!</span>
            <span className="logo-accent">Direct</span>
          </h1>
          <p className="setup-subtitle">
            Configuration initiale du compte admin
          </p>

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
                minLength={8}
              />
              <p className="form-hint">Minimum 8 caractères</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirmer le mot de passe
              </label>
              <input
                className="form-input"
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                2FA — Scannez ce QR code avec Bitwarden
              </label>
              <div className="qr-container">
                <QRCodeSVG value={totpUri} size={200} />
              </div>
              <div className="totp-secret-display">{totpSecret}</div>
              <p className="form-hint">
                Ou entrez ce code manuellement dans Bitwarden
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="totpCode">
                Vérification — Entrez le code 2FA généré
              </label>
              <input
                className="form-input"
                type="text"
                id="totpCode"
                name="totpCode"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
              />
            </div>

            <input type="hidden" name="totpSecret" value={totpSecret} />

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Création...
                </>
              ) : (
                <>
                  <i className="fas fa-user-shield"></i> Créer le compte admin
                </>
              )}
            </button>
          </Form>
        </div>
      </div>
    </>
  );
}

import { redirect } from "react-router";
import type { Route } from "./+types/osu-direct.logout";
import { getSessionId, deleteSessionCookie } from "~/lib/session.server";
import { deleteSession } from "~/lib/db.server";
import { assertSameOrigin, requireAdminSession } from "~/lib/security.server";

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
  await requireAdminSession(request, db);
  assertSameOrigin(request);

  const sessionId = getSessionId(request);

  if (sessionId) {
    await deleteSession(db, sessionId);
  }

  return redirect("/osu-direct/login", {
    headers: {
      "Set-Cookie": deleteSessionCookie(),
    },
  });
}

// Redirect GET requests to admin dashboard
export async function loader() {
  return redirect("/osu-direct");
}

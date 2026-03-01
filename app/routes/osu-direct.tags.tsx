import { useState } from "react";
import { Form, useFetcher } from "react-router";
import type { Route } from "./+types/osu-direct.tags";
import { getAllTags, createTag, updateTag, deleteTag } from "~/lib/db.server";
import { assertSameOrigin, requireAdminSession } from "~/lib/security.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  await requireAdminSession(request, db);
  const tags = await getAllTags(db);
  return { tags };
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
  await requireAdminSession(request, db);
  assertSameOrigin(request);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create") {
    const name = formData.get("name") as string;
    const color = formData.get("color") as string;
    if (!name) return { error: "Le nom est requis." };

    const id = `tag-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    try {
      await createTag(db, { id, name, color: color || "#34d399" });
    } catch {
      return { error: "Un tag avec ce nom existe déjà." };
    }
    return { success: true, message: `Tag "${name}" créé\u00A0!` };
  }

  if (intent === "update") {
    const tagId = formData.get("tagId") as string;
    const color = formData.get("color") as string;
    await updateTag(db, tagId, { color });
    return { success: true, message: "Couleur mise à jour\u00A0!" };
  }

  if (intent === "delete") {
    const tagId = formData.get("tagId") as string;
    await deleteTag(db, tagId);
    return { success: true, message: "Tag supprimé\u00A0!" };
  }

  return { error: "Action inconnue" };
}

export default function TagsAdmin({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { tags } = loaderData;
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#34d399");
  const fetcher = useFetcher();

  return (
    <>
      <div className="admin-page-header">
        <h1>Gestion des Tags</h1>
      </div>

      {actionData?.message && (
        <div
          className={`toast ${actionData.success ? "toast-success" : "toast-error"}`}
          style={{
            position: "relative",
            bottom: "auto",
            right: "auto",
            marginBottom: "1rem",
          }}
        >
          {actionData.message}
        </div>
      )}
      {actionData?.error && (
        <div className="login-error" style={{ maxWidth: 500 }}>
          {actionData.error}
        </div>
      )}

      {/* Add new tag */}
      <Form
        method="post"
        className="tag-add-form"
        style={{ marginBottom: "2rem", maxWidth: 500 }}
      >
        <input type="hidden" name="intent" value="create" />
        <input
          className="form-input"
          type="text"
          name="name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom du tag (ex: Stream)"
          required
        />
        <input
          type="color"
          name="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="tag-manager-color"
          style={{ width: 40, height: 40, border: "none", cursor: "pointer" }}
        />
        <button type="submit" className="btn-primary btn-small">
          <i className="fas fa-plus"></i> Ajouter
        </button>
      </Form>

      {/* Tag list */}
      <div className="tag-manager-list">
        {tags.map((tag) => (
          <div key={tag.id} className="tag-manager-item">
            <fetcher.Form
              method="post"
              style={{ display: "flex", alignItems: "center" }}
            >
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="tagId" value={tag.id} />
              <input
                type="color"
                name="color"
                defaultValue={tag.color}
                className="tag-manager-color"
                style={{ width: 32, height: 32 }}
                onChange={(e) => {
                  // Auto-submit on color change
                  const form = e.target.closest("form");
                  if (form) {
                    fetcher.submit(form);
                  }
                }}
              />
            </fetcher.Form>

            <span className="tag-manager-name">{tag.name}</span>

            <span
              className="skin-tag-badge"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>

            <Form method="post" style={{ marginLeft: "auto" }}>
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="tagId" value={tag.id} />
              <button
                type="submit"
                className="btn-danger btn-small"
                onClick={(e) => {
                  if (!confirm(`Supprimer le tag "${tag.name}"\u00A0?`)) {
                    e.preventDefault();
                  }
                }}
              >
                <i className="fas fa-trash"></i>
              </button>
            </Form>
          </div>
        ))}
      </div>

      {tags.length === 0 && (
        <p
          style={{
            color: "var(--color-text-muted)",
            textAlign: "center",
            padding: "2rem 0",
          }}
        >
          Aucun tag créé. Ajoutez-en un ci-dessus\u00A0!
        </p>
      )}
    </>
  );
}

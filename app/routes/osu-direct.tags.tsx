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
      await createTag(db, { id, name, color: color || "#46D096" });
    } catch {
      return { error: "Un tag avec ce nom existe déjà." };
    }
    return { success: true, message: `Tag "${name}" créé !` };
  }

  if (intent === "update") {
    const tagId = formData.get("tagId") as string;
    const color = formData.get("color") as string;
    await updateTag(db, tagId, { color });
    return { success: true, message: "Couleur mise à jour !" };
  }

  if (intent === "delete") {
    const tagId = formData.get("tagId") as string;
    await deleteTag(db, tagId);
    return { success: true, message: "Tag supprimé !" };
  }

  return { error: "Action inconnue" };
}

export default function TagsAdmin({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { tags } = loaderData;
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#46D096");
  const fetcher = useFetcher();

  return (
    <>
      <div className="ag-page-head">
        <h1 className="ag-page-head__title">Gestion des Tags</h1>
      </div>

      {actionData?.message && (
        <div
          className={`admin-notice ${actionData.success ? "admin-notice-success" : "admin-notice-error"}`}
          role="status"
        >
          {actionData.message}
        </div>
      )}
      {actionData?.error && (
        <div className="login-error admin-form-error" role="alert">
          {actionData.error}
        </div>
      )}

      {/* Add new tag */}
      <Form method="post" className="tag-add-form">
        <input type="hidden" name="intent" value="create" />
        <input
          className="ag-input"
          type="text"
          name="name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom du tag (ex: Stream)"
          aria-label="Nom du tag"
          required
        />
        <input
          type="color"
          name="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="tag-manager-color"
          aria-label="Couleur du nouveau tag"
        />
        <button type="submit" className="ag-button ag-button--solid ag-button--sm">
          Ajouter
        </button>
      </Form>

      {/* Tag list */}
      {tags.length > 0 && (
      <div className="tag-manager-list">
        {tags.map((tag) => (
          <div key={tag.id} className="tag-manager-item">
            <fetcher.Form method="post" className="tag-color-form">
              <input type="hidden" name="intent" value="update" />
              <input type="hidden" name="tagId" value={tag.id} />
              <input
                type="color"
                name="color"
                defaultValue={tag.color}
                className="tag-manager-color"
                aria-label={`Couleur du tag ${tag.name}`}
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
              className="ag-tag skin-tag-badge"
              style={{ borderLeftColor: tag.color }}
            >
              {tag.name}
            </span>

            <Form method="post" className="tag-delete-form">
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="tagId" value={tag.id} />
              <button
                type="submit"
                className="ag-button ag-button--danger ag-button--sm"
                aria-label={`Supprimer le tag ${tag.name}`}
                onClick={(e) => {
                  if (!confirm(`Supprimer le tag "${tag.name}"\u00A0?`)) {
                    e.preventDefault();
                  }
                }}
              >
                Supprimer
              </button>
            </Form>
          </div>
        ))}
      </div>
      )}

      {tags.length === 0 && (
        <p className="admin-empty">
          Aucun tag créé. Ajoutez-en un ci-dessus !
        </p>
      )}
    </>
  );
}

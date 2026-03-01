import { useState, useEffect } from "react";
import { Link, useFetcher } from "react-router";
import type { Route } from "./+types/osu-direct.skins";
import {
  getAllSkins,
  reorderSkins,
  deleteSkin,
  getSkinById,
} from "~/lib/db.server";
import { deleteFile } from "~/lib/r2.server";
import { assertSameOrigin, requireAdminSession } from "~/lib/security.server";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SkinWithTags } from "~/lib/db.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  await requireAdminSession(request, db);
  const skins = await getAllSkins(db);
  return { skins };
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.R2_BUCKET;
  await requireAdminSession(request, db);
  assertSameOrigin(request);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "reorder") {
    const rawOrderedIds = formData.get("orderedIds");
    if (typeof rawOrderedIds !== "string") {
      return { success: false, message: "Paramètres invalides" };
    }

    let orderedIds: string[];
    try {
      const parsed = JSON.parse(rawOrderedIds);
      if (
        !Array.isArray(parsed) ||
        !parsed.every((id) => typeof id === "string" && id.length > 0)
      ) {
        return { success: false, message: "Ordre invalide" };
      }
      orderedIds = parsed;
    } catch {
      return { success: false, message: "Ordre invalide" };
    }

    await reorderSkins(db, orderedIds);
    return { success: true, message: "Ordre mis à jour\u00A0!" };
  }

  if (intent === "delete") {
    const skinId = formData.get("skinId") as string;
    // Get skin to clean up R2 files
    const skin = await getSkinById(db, skinId);
    if (skin) {
      if (skin.image_key) await deleteFile(bucket, skin.image_key);
      if (skin.skin_file_key) await deleteFile(bucket, skin.skin_file_key);
    }
    await deleteSkin(db, skinId);
    return { success: true, message: "Skin supprimé\u00A0!" };
  }

  return { success: false, message: "Action inconnue" };
}

// --- Sortable Item Component ---
function SortableItem({
  skin,
  position,
}: {
  skin: SkinWithTags;
  position: number;
}) {
  const fetcher = useFetcher();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: skin.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`drag-item ${isDragging ? "is-dragging" : ""}`}
    >
      <span className="drag-item-position">{position}</span>
      <div className="drag-handle" {...attributes} {...listeners}>
        <i className="fas fa-grip-vertical"></i>
      </div>
      <div className="drag-item-thumb">
        {skin.image_key && (
          <img src={`/api/image/${skin.id}`} alt={skin.name} />
        )}
      </div>
      <div className="drag-item-info">
        <div className="drag-item-name">{skin.name}</div>
        {skin.tags.length > 0 && (
          <div className="drag-item-tags">
            {skin.tags.map((tag) => (
              <span
                key={tag.id}
                className="skin-tag-badge"
                style={{ backgroundColor: tag.color, fontSize: "0.65rem" }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="drag-item-actions">
        <Link
          to={`/osu-direct/skins/${skin.id}`}
          className="btn-secondary btn-small"
        >
          <i className="fas fa-edit"></i>
        </Link>
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="skinId" value={skin.id} />
          <button
            type="submit"
            className="btn-danger btn-small"
            disabled={fetcher.state !== "idle"}
            onClick={(e) => {
              if (!confirm(`Supprimer "${skin.name}"\u00A0?`)) {
                e.preventDefault();
              }
            }}
          >
            <i
              className={`fas ${fetcher.state !== "idle" ? "fa-spinner fa-spin" : "fa-trash"}`}
            ></i>
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}

export default function SkinsAdmin({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const [items, setItems] = useState(loaderData.skins);
  const [hasChanges, setHasChanges] = useState(false);
  const fetcher = useFetcher();

  // Resync items when loaderData changes (e.g. after delete)
  useEffect(() => {
    setItems(loaderData.skins);
  }, [loaderData.skins]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);
        const newItems = arrayMove(prev, oldIndex, newIndex);
        setHasChanges(true);
        return newItems;
      });
    }
  }

  function saveOrder() {
    const orderedIds = items.map((s) => s.id);
    fetcher.submit(
      { intent: "reorder", orderedIds: JSON.stringify(orderedIds) },
      { method: "post" },
    );
    setHasChanges(false);
  }

  return (
    <>
      <div className="admin-page-header">
        <h1>Gestion des Skins</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {hasChanges && (
            <button onClick={saveOrder} className="btn-primary">
              <i className="fas fa-save"></i> Sauvegarder l'ordre
            </button>
          )}
          <Link to="/osu-direct/skins/new" className="btn-primary">
            <i className="fas fa-plus"></i> Ajouter un skin
          </Link>
        </div>
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

      <p
        style={{
          color: "var(--color-text-muted)",
          marginBottom: "1rem",
          fontSize: "0.9rem",
        }}
      >
        <i className="fas fa-info-circle"></i> Glissez-déposez pour réordonner
        les skins. L'ordre ici est l'ordre d'affichage sur le site.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="drag-list">
            {items.map((skin, index) => (
              <SortableItem key={skin.id} skin={skin} position={index + 1} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {items.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem 0" }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: "1.1rem" }}>
            Aucun skin pour le moment.
          </p>
          <Link
            to="/osu-direct/skins/new"
            className="btn-primary"
            style={{ marginTop: "1rem", display: "inline-flex" }}
          >
            <i className="fas fa-plus"></i> Ajouter votre premier skin
          </Link>
        </div>
      )}
    </>
  );
}

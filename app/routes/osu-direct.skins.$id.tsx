import { useState, useRef, useEffect, useCallback } from "react";
import { Form, redirect, useNavigation, Link } from "react-router";
import type { Route } from "./+types/osu-direct.skins.$id";
import { getSkinById, getAllTags, updateSkin } from "~/lib/db.server";
import { uploadImage, uploadSkinFile, deleteFile } from "~/lib/r2.server";
import {
  assertSameOrigin,
  normalizeOptionalHttpUrl,
  requireAdminSession,
  validateImageUpload,
  validateSkinUpload,
} from "~/lib/security.server";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  await requireAdminSession(request, db);

  const [skin, tags] = await Promise.all([
    getSkinById(db, params.id!),
    getAllTags(db),
  ]);

  if (!skin) {
    throw new Response("Skin introuvable", { status: 404 });
  }

  return { skin, tags };
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.R2_BUCKET;
  await requireAdminSession(request, db);
  assertSameOrigin(request);

  const formData = await request.formData();
  const skinId = params.id!;

  const name = (formData.get("name") as string)?.trim();
  const forumLink = normalizeOptionalHttpUrl(formData.get("forumLink") as string);
  const downloadUrl = normalizeOptionalHttpUrl(
    formData.get("downloadUrl") as string,
  );
  const tagIds = formData.getAll("tags") as string[];
  const imageFile = formData.get("image") as File | null;
  const skinFile = formData.get("skinFile") as File | null;

  if (!name) {
    return { error: "Le nom est requis." };
  }

  if ((formData.get("forumLink") as string)?.trim() && !forumLink) {
    return { error: "Lien forum invalide (http/https requis)." };
  }

  if ((formData.get("downloadUrl") as string)?.trim() && !downloadUrl) {
    return { error: "Lien de téléchargement invalide (http/https requis)." };
  }

  if (imageFile && imageFile.size > 0) {
    const imageError = validateImageUpload(imageFile);
    if (imageError) {
      return { error: imageError };
    }
  }

  if (skinFile && skinFile.size > 0) {
    const skinError = validateSkinUpload(skinFile);
    if (skinError) {
      return { error: skinError };
    }
  }

  const updateData: Parameters<typeof updateSkin>[2] = {
    name,
    forum_link: forumLink ?? undefined,
    download_url: downloadUrl ?? undefined,
    tagIds,
  };

  // Fetch existing skin once for file cleanup
  const existing =
    (imageFile && imageFile.size > 0) || (skinFile && skinFile.size > 0)
      ? await getSkinById(db, skinId)
      : null;

  // Upload new image if provided
  if (imageFile && imageFile.size > 0) {
    if (existing?.image_key) {
      await deleteFile(bucket, existing.image_key);
    }
    const buffer = await imageFile.arrayBuffer();
    updateData.image_key = await uploadImage(bucket, buffer, skinId);
  }

  // Upload new skin file if provided
  if (skinFile && skinFile.size > 0) {
    if (existing?.skin_file_key) {
      await deleteFile(bucket, existing.skin_file_key);
    }
    const buffer = await skinFile.arrayBuffer();
    updateData.skin_file_key = await uploadSkinFile(
      bucket,
      buffer,
      skinId,
      skinFile.name,
    );
    updateData.skin_file_name = skinFile.name;
    updateData.skin_file_size = skinFile.size;
  }

  await updateSkin(db, skinId, updateData);

  return redirect("/osu-direct/skins");
}

export default function EditSkin({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { skin, tags } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [imagePreview, setImagePreview] = useState<string | null>(
    skin.image_key ? `/api/image/${skin.id}` : null,
  );
  const [skinFileName, setSkinFileName] = useState<string | null>(
    skin.skin_file_name,
  );
  const imageInputRef = useRef<HTMLInputElement>(null);
  const skinInputRef = useRef<HTMLInputElement>(null);

  // Revoke blob URLs on unmount to prevent memory leaks
  const imagePreviewRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (imagePreviewRef.current) {
        URL.revokeObjectURL(imagePreviewRef.current);
      }
    };
  }, []);

  const setImagePreviewWithCleanup = useCallback((url: string | null) => {
    if (imagePreviewRef.current) {
      URL.revokeObjectURL(imagePreviewRef.current);
    }
    imagePreviewRef.current = url;
    setImagePreview(url);
  }, []);

  const skinTagIds = skin.tags.map((t) => t.id);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { convertToWebP, createPreviewUrl } =
        await import("~/lib/image-converter.client");
      const webpBlob = await convertToWebP(file);
      setImagePreviewWithCleanup(createPreviewUrl(webpBlob));

      const webpFile = new File([webpBlob], "image.webp", {
        type: "image/webp",
      });
      const dt = new DataTransfer();
      dt.items.add(webpFile);
      if (imageInputRef.current) {
        imageInputRef.current.files = dt.files;
      }
    } catch (err) {
      console.error("Image conversion failed:", err);
      setImagePreviewWithCleanup(URL.createObjectURL(file));
    }
  }

  function handleSkinFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSkinFileName(file.name);
  }

  return (
    <>
      <div className="admin-page-header">
        <h1>Modifier\u00A0: {skin.name}</h1>
        <Link to="/osu-direct/skins" className="btn-secondary">
          <i className="fas fa-arrow-left"></i> Retour
        </Link>
      </div>

      {actionData?.error && (
        <div className="login-error" style={{ maxWidth: 700 }}>
          {actionData.error}
        </div>
      )}

      <Form method="post" encType="multipart/form-data" className="admin-form">
        <div className="form-group">
          <label className="form-label" htmlFor="name">
            Nom du skin *
          </label>
          <input
            className="form-input"
            type="text"
            id="name"
            name="name"
            required
            defaultValue={skin.name}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Image de preview</label>
          <div
            className="file-upload-zone"
            onClick={() => imageInputRef.current?.click()}
          >
            {imagePreview ? (
              <div className="file-upload-preview">
                <img src={imagePreview} alt="Preview" />
              </div>
            ) : (
              <>
                <i className="fas fa-image"></i>
                <p>Cliquez pour changer l'image</p>
              </>
            )}
          </div>
          <input
            ref={imageInputRef}
            type="file"
            name="image"
            accept="image/*"
            onChange={handleImageChange}
            className="visually-hidden"
          />
          {imagePreview && (
            <p className="form-hint">
              Choisissez une nouvelle image pour remplacer l'actuelle
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Fichier skin</label>
          <div
            className="file-upload-zone"
            onClick={() => skinInputRef.current?.click()}
          >
            {skinFileName ? (
              <div className="file-upload-info">
                <i className="fas fa-file-archive"></i>
                <span>{skinFileName}</span>
              </div>
            ) : (
              <>
                <i className="fas fa-file-upload"></i>
                <p>Cliquez pour ajouter/changer le fichier skin</p>
              </>
            )}
          </div>
          <input
            ref={skinInputRef}
            type="file"
            name="skinFile"
            accept=".osk,.zip,.rar,.7z"
            onChange={handleSkinFileChange}
            className="visually-hidden"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="downloadUrl">
            Lien de téléchargement externe (optionnel)
          </label>
          <input
            className="form-input"
            type="url"
            id="downloadUrl"
            name="downloadUrl"
            defaultValue={skin.download_url || ""}
            placeholder="https://drive.google.com/..."
          />
          <p className="form-hint">
            Utilisé seulement si aucun fichier skin n'est uploadé
          </p>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="forumLink">
            Lien forum osu! (optionnel)
          </label>
          <input
            className="form-input"
            type="url"
            id="forumLink"
            name="forumLink"
            defaultValue={skin.forum_link || ""}
            placeholder="https://osu.ppy.sh/community/forums/topics/..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Tags</label>
          <div className="tag-selector">
            {tags.map((tag) => (
              <label key={tag.id}>
                <input
                  type="checkbox"
                  className="tag-checkbox"
                  name="tags"
                  value={tag.id}
                  defaultChecked={skinTagIds.includes(tag.id)}
                />
                <span
                  className="tag-checkbox-label"
                  style={
                    {
                      "--tag-color": tag.color,
                    } as React.CSSProperties
                  }
                >
                  {tag.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Mise à jour...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i> Sauvegarder
              </>
            )}
          </button>
          <Link to="/osu-direct/skins" className="btn-secondary">
            Annuler
          </Link>
        </div>
      </Form>
    </>
  );
}

import { useState, useRef, useEffect, useCallback } from "react";
import { Form, redirect, useNavigation, Link } from "react-router";
import type { Route } from "./+types/osu-direct.skins.new";
import { getAllTags, createSkin } from "~/lib/db.server";
import { uploadImage, uploadSkinFile } from "~/lib/r2.server";
import {
  assertSameOrigin,
  normalizeOptionalHttpUrl,
  requireAdminSession,
  validateImageUpload,
  validateSkinUpload,
} from "~/lib/security.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  await requireAdminSession(request, db);
  const tags = await getAllTags(db);
  return { tags };
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
  const bucket = context.cloudflare.env.R2_BUCKET;
  await requireAdminSession(request, db);
  assertSameOrigin(request);

  const formData = await request.formData();

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

  const skinId = crypto.randomUUID();
  let imageKey: string | undefined;
  let skinFileKey: string | undefined;
  let skinFileName: string | undefined;
  let skinFileSize: number | undefined;

  // Upload image to R2
  if (imageFile && imageFile.size > 0) {
    const buffer = await imageFile.arrayBuffer();
    imageKey = await uploadImage(bucket, buffer, skinId);
  }

  // Upload skin file to R2
  if (skinFile && skinFile.size > 0) {
    const buffer = await skinFile.arrayBuffer();
    skinFileKey = await uploadSkinFile(bucket, buffer, skinId, skinFile.name);
    skinFileName = skinFile.name;
    skinFileSize = skinFile.size;
  }

  await createSkin(db, {
    id: skinId,
    name,
    image_key: imageKey,
    skin_file_key: skinFileKey,
    skin_file_name: skinFileName,
    skin_file_size: skinFileSize,
    download_url: downloadUrl || undefined,
    forum_link: forumLink || undefined,
    tagIds,
  });

  return redirect("/osu-direct/skins");
}

export default function NewSkin({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { tags } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [skinFileName, setSkinFileName] = useState<string | null>(null);
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

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to WebP client-side
    try {
      const { convertToWebP, createPreviewUrl } =
        await import("~/lib/image-converter.client");
      const webpBlob = await convertToWebP(file);
      setImagePreviewWithCleanup(createPreviewUrl(webpBlob));

      // Replace the file input with the converted WebP
      const webpFile = new File([webpBlob], "image.webp", {
        type: "image/webp",
      });
      const dt = new DataTransfer();
      dt.items.add(webpFile);
      if (imageInputRef.current) {
        imageInputRef.current.files = dt.files;
      }
    } catch (err) {
      // Fallback: use original file
      console.error("Image conversion failed:", err);
      setImagePreviewWithCleanup(URL.createObjectURL(file));
    }
  }

  function handleSkinFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSkinFileName(file.name);
    }
  }

  return (
    <>
      <div className="admin-page-header">
        <h1>Ajouter un skin</h1>
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
            autoFocus
            placeholder="ex: XooMoon - Blue trail Updated"
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
                <p>Cliquez pour choisir une image</p>
                <p className="form-hint">
                  PNG, JPG, WebP — sera convertie en WebP automatiquement
                </p>
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
        </div>

        <div className="form-group">
          <label className="form-label">Fichier skin (.osk)</label>
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
                <p>Cliquez pour choisir un fichier skin</p>
                <p className="form-hint">.osk, .zip, ou tout format de skin</p>
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
          {tags.length === 0 && (
            <p className="form-hint">
              <Link to="/osu-direct/tags">Créer des tags d'abord</Link>
            </p>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Ajout en cours...
              </>
            ) : (
              <>
                <i className="fas fa-plus"></i> Ajouter le skin
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

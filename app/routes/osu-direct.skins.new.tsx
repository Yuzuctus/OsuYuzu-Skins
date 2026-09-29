import { useState, useRef, useEffect, useCallback } from "react";
import { Form, redirect, useNavigation, useSubmit, Link } from "react-router";
import type { Route } from "./+types/osu-direct.skins.new";
import { getAllTags, createSkin } from "~/lib/db.server";
import { uploadImage } from "~/lib/r2.server";
import { uploadToSkinVps } from "~/lib/skin-storage.client";
import { isSkinStorageKey, storedFileStatus } from "~/lib/skin-storage.server";
import {
  assertSameOrigin,
  normalizeOptionalHttpUrl,
  requireAdminSession,
  validateImageUpload,
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
  const rawSkinFile = formData.get("skinFile") as File | null;
  const uploadedKey = formData.get("uploadedSkinKey");
  const uploadedNonce = formData.get("uploadedSkinNonce");
  const uploadedName = formData.get("uploadedSkinName");
  const uploadedSize = Number(formData.get("uploadedSkinSize"));

  if (!name) {
    return { error: "Le nom est requis." };
  }
  if (rawSkinFile && rawSkinFile.size > 0) return { error: "Envoyez le fichier skin depuis le formulaire interactif." };

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

  let imageKey: string | undefined;
  let skinFileKey: string | undefined;
  let skinFileName: string | undefined;
  let skinFileSize: number | undefined;

  if (uploadedKey !== null) {
    if (!isSkinStorageKey(uploadedKey) || typeof uploadedNonce !== "string" ||
      typeof uploadedName !== "string" || uploadedName.length > 512 ||
      !Number.isSafeInteger(uploadedSize) || uploadedSize < 1) {
      return { error: "Fichier skin envoyé invalide." };
    }
    const stored = await storedFileStatus(context.cloudflare.env, uploadedKey);
    if (!stored.exists || stored.nonce !== uploadedNonce || stored.size !== uploadedSize || stored.name !== uploadedName) {
      return { error: "Le fichier skin n'a pas été confirmé sur le VPS." };
    }
    skinFileKey = uploadedKey;
    skinFileName = uploadedName;
    skinFileSize = uploadedSize;
  }

  const skinId = crypto.randomUUID();
  if (imageFile && imageFile.size > 0) {
    const buffer = await imageFile.arrayBuffer();
    imageKey = await uploadImage(bucket, buffer, skinId);
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
  const submit = useSubmit();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isSubmitting = navigation.state === "submitting" || uploading;
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const file = skinInputRef.current?.files?.[0];
    if (!file) return;
    event.preventDefault();
    if (uploading) return;
    const form = event.currentTarget;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadToSkinVps(file, {
        kind: "skin", name: file.name,
      }, (sent, total) => setUploadProgress(Math.round(sent / total * 100)));
      const data = new FormData(form);
      data.delete("skinFile");
      data.set("uploadedSkinKey", uploaded.key);
      data.set("uploadedSkinNonce", uploaded.nonce);
      data.set("uploadedSkinName", file.name);
      data.set("uploadedSkinSize", String(uploaded.size));
      submit(data, { method: "post", encType: "multipart/form-data" });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Envoi vers le VPS impossible.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="ag-page-head">
        <h1 className="ag-page-head__title">Ajouter un skin</h1>
        <Link to="/osu-direct/skins" className="ag-button ag-button--quiet">
          Retour
        </Link>
      </div>

      {actionData?.error && (
        <div className="login-error admin-form-error" role="alert">
          {actionData.error}
        </div>
      )}
      {uploadError && <div className="login-error admin-form-error" role="alert">{uploadError}</div>}

      <Form method="post" encType="multipart/form-data" className="admin-form" onSubmit={handleSubmit}>
        <div className="ag-field form-group">
          <label className="ag-field__label" htmlFor="name">
            Nom du skin *
          </label>
          <input
            className="ag-input"
            type="text"
            id="name"
            name="name"
            required
            autoFocus
            placeholder="ex. : XooMoon - Blue trail Updated"
          />
        </div>

        <div className="ag-field form-group">
          <label className="ag-field__label">Image de preview</label>
          <div
            className="file-upload-zone"
            role="button"
            tabIndex={0}
            aria-label="Choisir une image de preview"
            onClick={() => imageInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                imageInputRef.current?.click();
              }
            }}
          >
            {imagePreview ? (
              <div className="file-upload-preview">
                <img src={imagePreview} alt="Preview" />
              </div>
            ) : (
              <>
                <p>Cliquez pour choisir une image</p>
                <p className="ag-field__hint">
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
            className="ag-visually-hidden"
            tabIndex={-1}
          />
        </div>

        <div className="ag-field form-group">
          <label className="ag-field__label">Fichier skin (.osk)</label>
          <div
            className="file-upload-zone"
            role="button"
            tabIndex={0}
            aria-label="Choisir un fichier skin"
            onClick={() => skinInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                skinInputRef.current?.click();
              }
            }}
          >
            {skinFileName ? (
              <div className="file-upload-info">
                <span>{skinFileName}</span>
              </div>
            ) : (
              <>
                <p>Cliquez pour choisir un fichier skin</p>
                <p className="ag-field__hint">.osk, .zip, ou tout format de skin</p>
              </>
            )}
          </div>
          <input
            ref={skinInputRef}
            type="file"
            name="skinFile"
            accept=".osk,.zip,.rar,.7z"
            onChange={handleSkinFileChange}
            className="ag-visually-hidden"
            tabIndex={-1}
          />
        </div>

        <div className="ag-field form-group">
          <label className="ag-field__label" htmlFor="downloadUrl">
            Lien de téléchargement externe (optionnel)
          </label>
          <input
            className="ag-input"
            type="url"
            id="downloadUrl"
            name="downloadUrl"
            placeholder="https://drive.google.com/..."
          />
          <p className="ag-field__hint">
            Utilisé seulement si aucun fichier skin n'est uploadé
          </p>
        </div>

        <div className="ag-field form-group">
          <label className="ag-field__label" htmlFor="forumLink">
            Lien forum osu! (optionnel)
          </label>
          <input
            className="ag-input"
            type="url"
            id="forumLink"
            name="forumLink"
            placeholder="https://osu.ppy.sh/community/forums/topics/..."
          />
        </div>

        <div className="ag-field form-group">
          <label className="ag-field__label">Tags</label>
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
            <p className="ag-field__hint">
              <Link to="/osu-direct/tags">Créer des tags d'abord</Link>
            </p>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="ag-button ag-button--solid" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                {uploading ? `Envoi du skin ${uploadProgress} %...` : "Ajout en cours..."}
              </>
            ) : (
              <>
                Ajouter le skin
              </>
            )}
          </button>
          <Link to="/osu-direct/skins" className="ag-button ag-button--quiet">
            Annuler
          </Link>
        </div>
      </Form>
    </>
  );
}

import { useState, useRef, useEffect, useCallback } from "react";
import { Form, redirect, useNavigation, useSubmit, Link } from "react-router";
import type { Route } from "./+types/osu-direct.skins.$id";
import { getSkinById, getAllTags, updateSkin } from "~/lib/db.server";
import { uploadImage } from "~/lib/r2.server";
import { uploadToSkinVps } from "~/lib/skin-storage.client";
import { isSkinStorageKey, storedFileStatus } from "~/lib/skin-storage.server";
import {
  assertSameOrigin,
  normalizeOptionalHttpUrl,
  requireAdminSession,
  validateImageUpload,
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
  const uploadedKey = formData.get("uploadedSkinKey");
  const uploadedNonce = formData.get("uploadedSkinNonce");
  const uploadedName = formData.get("uploadedSkinName");
  const uploadedSize = Number(formData.get("uploadedSkinSize"));
  const rawSkinFile = formData.get("skinFile") as File | null;

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

  const updateData: Parameters<typeof updateSkin>[2] = {
    name,
    forum_link: forumLink ?? undefined,
    download_url: downloadUrl ?? undefined,
    tagIds,
  };

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
    updateData.skin_file_key = uploadedKey;
    updateData.skin_file_name = uploadedName;
    updateData.skin_file_size = uploadedSize;
  }

  if (imageFile && imageFile.size > 0) {
    const buffer = await imageFile.arrayBuffer();
    updateData.image_key = await uploadImage(bucket, buffer, skinId);
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
  const submit = useSubmit();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isSubmitting = navigation.state === "submitting" || uploading;
  const [imagePreview, setImagePreview] = useState<string | null>(
    skin.image_key ? `/api/image/${skin.id}` : null,
  );
  const [skinFileName, setSkinFileName] = useState<string | null>(
    skin.skin_file_name,
  );
  const imageInputRef = useRef<HTMLInputElement>(null);
  const skinInputRef = useRef<HTMLInputElement>(null);

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
      <div className="ag-page-head">
        <h1 className="ag-page-head__title">Modifier : {skin.name}</h1>
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
            defaultValue={skin.name}
          />
        </div>

        <div className="ag-field form-group">
          <label className="ag-field__label">Image de preview</label>
          <div
            className="file-upload-zone"
            role="button"
            tabIndex={0}
            aria-label="Changer l'image de preview"
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
            className="ag-visually-hidden"
            tabIndex={-1}
          />
          {imagePreview && (
            <p className="ag-field__hint">
              Choisissez une nouvelle image pour remplacer l'actuelle
            </p>
          )}
        </div>

        <div className="ag-field form-group">
          <label className="ag-field__label">Fichier skin</label>
          <div
            className="file-upload-zone"
            role="button"
            tabIndex={0}
            aria-label="Changer le fichier skin"
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
            defaultValue={skin.download_url || ""}
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
            defaultValue={skin.forum_link || ""}
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
          <button type="submit" className="ag-button ag-button--solid" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                {uploading ? `Envoi du skin ${uploadProgress} %...` : "Mise à jour..."}
              </>
            ) : (
              <>
                Sauvegarder
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

/**
 * Database helper functions for D1
 */

export interface Skin {
  id: string;
  name: string;
  description: string | null;
  image_key: string | null;
  skin_file_key: string | null;
  skin_file_name: string | null;
  skin_file_size: number;
  download_url: string | null;
  forum_link: string | null;
  order_position: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface SkinWithTags extends Skin {
  tags: Tag[];
}

export interface Admin {
  id: number;
  username: string;
  password_hash: string;
  totp_secret: string | null;
  totp_enabled: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  admin_id: number;
  expires_at: string;
  created_at: string;
}

// ─── Skins ───────────────────────────────────────────────

export async function getAllSkins(db: D1Database): Promise<SkinWithTags[]> {
  const skins = await db
    .prepare("SELECT * FROM skins ORDER BY order_position ASC")
    .all<Skin>();

  if (!skins.results.length) return [];

  const skinIds = skins.results.map((s) => s.id);
  const placeholders = skinIds.map(() => "?").join(",");

  const skinTags = await db
    .prepare(
      `SELECT st.skin_id, t.* FROM skin_tags st 
       JOIN tags t ON st.tag_id = t.id 
       WHERE st.skin_id IN (${placeholders})`,
    )
    .bind(...skinIds)
    .all<Tag & { skin_id: string }>();

  const tagMap = new Map<string, Tag[]>();
  for (const row of skinTags.results) {
    const tags = tagMap.get(row.skin_id) || [];
    tags.push({
      id: row.id,
      name: row.name,
      color: row.color,
      created_at: row.created_at,
    });
    tagMap.set(row.skin_id, tags);
  }

  return skins.results.map((skin) => ({
    ...skin,
    tags: tagMap.get(skin.id) || [],
  }));
}

export async function getSkinById(
  db: D1Database,
  id: string,
): Promise<SkinWithTags | null> {
  const skin = await db
    .prepare("SELECT * FROM skins WHERE id = ?")
    .bind(id)
    .first<Skin>();

  if (!skin) return null;

  const tags = await db
    .prepare(
      `SELECT t.* FROM skin_tags st 
       JOIN tags t ON st.tag_id = t.id 
       WHERE st.skin_id = ?`,
    )
    .bind(id)
    .all<Tag>();

  return { ...skin, tags: tags.results };
}

export async function createSkin(
  db: D1Database,
  data: {
    id: string;
    name: string;
    description?: string;
    image_key?: string;
    skin_file_key?: string;
    skin_file_name?: string;
    skin_file_size?: number;
    download_url?: string;
    forum_link?: string;
    tagIds?: string[];
  },
): Promise<void> {
  // Get the next order position
  const maxOrder = await db
    .prepare("SELECT COALESCE(MAX(order_position), 0) as max_order FROM skins")
    .first<{ max_order: number }>();

  const orderPosition = (maxOrder?.max_order ?? 0) + 1;

  await db
    .prepare(
      `INSERT INTO skins (id, name, description, image_key, skin_file_key, skin_file_name, skin_file_size, download_url, forum_link, order_position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.id,
      data.name,
      data.description || null,
      data.image_key || null,
      data.skin_file_key || null,
      data.skin_file_name || null,
      data.skin_file_size || 0,
      data.download_url || null,
      data.forum_link || null,
      orderPosition,
    )
    .run();

  if (data.tagIds?.length) {
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO skin_tags (skin_id, tag_id) VALUES (?, ?)",
    );
    await db.batch(data.tagIds.map((tagId) => stmt.bind(data.id, tagId)));
  }
}

export async function updateSkin(
  db: D1Database,
  id: string,
  data: {
    name?: string;
    description?: string;
    image_key?: string;
    skin_file_key?: string;
    skin_file_name?: string;
    skin_file_size?: number;
    download_url?: string;
    forum_link?: string;
    tagIds?: string[];
  },
): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    values.push(data.description || null);
  }
  if (data.image_key !== undefined) {
    updates.push("image_key = ?");
    values.push(data.image_key);
  }
  if (data.skin_file_key !== undefined) {
    updates.push("skin_file_key = ?");
    values.push(data.skin_file_key);
  }
  if (data.skin_file_name !== undefined) {
    updates.push("skin_file_name = ?");
    values.push(data.skin_file_name);
  }
  if (data.skin_file_size !== undefined) {
    updates.push("skin_file_size = ?");
    values.push(data.skin_file_size);
  }
  if (data.download_url !== undefined) {
    updates.push("download_url = ?");
    values.push(data.download_url || null);
  }
  if (data.forum_link !== undefined) {
    updates.push("forum_link = ?");
    values.push(data.forum_link || null);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    await db
      .prepare(`UPDATE skins SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values, id)
      .run();
  }

  if (data.tagIds !== undefined) {
    await db.prepare("DELETE FROM skin_tags WHERE skin_id = ?").bind(id).run();
    if (data.tagIds.length > 0) {
      const stmt = db.prepare(
        "INSERT OR IGNORE INTO skin_tags (skin_id, tag_id) VALUES (?, ?)",
      );
      await db.batch(data.tagIds.map((tagId) => stmt.bind(id, tagId)));
    }
  }
}

export async function deleteSkin(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM skins WHERE id = ?").bind(id).run();
}

export async function reorderSkins(
  db: D1Database,
  orderedIds: string[],
): Promise<void> {
  const stmt = db.prepare(
    "UPDATE skins SET order_position = ?, updated_at = datetime('now') WHERE id = ?",
  );
  await db.batch(orderedIds.map((id, index) => stmt.bind(index + 1, id)));
}

// ─── Tags ────────────────────────────────────────────────

export async function getAllTags(db: D1Database): Promise<Tag[]> {
  const result = await db
    .prepare("SELECT * FROM tags ORDER BY name ASC")
    .all<Tag>();
  return result.results;
}

export async function createTag(
  db: D1Database,
  data: { id: string; name: string; color: string },
): Promise<void> {
  await db
    .prepare("INSERT INTO tags (id, name, color) VALUES (?, ?, ?)")
    .bind(data.id, data.name, data.color)
    .run();
}

export async function updateTag(
  db: D1Database,
  id: string,
  data: { name?: string; color?: string },
): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) {
    updates.push("name = ?");
    values.push(data.name);
  }
  if (data.color !== undefined) {
    updates.push("color = ?");
    values.push(data.color);
  }
  if (updates.length > 0) {
    await db
      .prepare(`UPDATE tags SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values, id)
      .run();
  }
}

export async function deleteTag(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM tags WHERE id = ?").bind(id).run();
}

// ─── Admin ───────────────────────────────────────────────

export async function getAdmin(db: D1Database): Promise<Admin | null> {
  return db.prepare("SELECT * FROM admin LIMIT 1").first<Admin>();
}

export async function createAdmin(
  db: D1Database,
  data: { username: string; password_hash: string; totp_secret: string },
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO admin (username, password_hash, totp_secret, totp_enabled) VALUES (?, ?, ?, 1)",
    )
    .bind(data.username, data.password_hash, data.totp_secret)
    .run();
}

// ─── Sessions ────────────────────────────────────────────

export async function createSession(
  db: D1Database,
  adminId: number,
): Promise<string> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
  await db
    .prepare("INSERT INTO sessions (id, admin_id, expires_at) VALUES (?, ?, ?)")
    .bind(id, adminId, expiresAt)
    .run();
  return id;
}

export async function getSession(
  db: D1Database,
  id: string,
): Promise<Session | null> {
  const session = await db
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .bind(id)
    .first<Session>();
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
    return null;
  }
  return session;
}

export async function deleteSession(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
}

export async function cleanExpiredSessions(db: D1Database): Promise<void> {
  await db
    .prepare("DELETE FROM sessions WHERE expires_at < datetime('now')")
    .run();
}

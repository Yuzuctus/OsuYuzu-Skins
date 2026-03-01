/**
 * Migration script: Import existing skin data from JSON into D1
 *
 * Run with: npx wrangler d1 execute osu-yuzu-skins-db --file=./migrations/0001_initial.sql
 * Then:     npx tsx scripts/migrate.ts
 *
 * Note: This script inserts metadata into D1. Images need to be uploaded
 * separately via the admin panel (or adapt this script with R2 uploads).
 * Skin files (.osk) that are currently on Google Drive will keep their
 * external download URLs until re-uploaded via admin.
 */

import * as fs from "fs";
import * as path from "path";

// Read the existing JSON data
const dataPath = path.resolve(__dirname, "../data/yuzuctus_osu_skins.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

interface OldSkin {
  order: number;
  name: string;
  downloadLink: string;
  forumLink: string | null;
  imageUrl: string;
}

// Generate SQL INSERT statements for migration
const skins: OldSkin[] = data.skins;

console.log("-- ═══════════════════════════════════════════════");
console.log("-- Migration SQL: Import existing skins into D1");
console.log(
  "-- Run with: npx wrangler d1 execute osu-yuzu-skins-db --file=./migrations/0002_import_skins.sql",
);
console.log("-- ═══════════════════════════════════════════════");
console.log("");

for (const skin of skins) {
  const id = crypto.randomUUID ? crypto.randomUUID() : `skin-${skin.order}`;
  const name = skin.name.replace(/'/g, "''");
  const downloadUrl = skin.downloadLink.replace(/'/g, "''");
  const forumLink = skin.forumLink
    ? `'${skin.forumLink.replace(/'/g, "''")}'`
    : "NULL";

  console.log(
    `INSERT INTO skins (id, name, download_url, forum_link, order_position)`,
  );
  console.log(
    `VALUES ('${id}', '${name}', '${downloadUrl}', ${forumLink}, ${skin.order});`,
  );
  console.log("");
}

console.log("-- Done! Images need to be re-uploaded via the admin panel.");
console.log(
  "-- The download URLs point to Google Drive until you upload .osk files.",
);

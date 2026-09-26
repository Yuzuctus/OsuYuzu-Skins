-- Remove only the DT/NM associations introduced from skin-name patterns.
-- Tag management for existing admin workflows remains available.
DELETE FROM skin_tags
WHERE (
    tag_id = 'tag-dt'
    AND skin_id IN (
      SELECT id FROM skins
      WHERE UPPER(name) LIKE '% DT%'
         OR UPPER(name) LIKE '%[DT]%'
         OR UPPER(name) LIKE '%《DT》%'
    )
  )
  OR (
    tag_id = 'tag-nm'
    AND skin_id IN (
      SELECT id FROM skins
      WHERE UPPER(name) LIKE '% NM%'
         OR UPPER(name) LIKE '%[NM]%'
         OR UPPER(name) LIKE '%《NM》%'
    )
  );

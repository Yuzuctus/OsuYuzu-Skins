-- Migration 0002: Import existing skins from the original JSON data
-- These skins use external Google Drive download links until re-uploaded via admin

INSERT OR IGNORE INTO skins (id, name, download_url, forum_link, order_position, created_at, updated_at) VALUES
  ('skin-01', 'XooMoon - Blue trail Updated', 'https://drive.google.com/uc?export=download&id=1iTrnwZAQ9mpssOlweYR_cyWUQOiwIAzL', NULL, 1, datetime('now'), datetime('now')),
  ('skin-02', 'Lighis_ _ The Sun_ The Moon_ The Star _', 'https://drive.google.com/uc?export=download&id=1hw4usnf4L6Jg6iZXVuUMKzw26gJB_3GW', 'https://osu.ppy.sh/community/forums/topics/1890875?n=1', 2, datetime('now'), datetime('now')),
  ('skin-03', '- Frieren [NM] ([ Bimbo ])', 'https://drive.google.com/uc?export=download&id=1H2A1THjfyD4WmZKzDxToQ05XvadGcYtf', NULL, 3, datetime('now'), datetime('now')),
  ('skin-04', '《HNJ》 Ryu Lion 『Clack』', 'https://drive.google.com/uc?export=download&id=1nlb-a8xlKB-FNbiMcD5PXL4B4WkXpdk9', 'https://osu.ppy.sh/community/forums/topics/1744290?n=1', 4, datetime('now'), datetime('now')),
  ('skin-05', 'xaver minimal (Xaver mix of various skins)', 'https://drive.google.com/uc?export=download&id=1r6JMOZQX2SkBTbemi13Kvgzarar-9-2B', NULL, 5, datetime('now'), datetime('now')),
  ('skin-06', 'anzt11w V3 - てんてこ', 'https://drive.google.com/uc?export=download&id=16Wu_UX12BFDwe1zJ2e3HAIlv3WB2vP7Y', 'https://osu.ppy.sh/community/forums/topics/1948897?n=1', 6, datetime('now'), datetime('now')),
  ('skin-07', 'Wintherest - v21022023 (Redo_)', 'https://drive.google.com/uc?export=download&id=17CKq3EzovDxYwIXgAGwhiyYlid3nmoqU', 'https://osu.ppy.sh/community/forums/topics/1498493?n=1', 7, datetime('now'), datetime('now')),
  ('skin-08', 'MISKADELUXE', 'https://drive.google.com/uc?export=download&id=1ToL7L-OKbuxvYoF6GDSI3IV1If2M7peb', NULL, 8, datetime('now'), datetime('now')),
  ('skin-09', '- Frieren [DT] ([ Bimbo ])', 'https://drive.google.com/uc?export=download&id=1p8UKthrsDF4NHpc7XdBewhqBCTPLnnuc', NULL, 9, datetime('now'), datetime('now')),
  ('skin-10', 'Darker', 'https://drive.google.com/uc?export=download&id=1OwujlAODB-45G7MmrhEabRjdgURwfn2T', NULL, 10, datetime('now'), datetime('now')),
  ('skin-11', 'tekkito2 malisz', 'https://drive.google.com/uc?export=download&id=17lW2Ugh0wFl37xet_qZgOueiV2S3y2-0', NULL, 11, datetime('now'), datetime('now')),
  ('skin-12', 'vaxedit (cyperdark (rektygon edit))', 'https://drive.google.com/uc?export=download&id=19r0tPxs6H0-1fDzNQQzamynmS1nWYZuv', NULL, 12, datetime('now'), datetime('now')),
  ('skin-13', '『XooMoon Re;Done』 - Reedkussy', 'https://drive.google.com/uc?export=download&id=18oyHG-absGX-Fka9-DXHA8NZnUUCimYf', NULL, 13, datetime('now'), datetime('now')),
  ('skin-14', 'Xuxu Xaxa Cup Open (-database- & AraNiChan)', 'https://drive.google.com/uc?export=download&id=1zIgq2577cU-Jft7kHimIX_IBXHAoxtOu', NULL, 14, datetime('now'), datetime('now')),
  ('skin-15', 'FREEDOM DiVE REiMAGINED v1.0', 'https://drive.google.com/uc?export=download&id=1u-iu_F_N_7TzXkVfU33ARs43E8keMXTq', 'https://osu.ppy.sh/community/forums/topics/2019099?n=1', 15, datetime('now'), datetime('now')),
  ('skin-16', 'Myrtille (Vaaaanille)', 'https://drive.google.com/file/d/1V6cPACCOqf12M_YasHlbZCncQL5nusqr/view?usp=sharing', NULL, 16, datetime('now'), datetime('now')),
  ('skin-17', 'boop (ryuk)', 'https://drive.google.com/file/d/1ex4UhwyHr779LKUn69iDt99lTrbly6mr/view?usp=sharing', NULL, 17, datetime('now'), datetime('now'));

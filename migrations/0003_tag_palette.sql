-- Migration 0003: remap the seeded tag colours off the Tailwind defaults.
-- The originals (#ef4444, #3b82f6, #8b5cf6, #f59e0b, #ec4899, #10b981,
-- #06b6d4, #f472b6) are the framework's stock 500-shades and clash with the
-- mint / cyan / lemon / blush palette used everywhere else.

UPDATE tags SET color = '#35A5D6' WHERE id = 'tag-stream';
UPDATE tags SET color = '#0B6B44' WHERE id = 'tag-aim';
UPDATE tags SET color = '#0C5A80' WHERE id = 'tag-hd';
UPDATE tags SET color = '#F0C61E' WHERE id = 'tag-dt';
UPDATE tags SET color = '#EFA2B2' WHERE id = 'tag-hr';
UPDATE tags SET color = '#46D096' WHERE id = 'tag-nm';
UPDATE tags SET color = '#0A5C38' WHERE id = 'tag-tech';
UPDATE tags SET color = '#D98CA0' WHERE id = 'tag-aesthetic';

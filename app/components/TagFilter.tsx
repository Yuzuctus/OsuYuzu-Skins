import { useState } from "react";
import type { Tag } from "~/lib/db.server";

interface TagFilterProps {
  tags: Tag[];
  onFilter: (activeTagIds: string[]) => void;
}

export function TagFilter({ tags, onFilter }: TagFilterProps) {
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);

  if (tags.length === 0) return null;

  function toggleTag(tagId: string) {
    setActiveTagIds((prev) => {
      const next = prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId];
      onFilter(next);
      return next;
    });
  }

  function clearAll() {
    setActiveTagIds([]);
    onFilter([]);
  }

  return (
    <div className="tag-filter-bar">
      <button
        className={`tag-pill ${activeTagIds.length === 0 ? "active" : ""}`}
        onClick={clearAll}
        style={
          activeTagIds.length === 0
            ? { backgroundColor: "var(--color-primary)", color: "#000" }
            : {}
        }
      >
        Tous
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          className={`tag-pill ${activeTagIds.includes(tag.id) ? "active" : ""}`}
          onClick={() => toggleTag(tag.id)}
          style={
            activeTagIds.includes(tag.id)
              ? { backgroundColor: tag.color, color: "#000" }
              : {}
          }
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}

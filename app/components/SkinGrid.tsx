import type { SkinWithTags } from "~/lib/db.server";
import { SkinCard } from "./SkinCard";

interface SkinGridProps {
  skins: SkinWithTags[];
}

export function SkinGrid({ skins }: SkinGridProps) {
  if (skins.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 0" }}>
        <p style={{ fontSize: "1.2rem", color: "var(--color-text-muted)" }}>
          Aucun skin pour le moment...
        </p>
      </div>
    );
  }

  return (
    <div className="skins-grid" id="skins-container">
      {skins.map((skin, index) => (
        <SkinCard key={skin.id} skin={skin} index={index} />
      ))}
    </div>
  );
}

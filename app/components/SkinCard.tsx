import type { SkinWithTags } from "~/lib/db.server";

interface SkinCardProps {
  skin: SkinWithTags;
  index: number;
}

const RANK_LABELS: Record<number, string> = {
  0: "#1 👑",
  1: "#2 🥈",
  2: "#3 🥉",
};

export function SkinCard({ skin, index }: SkinCardProps) {
  const rankLabel = RANK_LABELS[index];
  const cardClass = [
    "skin-card",
    index === 0 ? "featured" : "",
    index === 3 ? "wide" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Determine the image URL - serve from R2 API if we have an image_key
  const imageUrl = skin.image_key
    ? `/api/image/${skin.id}`
    : "/img/Characters/yuzuchibi1_nobg_nofog.png";

  // Determine download URL - use R2 if hosted, otherwise fallback to external link
  const downloadUrl = skin.skin_file_key
    ? `/api/download/${skin.id}`
    : skin.download_url || "#";

  return (
    <div className={cardClass} style={{ animationDelay: `${index * 0.08}s` }}>
      {rankLabel && <span className="rank-tag">{rankLabel}</span>}

      <div className="skin-image">
        <img
          src={imageUrl}
          alt={skin.name}
          decoding="async"
          fetchPriority={index === 0 ? "high" : "auto"}
          loading={index < 4 ? "eager" : "lazy"}
        />
      </div>

      <div className="skin-info">
        {skin.tags.length > 0 && (
          <div className="skin-tags">
            {skin.tags.map((tag) => (
              <span
                key={tag.id}
                className="skin-tag-badge"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <h2>{skin.name}</h2>

        <div className="skin-buttons">
          <a
            href={downloadUrl}
            className="card-btn btn-download"
            target={skin.skin_file_key ? undefined : "_blank"}
            rel={skin.skin_file_key ? undefined : "noopener noreferrer"}
          >
            <i className="fas fa-download"></i> Download
          </a>
          {skin.forum_link && (
            <a
              href={skin.forum_link}
              className="card-btn btn-forum"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fas fa-comments"></i> Forum
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

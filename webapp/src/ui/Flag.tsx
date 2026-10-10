import type { MarketId } from "../markets/markets";

/** Small inline flags, drawn as SVG so they look the same on every system. */
export function Flag({ id, size = 18 }: { id: MarketId; size?: number }) {
  const height = Math.round((size * 2) / 3);
  return (
    <svg className="flag" width={size} height={height} viewBox="0 0 24 16" aria-hidden="true" focusable="false">
      {id === "SE" ? (
        <>
          <rect width="24" height="16" fill="#006AA7" />
          <rect x="7" width="3" height="16" fill="#FECC00" />
          <rect y="6.5" width="24" height="3" fill="#FECC00" />
        </>
      ) : id === "FR" ? (
        <>
          <rect width="8" height="16" fill="#002654" />
          <rect x="8" width="8" height="16" fill="#FFFFFF" />
          <rect x="16" width="8" height="16" fill="#CE1126" />
        </>
      ) : (
        <>
          <rect width="24" height="16" fill="#E70013" />
          <circle cx="12" cy="8" r="4.6" fill="#FFFFFF" />
          <circle cx="12.6" cy="8" r="3.4" fill="#E70013" />
          <circle cx="13.6" cy="8" r="2.7" fill="#FFFFFF" />
          <polygon points="13.2,8 15.6,7.2 14.1,9.2 14.1,6.8 15.6,8.8" fill="#E70013" />
        </>
      )}
    </svg>
  );
}

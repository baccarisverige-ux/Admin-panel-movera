const ZONE_CLASSES = ["z1", "z2", "z3"] as const;

type MapCanvasProps = {
  labels: readonly string[];
};

export function MapCanvas({ labels }: MapCanvasProps) {
  return (
    <div className="map-canvas">
      <div className="map-road r1" />
      <div className="map-road r2" />
      {labels.map((label, index) => (
        <div
          key={`${label}-${index}`}
          className={`map-zone ${ZONE_CLASSES[index] ?? "z1"}`}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

import {
  TerraDrawCircleMode,
  TerraDrawPointMode,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
} from "terra-draw";

export function zoneDrawModes() {
  return [
    new TerraDrawRenderMode({
      modeName: "render",
      styles: {
        polygonFillColor: "#1FA463",
        polygonFillOpacity: 0.15,
        polygonOutlineColor: "#111614",
        polygonOutlineWidth: 2,
        pointColor: "#111614",
        pointWidth: 8,
      },
    }),
    new TerraDrawPolygonMode(),
    new TerraDrawRectangleMode(),
    new TerraDrawCircleMode(),
    new TerraDrawPointMode(),
    new TerraDrawSelectMode({
      flags: {
        polygon: { feature: { draggable: true, coordinates: { midpoints: true, draggable: true, deletable: true } } },
        rectangle: { feature: { draggable: true } },
        point: { feature: { draggable: true } },
      },
    }),
  ];
}

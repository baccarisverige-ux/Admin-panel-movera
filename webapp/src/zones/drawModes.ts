import {
  TerraDrawCircleMode,
  TerraDrawFreehandMode,
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
    new TerraDrawPolygonMode({
      snapping: {
        toLine: true,
        toCoordinate: true,
      },
    }),
    new TerraDrawRectangleMode(),
    new TerraDrawCircleMode(),
    new TerraDrawFreehandMode(),
    new TerraDrawPointMode(),
    new TerraDrawSelectMode({
      flags: {
        polygon: {
          feature: {
            draggable: true,
            rotateable: true,
            coordinates: {
              midpoints: true,
              draggable: true,
              deletable: true,
              snappable: true,
            },
          },
        },
        rectangle: {
          feature: {
            draggable: true,
            rotateable: true,
          },
        },
        freehand: {
          feature: {
            draggable: true,
            rotateable: true,
            coordinates: {
              draggable: true,
              deletable: true,
              snappable: true,
            },
          },
        },
        point: { feature: { draggable: true } },
      },
    }),
  ];
}

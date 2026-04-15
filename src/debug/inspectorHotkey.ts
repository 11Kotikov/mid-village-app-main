import type { Scene } from "@babylonjs/core/scene";

export function setupInspectorHotkey(scene: Scene) {
  window.addEventListener("keydown", async (e) => {
    if (e.code !== "KeyI") return;

    await import("@babylonjs/inspector");

    if (scene.debugLayer.isVisible()) {
      scene.debugLayer.hide();
    } else {
      scene.debugLayer.show();
    }
  });
}
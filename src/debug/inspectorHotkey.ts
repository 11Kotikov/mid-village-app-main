import type { Scene } from "@babylonjs/core/scene";

export function setupInspectorHotkey(scene: Scene) {
  const onKeyDown = async (e: KeyboardEvent) => {
    if (e.code !== "KeyI") return;

    await import("@babylonjs/inspector");

    if (scene.debugLayer.isVisible()) {
      scene.debugLayer.hide();
    } else {
      scene.debugLayer.show();
    }
  };

  window.addEventListener("keydown", onKeyDown);

  return () => {
    window.removeEventListener("keydown", onKeyDown);

    if (scene.debugLayer.isVisible()) {
      scene.debugLayer.hide();
    }
  };
}

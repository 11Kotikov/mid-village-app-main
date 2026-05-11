// cameraControls.ts
import { ArcRotateCamera, Scene, Vector3 } from "@babylonjs/core";

/**
 * Подключает управление камерой WASD.
 * @returns Функцию для отписки от событий (вызвать при уничтожении камеры/сцены)
 */
export function attachWASDControls(
  camera: ArcRotateCamera,
  scene: Scene,
  speed: number = 5
): () => void {
  const activeKeys = new Set<string>();
  const normalizeKey = (key: string) => key.toLowerCase();

  const onKeyDown = (e: KeyboardEvent) => {
    const key = normalizeKey(e.key);
    if (["w", "a", "s", "d"].includes(key)) {
      activeKeys.add(key);
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const key = normalizeKey(e.key);
    activeKeys.delete(key);
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  let lastTime: number | null = null;
  const beforeRenderObserver = scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    if (lastTime === null) {
      lastTime = now;
      return;
    }
    const deltaMs = Math.min(100, now - lastTime);
    const deltaSec = deltaMs / 1000;
    lastTime = now;

    if (activeKeys.size === 0) return;

    const alpha = camera.alpha;
    const forward = new Vector3(Math.sin(alpha), 0, Math.cos(alpha));
    const right = new Vector3(Math.cos(alpha), 0, -Math.sin(alpha));

    let move = Vector3.Zero();
    if (activeKeys.has("w")) move.addInPlace(forward);
    if (activeKeys.has("s")) move.subtractInPlace(forward);
    if (activeKeys.has("d")) move.addInPlace(right);
    if (activeKeys.has("a")) move.subtractInPlace(right);

    if (move.length() > 0) move.normalize();
    const delta = move.scale(speed * deltaSec);
    camera.target.addInPlace(delta);
  });

  // Возвращаем функцию очистки
  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    scene.onBeforeRenderObservable.remove(beforeRenderObserver);
  };
}
import { ArcRotateCamera, Scene, Vector3 } from "@babylonjs/core";

/**
 * Подключает стабильное игровое управление камерой:
 * W/S - вперед/назад по направлению взгляда камеры,
 * A/D - влево/вправо по экранной горизонтали.
 * @returns Функцию для отписки от событий (вызвать при уничтожении камеры/сцены)
 */
export function attachWASDControls(
  camera: ArcRotateCamera,
  scene: Scene,
  speed: number = 6.5
): () => void {
  const activeKeys = new Set<string>();
  const movementKeys = new Map<string, "forward" | "left" | "back" | "right">([
    ["KeyW", "forward"],
    ["KeyA", "left"],
    ["KeyS", "back"],
    ["KeyD", "right"],
    ["ArrowUp", "forward"],
    ["ArrowLeft", "left"],
    ["ArrowDown", "back"],
    ["ArrowRight", "right"],
  ]);

  camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
  camera.inertia = 0.65;
  camera.panningInertia = 0;
  camera.lowerBetaLimit = 0.25;
  camera.upperBetaLimit = Math.PI * 0.48;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) {
      return;
    }

    const key = movementKeys.get(e.code);
    if (key) {
      activeKeys.add(key);
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const key = movementKeys.get(e.code);
    if (key) {
      activeKeys.delete(key);
    }
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

    const forward = camera
      .getTarget()
      .subtract(camera.position)
      .multiplyByFloats(1, 0, 1);

    if (forward.lengthSquared() <= 0.0001) {
      return;
    }

    forward.normalize();
    const right = new Vector3(forward.z, 0, -forward.x);

    let move = Vector3.Zero();
    if (activeKeys.has("forward")) move.addInPlace(forward);
    if (activeKeys.has("back")) move.subtractInPlace(forward);
    if (activeKeys.has("right")) move.addInPlace(right);
    if (activeKeys.has("left")) move.subtractInPlace(right);

    if (move.lengthSquared() > 0) move.normalize();
    const delta = move.scale(speed * deltaSec);
    camera.target.addInPlace(delta);
  });

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    scene.onBeforeRenderObservable.remove(beforeRenderObserver);
  };
}

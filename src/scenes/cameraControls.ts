import { ArcRotateCamera, Scene, Vector3 } from "@babylonjs/core";

export type CameraControlsOptions = {
  // Скорость движения камеры по W/A/S/D в игровых единицах в секунду.
  moveSpeed: number;
  // Чувствительность вращения при зажатом колесе мыши.
  middleMouseRotateSpeed: number;
  inertia: number;
  panningInertia: number;
  lowerBetaLimit: number;
  upperBetaLimit: number;
  pointerButtons: readonly number[];
};

type MiddleMouseDragState = {
  pointerId: number;
  x: number;
  y: number;
};

/**
 * Подключает стабильное игровое управление камерой:
 * W/S - вперед/назад по направлению взгляда камеры,
 * A/D - влево/вправо по экранной горизонтали.
 * Зажатое колесо мыши - вращение камеры вокруг цели без перемещения игрока.
 * @returns Функцию для отписки от событий (вызвать при уничтожении камеры/сцены)
 */
export function attachWASDControls(
  camera: ArcRotateCamera,
  scene: Scene,
  options: CameraControlsOptions
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
  camera.inertia = options.inertia;
  camera.panningInertia = options.panningInertia;
  camera.lowerBetaLimit = options.lowerBetaLimit;
  camera.upperBetaLimit = options.upperBetaLimit;

  const pointerInput = camera.inputs.attached.pointers as { buttons?: number[] } | undefined;
  if (pointerInput) {
    pointerInput.buttons = [...options.pointerButtons];
  }

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

  let middleMouseDrag: MiddleMouseDragState | null = null;
  const canvas = scene.getEngine().getRenderingCanvas();

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 1 || !canvas) {
      return;
    }

    middleMouseDrag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!middleMouseDrag || middleMouseDrag.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - middleMouseDrag.x;
    const dy = event.clientY - middleMouseDrag.y;
    middleMouseDrag.x = event.clientX;
    middleMouseDrag.y = event.clientY;

    camera.alpha -= dx * options.middleMouseRotateSpeed;
    camera.beta -= dy * options.middleMouseRotateSpeed;

    if (camera.lowerBetaLimit != null) {
      camera.beta = Math.max(camera.lowerBetaLimit, camera.beta);
    }

    if (camera.upperBetaLimit != null) {
      camera.beta = Math.min(camera.upperBetaLimit, camera.beta);
    }

    event.preventDefault();
  };

  const stopMiddleMouseDrag = (event: PointerEvent) => {
    if (!middleMouseDrag || middleMouseDrag.pointerId !== event.pointerId) {
      return;
    }

    canvas?.releasePointerCapture?.(event.pointerId);
    middleMouseDrag = null;
    event.preventDefault();
  };

  const blockContextMenu = (event: MouseEvent) => {
    if (middleMouseDrag) {
      event.preventDefault();
    }
  };

  canvas?.addEventListener("pointerdown", onPointerDown);
  canvas?.addEventListener("pointermove", onPointerMove);
  canvas?.addEventListener("pointerup", stopMiddleMouseDrag);
  canvas?.addEventListener("pointercancel", stopMiddleMouseDrag);
  canvas?.addEventListener("auxclick", blockContextMenu);

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
    const delta = move.scale(options.moveSpeed * deltaSec);
    camera.target.addInPlace(delta);
  });

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    canvas?.removeEventListener("pointerdown", onPointerDown);
    canvas?.removeEventListener("pointermove", onPointerMove);
    canvas?.removeEventListener("pointerup", stopMiddleMouseDrag);
    canvas?.removeEventListener("pointercancel", stopMiddleMouseDrag);
    canvas?.removeEventListener("auxclick", blockContextMenu);
    scene.onBeforeRenderObservable.remove(beforeRenderObserver);
  };
}

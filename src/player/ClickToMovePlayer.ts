import { Ray } from "@babylonjs/core/Culling/ray";
import { PointerEventTypes, type PointerInfo } from "@babylonjs/core/Events/pointerEvents";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { PickingInfo } from "@babylonjs/core/Collisions/pickingInfo";
import type { Observer } from "@babylonjs/core/Misc/observable";
import type { Scene } from "@babylonjs/core/scene";

import { PlayerActor } from "../entities/PlayerActor";

type ClickToMovePlayerOptions = {
  groundMeshes: AbstractMesh[];
  speed?: number;
  stopDistance?: number;
  clickThresholdPx?: number;
  raycastTopY?: number;
  raycastLength?: number;
  yawOffset?: number;
  onClick?: (hit: PickingInfo | null) => boolean;
};

type PointerDownState = {
  x: number;
  y: number;
  button: number;
} | null;

export class ClickToMovePlayer {
  #scene: Scene;
  #player: PlayerActor;
  #groundSet: Set<AbstractMesh>;
  #destination: Vector3 | null;
  #speed: number;
  #stopDistance: number;
  #clickThresholdSq: number;
  #raycastTopY: number;
  #raycastLength: number;
  #yawOffset: number;
  #onClick: ((hit: PickingInfo | null) => boolean) | null;
  #pointerObserver: Observer<PointerInfo> | null;
  #pointerDown: PointerDownState;

  constructor(scene: Scene, player: PlayerActor, opts: ClickToMovePlayerOptions) {
    this.#scene = scene;
    this.#player = player;
    this.#groundSet = new Set(opts.groundMeshes);
    this.#destination = null;
    this.#speed = opts.speed ?? 4.4;
    this.#stopDistance = opts.stopDistance ?? 0.18;
    this.#clickThresholdSq = Math.pow(opts.clickThresholdPx ?? 8, 2);
    this.#raycastTopY = opts.raycastTopY ?? 10000;
    this.#raycastLength = opts.raycastLength ?? 20000;
    this.#yawOffset = opts.yawOffset ?? 1;
    this.#onClick = opts.onClick ?? null;
    this.#pointerObserver = null;
    this.#pointerDown = null;

    this.#syncGround();
    this.#playIdle();

    this.#pointerObserver = this.#scene.onPointerObservable.add((pointerInfo) => {
      this.#handlePointer(pointerInfo);
    });
  }

  update(dt: number) {
    if (dt <= 0) return;

    if (this.#player.isDead) {
      this.#destination = null;
      return;
    }

    const destination = this.#destination;
    if (!destination) {
      this.#syncGround();
      return;
    }

    const root = this.#player.root;
    const dx = destination.x - root.position.x;
    const dz = destination.z - root.position.z;
    const distanceSq = dx * dx + dz * dz;
    const stopDistanceSq = this.#stopDistance * this.#stopDistance;

    if (distanceSq <= stopDistanceSq) {
      root.position.x = destination.x;
      root.position.z = destination.z;
      this.#destination = null;
      this.#syncGround();
      this.#playIdle();
      return;
    }

    const distance = Math.sqrt(distanceSq);
    const moveDistance = Math.min(this.#speed * dt, distance);
    const dirX = dx / distance;
    const dirZ = dz / distance;

    root.position.x += dirX * moveDistance;
    root.position.z += dirZ * moveDistance;
    root.rotationQuaternion = null;
    root.rotation.y = Math.atan2(dirX, dirZ) + this.#yawOffset;

    this.#syncGround();
    this.#playMove();
  }

  dispose() {
    if (this.#pointerObserver) {
      this.#scene.onPointerObservable.remove(this.#pointerObserver);
      this.#pointerObserver = null;
    }

    this.#destination = null;
    this.#pointerDown = null;
  }

  #handlePointer(pointerInfo: PointerInfo) {
    if (this.#player.isDead) {
      this.#destination = null;
      this.#pointerDown = null;
      return;
    }

    if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
      const event = pointerInfo.event;

      if (event.button === 0) {
        this.#pointerDown = {
          x: event.clientX,
          y: event.clientY,
          button: event.button,
        };
      }

      return;
    }

    if (pointerInfo.type !== PointerEventTypes.POINTERUP) {
      return;
    }

    const event = pointerInfo.event;
    const pointerDown = this.#pointerDown;
    this.#pointerDown = null;

    if (!pointerDown || pointerDown.button !== 0 || event.button !== 0) {
      return;
    }

    const dx = event.clientX - pointerDown.x;
    const dy = event.clientY - pointerDown.y;
    const dragDistanceSq = dx * dx + dy * dy;

    if (dragDistanceSq > this.#clickThresholdSq) {
      return;
    }

    const clickedHit = this.#scene.pick(this.#scene.pointerX, this.#scene.pointerY);

    if (this.#onClick?.(clickedHit ?? null)) {
      this.#destination = null;
      return;
    }

    const hit = this.#scene.pick(
      this.#scene.pointerX,
      this.#scene.pointerY,
      (mesh) => this.#groundSet.has(mesh as AbstractMesh)
    );

    if (!hit?.hit || !hit.pickedPoint) {
      return;
    }

    this.#destination = new Vector3(hit.pickedPoint.x, 0, hit.pickedPoint.z);
    this.#playMove();
  }

  #syncGround() {
    const root = this.#player.root;
    const ray = new Ray(
      new Vector3(root.position.x, this.#raycastTopY, root.position.z),
      Vector3.Down(),
      this.#raycastLength
    );

    const hit = this.#scene.pickWithRay(ray, (mesh) => this.#groundSet.has(mesh as AbstractMesh));

    if (hit?.hit && hit.pickedPoint) {
      root.position.y = hit.pickedPoint.y + this.#player.groundOffsetY;
    }
  }

  #playMove() {
    if (!this.#player.playRun(true) && !this.#player.playWalk(true)) {
      this.#player.playIdle(true);
    }
  }

  #playIdle() {
    if (
      !this.#player.playOnlyBySuffix("Idle_Neutral", true) &&
      !this.#player.playIdle(true)
    ) {
      this.#player.playWalk(true);
    }
  }
}

import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";

import * as YUKA from "yuka";
import { Enemy } from "../entities/Enemy";

type WanderEnemyOptions = {
  groundMeshes: AbstractMesh[];

  speed?: number;
  maxForce?: number;

  wanderRadius?: number;
  wanderDistance?: number;
  wanderJitter?: number;

  roamRadius?: number;
  raycastTopY?: number;
  raycastLength?: number;

  yawOffset?: number;
};

type AgentEntry = {
  enemy: Enemy;
  vehicle: YUKA.Vehicle;
  groundSet: Set<AbstractMesh>;

  originX: number;
  originZ: number;
  roamRadius: number;

  raycastTopY: number;
  raycastLength: number;

  yawOffset: number;
};

export class YukaWorld {
  #scene: Scene;
  #manager: YUKA.EntityManager;
  #agents: AgentEntry[];

  constructor(scene: Scene) {
    this.#scene = scene;
    this.#manager = new YUKA.EntityManager();
    this.#agents = [];
  }

  addWanderEnemy(enemy: Enemy, opts: WanderEnemyOptions) {
    const vehicle = new YUKA.Vehicle();

    vehicle.position.set(enemy.root.position.x, 0, enemy.root.position.z);
    vehicle.maxSpeed = opts.speed ?? 1.2;
    vehicle.maxForce = opts.maxForce ?? 10;
    vehicle.updateOrientation = false;

    const wander = new YUKA.WanderBehavior(
      opts.wanderRadius ?? 2.2,
      opts.wanderDistance ?? 2.5,
      opts.wanderJitter ?? 6.0
    );

    vehicle.steering.add(wander);
    this.#manager.add(vehicle);

    this.#agents.push({
      enemy,
      vehicle,
      groundSet: new Set(opts.groundMeshes),

      originX: enemy.root.position.x,
      originZ: enemy.root.position.z,
      roamRadius: opts.roamRadius ?? 20,

      raycastTopY: opts.raycastTopY ?? 10000,
      raycastLength: opts.raycastLength ?? 20000,

      yawOffset: opts.yawOffset ?? 0,
    });
  }

  update(dt: number) {
    if (dt <= 0) return;

    this.#manager.update(dt);

    for (const a of this.#agents) {
      const root = a.enemy.root;

      root.position.x = a.vehicle.position.x;
      root.position.z = a.vehicle.position.z;

      const dx = root.position.x - a.originX;
      const dz = root.position.z - a.originZ;
      const r2 = a.roamRadius * a.roamRadius;
      const d2 = dx * dx + dz * dz;

      if (d2 > r2) {
        const d = Math.sqrt(d2) || 1;
        const nx = dx / d;
        const nz = dz / d;

        const clampedX = a.originX + nx * a.roamRadius;
        const clampedZ = a.originZ + nz * a.roamRadius;

        root.position.x = clampedX;
        root.position.z = clampedZ;

        a.vehicle.position.set(clampedX, 0, clampedZ);
        a.vehicle.velocity.multiplyScalar(0.25);
      }

      const ray = new Ray(
        new Vector3(root.position.x, a.raycastTopY, root.position.z),
        Vector3.Down(),
        a.raycastLength
      );

      const hit = this.#scene.pickWithRay(ray, (m) => a.groundSet.has(m as AbstractMesh));

      if (hit?.hit && hit.pickedPoint) {
        root.position.y = hit.pickedPoint.y + a.enemy.groundOffsetY;
      }

      const vx = a.vehicle.velocity.x;
      const vz = a.vehicle.velocity.z;
      const speedSq = vx * vx + vz * vz;

      if (speedSq > 0.0001) {
        root.rotationQuaternion = null;
        root.rotation.y = Math.atan2(vx, vz) + a.yawOffset;
      }
    }
  }

  dispose() {
    this.#agents = [];
    this.#manager = new YUKA.EntityManager();
  }
}
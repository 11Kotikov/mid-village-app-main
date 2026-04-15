import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

import { Enemy } from "./Enemy";
import { EnemyPrefab } from "./EnemyPrefab";

type SpawnOpts = {
  groundMeshes?: AbstractMesh[];
};

export class EnemySpawner {
  #enemies: Enemy[];

  constructor() {
    this.#enemies = [];
  }

  get enemies(): Enemy[] {
    return this.#enemies;
  }

  spawnMany(
    prefab: EnemyPrefab,
    points: Vector3[],
    baseName: string,
    opts: SpawnOpts = {}
  ): Enemy[] {
    const created: Enemy[] = [];

    points.forEach((p, i) => {
      const enemy = prefab.spawn(new Vector3(p.x, p.y, p.z), `${baseName}_${i}`, {
        groundMeshes: opts.groundMeshes,
      });

      this.#enemies.push(enemy);
      created.push(enemy);
    });

    return created;
  }

  update(dt: number) {
    for (const e of this.#enemies) {
      e.update(dt);
    }
  }

  disposeAll() {
    for (const e of this.#enemies) {
      e.dispose();
    }
    this.#enemies = [];
  }
}
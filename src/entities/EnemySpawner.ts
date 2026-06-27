import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

import { CombatActor } from "./CombatActor";
import { ActorPrefab } from "./ActorPrefab";

type SpawnOpts = {
  groundMeshes?: AbstractMesh[];
};

export class EnemySpawner {
  #enemies: CombatActor[];

  constructor() {
    this.#enemies = [];
  }

  get enemies(): CombatActor[] {
    return this.#enemies;
  }

  spawnMany(
    prefab: ActorPrefab,
    points: Vector3[],
    baseName: string,
    opts: SpawnOpts = {}
  ): CombatActor[] {
    const created: CombatActor[] = [];

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

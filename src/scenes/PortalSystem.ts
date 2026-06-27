import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import type { LevelKey } from "../assets/paths";
import { createPortalLabel } from "../effects/PortalLabel";
import { PortalParticleSystem } from "../effects/PortalParticleSystem";
import {
  LEVEL_PORTALS,
  type LevelPortalDefinition,
} from "../world/levelPortalConfig";

export type ActivePortal = {
  definition: LevelPortalDefinition;
  position: Vector3;
  effect: PortalParticleSystem;
  labelRoot: TransformNode | null;
};

type PortalSystemOptions = {
  getGroundedPosition: (position: Vector3, groundMeshes: AbstractMesh[]) => Vector3;
  onPortalEntered: (portal: LevelPortalDefinition) => void;
};

export class PortalSystem {
  #scene: Scene;
  #getGroundedPosition: PortalSystemOptions["getGroundedPosition"];
  #onPortalEntered: PortalSystemOptions["onPortalEntered"];
  #activePortals: ActivePortal[] = [];

  constructor(scene: Scene, options: PortalSystemOptions) {
    this.#scene = scene;
    this.#getGroundedPosition = options.getGroundedPosition;
    this.#onPortalEntered = options.onPortalEntered;
  }

  createForLevel(levelKey: LevelKey, groundMeshes: AbstractMesh[]) {
    this.dispose();

    for (const definition of LEVEL_PORTALS[levelKey]) {
      const radius = definition.radius ?? 2.4;
      const visualHeight = definition.visualHeight ?? 3;
      const groundPosition = this.#getGroundedPosition(definition.position, groundMeshes);
      const visualCenter = groundPosition.add(new Vector3(0, visualHeight, 0));
      const effect = new PortalParticleSystem(this.#scene, {
        center: visualCenter,
        orbitRadius: radius * 0.8,
        angularSpeed: 2,
        emitRate: 1000,
        maxLifeTime: 8,
        minSize: 0.05,
        maxSize: 0.1,
        useRectEmitter: true,
        rectWidth: radius * 1.6,
        rectHeight: visualHeight,
        color1: definition.particleColors?.color1,
        color2: definition.particleColors?.color2,
        colorDead: definition.particleColors?.colorDead,
      });

      this.#activePortals.push({
        definition,
        position: groundPosition,
        effect,
        labelRoot: createPortalLabel(this.#scene, definition, visualCenter, visualHeight),
      });
    }
  }

  update(dt: number) {
    for (const portal of this.#activePortals) {
      portal.effect.update(dt);
    }
  }

  checkTransitions(playerPosition: Vector3 | null, cooldownLeft: number) {
    if (!playerPosition || cooldownLeft > 0) {
      return;
    }

    for (const portal of this.#activePortals) {
      const radius = portal.definition.radius ?? 2.4;
      const dx = playerPosition.x - portal.position.x;
      const dz = playerPosition.z - portal.position.z;

      if (dx * dx + dz * dz <= radius * radius) {
        this.#onPortalEntered(portal.definition);
        return;
      }
    }
  }

  dispose() {
    for (const portal of this.#activePortals) {
      portal.effect.dispose();
      portal.labelRoot?.dispose(false, true);
    }

    this.#activePortals = [];
  }
}

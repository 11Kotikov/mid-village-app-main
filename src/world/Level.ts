import type { Scene } from "@babylonjs/core/scene";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

type LevelOptions = {
  scale?: number;
  placeOnGround?: boolean;
  groundY?: number;
  logBounds?: boolean;
};

export class Level {
  #scene: Scene;
  #container: AssetContainer;
  #root: TransformNode;
  #opts: Required<LevelOptions>;
  #pickMeshes: AbstractMesh[];

  constructor(scene: Scene, container: AssetContainer, opts: LevelOptions = {}) {
    this.#scene = scene;
    this.#container = container;

    this.#opts = {
      scale: opts.scale ?? 1,
      placeOnGround: opts.placeOnGround ?? true,
      groundY: opts.groundY ?? 0,
      logBounds: opts.logBounds ?? true,
    };

    this.#container.addAllToScene();

    this.#root = new TransformNode("level_root", this.#scene);
    for (const n of this.#container.rootNodes) {
      n.parent = this.#root;
    }

    this.#root.scaling.setAll(this.#opts.scale);

    this.#pickMeshes = this.#root.getChildMeshes(false) as AbstractMesh[];
    for (const m of this.#pickMeshes) {
      m.isPickable = true;
    }

    if (this.#opts.placeOnGround) {
      const minY = this.#getMinYWorld(this.#root);
      this.#root.position.y += this.#opts.groundY - minY;
    }

    if (this.#opts.logBounds) {
      const b = this.#getBoundsWorld(this.#root);
      console.log(
        `[level] scale=${this.#opts.scale} size=` +
          `${(b.maxX - b.minX).toFixed(2)} x ${(b.maxY - b.minY).toFixed(2)} x ${(b.maxZ - b.minZ).toFixed(2)}`
      );
    }
  }

  get root(): TransformNode {
    return this.#root;
  }

  get pickMeshes(): AbstractMesh[] {
    return this.#pickMeshes;
  }

  getPickMeshesBySuffix(suffixes: string[]): AbstractMesh[] {
    const normalized = suffixes.map((s) => s.toLowerCase());

    return this.#pickMeshes.filter((m) => {
      const name = m.name.toLowerCase();
      return normalized.some((suffix) => name.endsWith(suffix));
    });
  }

  getPickMeshesByNameIncludes(parts: string[]): AbstractMesh[] {
    const normalized = parts.map((p) => p.toLowerCase());

    return this.#pickMeshes.filter((m) => {
      const name = m.name.toLowerCase();
      return normalized.some((part) => name.includes(part));
    });
  }

  logPickMeshes() {
    console.table(
      this.#pickMeshes.map((m) => ({
        name: m.name,
        material: m.material?.name ?? "(no material)",
      }))
    );
  }

  dispose() {
    this.#container.dispose();
    this.#root.dispose();
  }

  #getChildMeshes(root: TransformNode): AbstractMesh[] {
    return root.getChildMeshes(false) as AbstractMesh[];
  }

  #getMinYWorld(root: TransformNode): number {
    const meshes = this.#getChildMeshes(root);
    let minY = Number.POSITIVE_INFINITY;

    for (const m of meshes) {
      m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo().boundingBox;
      minY = Math.min(minY, bb.minimumWorld.y);
    }

    return minY === Number.POSITIVE_INFINITY ? 0 : minY;
  }

  #getBoundsWorld(root: TransformNode) {
    const meshes = this.#getChildMeshes(root);

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (const m of meshes) {
      m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo().boundingBox;

      minX = Math.min(minX, bb.minimumWorld.x);
      minY = Math.min(minY, bb.minimumWorld.y);
      minZ = Math.min(minZ, bb.minimumWorld.z);

      maxX = Math.max(maxX, bb.maximumWorld.x);
      maxY = Math.max(maxY, bb.maximumWorld.y);
      maxZ = Math.max(maxZ, bb.maximumWorld.z);
    }

    if (minX === Number.POSITIVE_INFINITY) {
      return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
    }

    return { minX, minY, minZ, maxX, maxY, maxZ };
  }
}
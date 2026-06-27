import type { Scene } from "@babylonjs/core/scene";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

import { CombatActor, type ActorAnimationSet } from "./CombatActor";
import { getHierarchyHeight, getHierarchyMinY } from "../assets/measure";

type SizeOptions = { targetHeight: number } | { scale: number };

type SpawnOptions = {
  groundMeshes?: AbstractMesh[];
  placeOnGround?: boolean;
  groundY?: number;
  raycastTopY?: number;
  raycastLength?: number;
  logSizing?: boolean;
};

type ActorConstructor<TActor extends CombatActor> = new (
  root: TransformNode,
  animationGroups: AnimationGroup[],
  animations?: ActorAnimationSet
) => TActor;

export class ActorPrefab<TActor extends CombatActor = CombatActor> {
  #scene: Scene;
  #container: AssetContainer;
  #kind: string;

  #targetHeight: number | null;
  #fixedScale: number | null;
  #animations: ActorAnimationSet;
  #ActorClass: ActorConstructor<TActor>;

  #defaults: Required<Omit<SpawnOptions, "groundMeshes">> & { groundMeshes: undefined };

  constructor(
    scene: Scene,
    container: AssetContainer,
    kind: string,
    size: SizeOptions,
    animations: ActorAnimationSet = {},
    ActorClass: ActorConstructor<TActor> = CombatActor as ActorConstructor<TActor>
  ) {
    this.#scene = scene;
    this.#container = container;
    this.#kind = kind;
    this.#animations = animations;
    this.#ActorClass = ActorClass;

    if ("targetHeight" in size) {
      this.#targetHeight = size.targetHeight;
      this.#fixedScale = null;
    } else {
      this.#fixedScale = size.scale;
      this.#targetHeight = null;
    }

    this.#defaults = {
      groundMeshes: undefined,
      placeOnGround: true,
      groundY: 0,
      raycastTopY: 10000,
      raycastLength: 20000,
      logSizing: true,
    };
  }

  spawn(position: Vector3, name = this.#kind, opts: SpawnOptions = {}): TActor {
    const options = { ...this.#defaults, ...opts };

    const inst = this.#container.instantiateModelsToScene(
      (sourceName) => `${name}_${sourceName}`,
      true
    );

    const root = new TransformNode(name, this.#scene);
    for (const n of inst.rootNodes) {
      n.parent = root;
    }

    root.position.copyFrom(position);

    root.scaling.setAll(1);
    const rawH = getHierarchyHeight(root);

    let scaleToApply = 1;
    if (this.#targetHeight != null && rawH > 0) {
      scaleToApply = this.#targetHeight / rawH;
    } else if (this.#fixedScale != null) {
      scaleToApply = this.#fixedScale;
    }

    root.scaling.setAll(scaleToApply);

    let hitGroundY: number | null = null;

    if (options.groundMeshes && options.groundMeshes.length > 0) {
      const ray = new Ray(
        new Vector3(root.position.x, options.raycastTopY, root.position.z),
        Vector3.Down(),
        options.raycastLength
      );

      const set = new Set(options.groundMeshes);
      const hit = this.#scene.pickWithRay(ray, (m) => set.has(m as AbstractMesh));

      if (hit?.hit && hit.pickedPoint) {
        const minY = getHierarchyMinY(root);
        root.position.y += hit.pickedPoint.y - minY;
        hitGroundY = hit.pickedPoint.y;
      } else if (options.placeOnGround) {
        const minY = getHierarchyMinY(root);
        root.position.y += options.groundY - minY;
        hitGroundY = options.groundY;
      }
    } else if (options.placeOnGround) {
      const minY = getHierarchyMinY(root);
      root.position.y += options.groundY - minY;
      hitGroundY = options.groundY;
    }

    if (options.logSizing) {
      const finalH = getHierarchyHeight(root);
      console.log(
        `[spawn] ${name} rawH=${rawH.toFixed(3)} ` +
          `target=${this.#targetHeight ?? "-"} ` +
          `scale=${scaleToApply.toFixed(4)} finalH=${finalH.toFixed(3)}`
      );
    }

    const actor = new this.#ActorClass(root, inst.animationGroups, this.#animations);

    if (hitGroundY != null) {
      actor.setGroundOffsetY(root.position.y - hitGroundY);
    }

    if (!actor.playWalk(true)) {
      actor.playIdle(true);
    }

    return actor;
  }

  dispose() {
    this.#container.dispose();
  }
}

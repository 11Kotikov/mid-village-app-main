import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import { loadGLBAsContainer } from "../assets/loaders";
import { getHierarchyHeight, getHierarchyMinY } from "../assets/measure";

export type LoadedSceneObject = {
  container: AssetContainer;
  root: TransformNode;
};

export type LoadSceneObjectOptions = {
  name: string;
  position: Vector3;
  groundMeshes: AbstractMesh[];
  getGroundedPosition: (position: Vector3, groundMeshes: AbstractMesh[]) => Vector3;
  targetHeight?: number;
  scale?: number;
  rotationY?: number;
};

export async function loadSceneObject(
  scene: Scene,
  url: string,
  options: LoadSceneObjectOptions
): Promise<LoadedSceneObject> {
  const container = await loadGLBAsContainer(scene, url);
  container.addAllToScene();

  const root = new TransformNode(options.name, scene);
  for (const node of container.rootNodes) {
    node.parent = root;
  }

  root.position.copyFrom(options.getGroundedPosition(options.position, options.groundMeshes));
  root.rotation.y = options.rotationY ?? 0;

  if (options.targetHeight != null) {
    const rawHeight = getHierarchyHeight(root);
    if (rawHeight > 0) {
      root.scaling.setAll(options.targetHeight / rawHeight);
    }
  } else if (options.scale != null) {
    root.scaling.setAll(options.scale);
  }

  const minY = getHierarchyMinY(root);
  root.position.y += root.position.y - minY;

  return { container, root };
}

export function findAnimationBySuffix(
  animationGroups: AnimationGroup[],
  suffixes: string[]
): AnimationGroup | null {
  const normalized = suffixes.map((suffix) => suffix.toLowerCase());

  for (const suffix of normalized) {
    for (const group of animationGroups) {
      const raw = (group.name ?? "").toLowerCase();
      const tail = raw.split("|").pop() ?? raw;

      if (tail === suffix || raw.endsWith(`|${suffix}`) || raw.endsWith(suffix)) {
        return group;
      }
    }
  }

  return null;
}

export function playSceneObjectAnimation(
  object: LoadedSceneObject,
  animation: AnimationGroup | null,
  loop: boolean
) {
  if (!animation) {
    return;
  }

  for (const group of object.container.animationGroups) {
    if (group === animation) {
      continue;
    }

    group.stop();
    group.reset();
  }

  animation.reset();
  animation.start(loop);
}

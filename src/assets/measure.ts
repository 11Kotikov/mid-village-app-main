import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

export function getHierarchyHeight(root: TransformNode): number {
  const meshes = root.getChildMeshes(false) as AbstractMesh[];
  if (meshes.length === 0) return 0;

  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const m of meshes) {
    m.computeWorldMatrix(true);
    const bb = m.getBoundingInfo().boundingBox;
    minY = Math.min(minY, bb.minimumWorld.y);
    maxY = Math.max(maxY, bb.maximumWorld.y);
  }

  return maxY - minY;
}

export function getHierarchyMinY(root: TransformNode): number {
  const meshes = root.getChildMeshes(false) as AbstractMesh[];
  if (meshes.length === 0) return 0;

  let minY = Number.POSITIVE_INFINITY;

  for (const m of meshes) {
    m.computeWorldMatrix(true);
    const bb = m.getBoundingInfo().boundingBox;
    minY = Math.min(minY, bb.minimumWorld.y);
  }

  return minY === Number.POSITIVE_INFINITY ? 0 : minY;
}
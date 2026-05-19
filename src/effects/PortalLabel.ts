import { Mesh, MeshBuilder } from "@babylonjs/core/Meshes";
import type { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

import { GAME_SETTINGS } from "../config/gameSettings";
import type { LevelPortalDefinition } from "../world/levelPortalConfig";

const PORTAL_LABEL_TEXTURE_WIDTH = GAME_SETTINGS.portalLabels.textureWidth;
const PORTAL_LABEL_TEXTURE_HEIGHT = GAME_SETTINGS.portalLabels.textureHeight;

export function createPortalLabel(
  scene: Scene,
  definition: LevelPortalDefinition,
  visualCenter: Vector3,
  visualHeight: number
): TransformNode | null {
  if (!definition.label) {
    return null;
  }

  const labelRoot = new TransformNode(`portal_label_${definition.id}`, scene);
  labelRoot.position.copyFrom(visualCenter.add(new Vector3(0, visualHeight * 0.55 + 0.35, 0)));

  const texture = new DynamicTexture(
    `${definition.id}_label_texture`,
    { width: PORTAL_LABEL_TEXTURE_WIDTH, height: PORTAL_LABEL_TEXTURE_HEIGHT },
    scene,
    false
  );
  texture.hasAlpha = true;

  const context = texture.getContext() as CanvasRenderingContext2D;
  context.clearRect(0, 0, PORTAL_LABEL_TEXTURE_WIDTH, PORTAL_LABEL_TEXTURE_HEIGHT);
  context.fillStyle = "rgba(18, 13, 8, 0.82)";
  context.fillRect(20, 20, PORTAL_LABEL_TEXTURE_WIDTH - 40, PORTAL_LABEL_TEXTURE_HEIGHT - 40);
  context.strokeStyle = "rgba(255, 217, 140, 0.95)";
  context.lineWidth = 10;
  context.strokeRect(20, 20, PORTAL_LABEL_TEXTURE_WIDTH - 40, PORTAL_LABEL_TEXTURE_HEIGHT - 40);
  context.font = "700 58px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#ffe6aa";
  context.fillText(
    definition.label,
    PORTAL_LABEL_TEXTURE_WIDTH / 2,
    PORTAL_LABEL_TEXTURE_HEIGHT / 2 + 4
  );
  texture.update();

  const material = new StandardMaterial(`${definition.id}_label_material`, scene);
  material.diffuseTexture = texture;
  material.emissiveColor = new Color3(1, 0.78, 0.38);
  material.backFaceCulling = false;
  material.useAlphaFromDiffuseTexture = true;

  const plane = MeshBuilder.CreatePlane(
    `${definition.id}_label_plane`,
    {
      width: GAME_SETTINGS.portalLabels.planeWidth,
      height: GAME_SETTINGS.portalLabels.planeHeight,
    },
    scene
  );
  plane.parent = labelRoot;
  plane.material = material;
  plane.billboardMode = Mesh.BILLBOARDMODE_Y;
  plane.isPickable = false;

  return labelRoot;
}

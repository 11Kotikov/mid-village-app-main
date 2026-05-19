import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Color4 } from "@babylonjs/core/Maths/math.color";

import type { LevelKey } from "../assets/paths";
import { GAME_SETTINGS } from "../config/gameSettings";

export type LevelPortalDefinition = {
  id: string;
  position: Vector3;
  targetLevel: LevelKey;
  targetPortalId: string;
  label?: string;
  radius?: number;
  arrivalOffset?: Vector3;
  visualHeight?: number;
  particleColors?: {
    color1: Color4;
    color2: Color4;
    colorDead: Color4;
  };
};

type LevelSetup = {
  scale: number;
  startPosition: Vector3;
};

function withPortalDefaults(definition: LevelPortalDefinition): LevelPortalDefinition {
  return {
    ...definition,
    radius: definition.radius ?? GAME_SETTINGS.portalCommon.radius,
    arrivalOffset: definition.arrivalOffset ?? GAME_SETTINGS.portalCommon.arrivalOffset,
    visualHeight: definition.visualHeight ?? GAME_SETTINGS.portalCommon.visualHeight,
  };
}

export const LEVEL_SETUP = GAME_SETTINGS.levels satisfies Record<LevelKey, LevelSetup>;

export const LEVEL_PORTALS = {
  Blocks_Trailer_Map: GAME_SETTINGS.portals.Blocks_Trailer_Map.map(withPortalDefaults),
  Cave_Scene_Draft: GAME_SETTINGS.portals.Cave_Scene_Draft.map(withPortalDefaults),
  Dark_Stage: GAME_SETTINGS.portals.Dark_Stage.map(withPortalDefaults),
  Snow_Terrain: GAME_SETTINGS.portals.Snow_Terrain.map(withPortalDefaults),
  Walk_in_the_Woods: GAME_SETTINGS.portals.Walk_in_the_Woods.map(withPortalDefaults),
  Warefall: GAME_SETTINGS.portals.Warefall.map(withPortalDefaults),
  World_Village: GAME_SETTINGS.portals.World_Village.map(withPortalDefaults),
} satisfies Record<LevelKey, LevelPortalDefinition[]>;

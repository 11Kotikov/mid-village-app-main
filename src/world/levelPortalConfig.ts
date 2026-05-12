import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import type { LevelKey } from "../assets/paths";

export type LevelPortalDefinition = {
  id: string;
  position: Vector3;
  targetLevel: LevelKey;
  targetPortalId: string;
  radius?: number;
  arrivalOffset?: Vector3;
  visualHeight?: number;
};

type LevelSetup = {
  scale: number;
  startPosition: Vector3;
};

const DEFAULT_ARRIVAL_OFFSET = new Vector3(0, 0, -4);
const DEFAULT_RADIUS = 2.4;
const DEFAULT_VISUAL_HEIGHT = 3;

function portal(
  id: string,
  position: Vector3,
  targetLevel: LevelKey,
  targetPortalId: string,
  arrivalOffset: Vector3 = DEFAULT_ARRIVAL_OFFSET
): LevelPortalDefinition {
  return {
    id,
    position,
    targetLevel,
    targetPortalId,
    radius: DEFAULT_RADIUS,
    arrivalOffset,
    visualHeight: DEFAULT_VISUAL_HEIGHT,
  };
}

export const LEVEL_SETUP = {
  Blocks_Trailer_Map: {
    scale: 50,
    startPosition: new Vector3(0, 0, -6),
  },
  Cave_Scene_Draft: {
    scale: 50,
    startPosition: new Vector3(0, 0, -6),
  },
  Snow_Terrain: {
    scale: 50,
    startPosition: new Vector3(0, 0, -6),
  },
  Walk_in_the_Woods: {
    scale: 50,
    startPosition: new Vector3(-9.45, 0, 26),
  },
  Warefall: {
    scale: 50,
    startPosition: new Vector3(0, 0, -6),
  },
  World_Village: {
    scale: 50,
    startPosition: new Vector3(0, 0, -6),
  },
} satisfies Record<LevelKey, LevelSetup>;

export const LEVEL_PORTALS = {
  Blocks_Trailer_Map: [
    portal("blocks_from_village", new Vector3(0, 0, 0), "World_Village", "village_to_blocks"),
  ],
  Cave_Scene_Draft: [
    portal("cave_from_village", new Vector3(0, 0, 0), "World_Village", "village_to_cave"),
    portal("cave_to_snow", new Vector3(7, 0, 0), "Snow_Terrain", "snow_from_cave", new Vector3(-4, 0, 0)),
  ],
  Snow_Terrain: [
    portal("snow_from_village", new Vector3(-6, 0, 0), "World_Village", "village_to_snow", new Vector3(0, 0, -4)),
    portal("snow_from_cave", new Vector3(0, 0, 6), "Cave_Scene_Draft", "cave_to_snow", new Vector3(0, 0, -4)),
    portal("snow_to_waterfall", new Vector3(6, 0, 0), "Warefall", "waterfall_from_snow", new Vector3(-4, 0, 0)),
  ],
  Walk_in_the_Woods: [
    portal("woods_to_village", new Vector3(-10, 0, 30), "World_Village", "village_from_woods", new Vector3(0, 0, -4)),
  ],
  Warefall: [
    portal("waterfall_from_village", new Vector3(-6, 0, 0), "World_Village", "village_to_waterfall", new Vector3(0, 0, -4)),
    portal("waterfall_from_snow", new Vector3(0, 0, 6), "Snow_Terrain", "snow_to_waterfall", new Vector3(0, 0, -4)),
  ],
  World_Village: [
    portal("village_from_woods", new Vector3(-8, 0, 0), "Walk_in_the_Woods", "woods_to_village", new Vector3(0, 0, -4)),
    portal("village_to_cave", new Vector3(0, 0, 8), "Cave_Scene_Draft", "cave_from_village", new Vector3(0, 0, -4)),
    portal("village_to_snow", new Vector3(8, 0, 0), "Snow_Terrain", "snow_from_village", new Vector3(4, 0, 0)),
    portal("village_to_blocks", new Vector3(0, 0, -8), "Blocks_Trailer_Map", "blocks_from_village", new Vector3(0, 0, -4)),
    portal("village_to_waterfall", new Vector3(8, 0, 8), "Warefall", "waterfall_from_village", new Vector3(4, 0, 0)),
  ],
} satisfies Record<LevelKey, LevelPortalDefinition[]>;

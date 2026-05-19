import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import type { LevelKey } from "../assets/paths";
import { GAME_SETTINGS } from "../config/gameSettings";

export type PatrolRouteNode = {
  name: string;
  position: Vector3;
  pauseSeconds?: number;
};

export type LevelEnemyGroupConfig = {
  model: string;
  baseName?: string;
  startNodeIndices: readonly number[];
  boss?: boolean;
};

export type LevelEnemyPatrolConfig = {
  route: readonly PatrolRouteNode[];
  groups: readonly LevelEnemyGroupConfig[];
};

function getLevelEnemyConfig(levelKey: LevelKey): LevelEnemyPatrolConfig {
  const config = GAME_SETTINGS.enemiesByLevel[levelKey];

  return {
    route: config.route,
    groups: config.groups,
  };
}

export const ENEMY_PATROL_ROUTE = GAME_SETTINGS.enemiesByLevel.World_Village.route;

export const LEVEL_ENEMY_PATROL_CONFIG = {
  Blocks_Trailer_Map: getLevelEnemyConfig("Blocks_Trailer_Map"),
  Cave_Scene_Draft: getLevelEnemyConfig("Cave_Scene_Draft"),
  Dark_Stage: getLevelEnemyConfig("Dark_Stage"),
  Snow_Terrain: getLevelEnemyConfig("Snow_Terrain"),
  Walk_in_the_Woods: getLevelEnemyConfig("Walk_in_the_Woods"),
  Warefall: getLevelEnemyConfig("Warefall"),
  World_Village: getLevelEnemyConfig("World_Village"),
} satisfies Record<LevelKey, LevelEnemyPatrolConfig>;

export function getPatrolSpawnPoints(
  route: readonly PatrolRouteNode[],
  startNodeIndices: readonly number[]
): Vector3[] {
  return startNodeIndices.map((index) => route[index].position.clone());
}

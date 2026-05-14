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

type EnemyRouteKey = keyof typeof GAME_SETTINGS.enemyRoutes;

function getLevelEnemyConfig(levelKey: LevelKey): LevelEnemyPatrolConfig {
  const config = GAME_SETTINGS.enemiesByLevel[levelKey];
  const routeKey = config.route as EnemyRouteKey;

  return {
    route: GAME_SETTINGS.enemyRoutes[routeKey] ?? GAME_SETTINGS.enemyRoutes.default,
    groups: config.groups,
  };
}

export const ENEMY_PATROL_ROUTE = GAME_SETTINGS.enemyRoutes.default;

export const LEVEL_ENEMY_PATROL_CONFIG = {
  Blocks_Trailer_Map: getLevelEnemyConfig("Blocks_Trailer_Map"),
  Cave_Scene_Draft: getLevelEnemyConfig("Cave_Scene_Draft"),
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

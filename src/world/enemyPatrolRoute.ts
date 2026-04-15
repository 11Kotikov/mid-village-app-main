import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export type PatrolRouteNode = {
  name: string;
  position: Vector3;
  pauseSeconds?: number;
};

export const ENEMY_PATROL_ROUTE: PatrolRouteNode[] = [
  { name: "stop_1", position: new Vector3(2, 0, 8), pauseSeconds: 2.5 },
  { name: "turn_top_right", position: new Vector3(10, 0, 8) },
  { name: "stop_2", position: new Vector3(10, 0, 2), pauseSeconds: 2.5 },
  { name: "turn_bottom_right", position: new Vector3(10, 0, -4) },
  { name: "stop_3", position: new Vector3(4, 0, -4), pauseSeconds: 2.5 },
  { name: "stop_4", position: new Vector3(-3, 0, -4), pauseSeconds: 2.5 },
  { name: "turn_left_lower", position: new Vector3(-3, 0, 1) },
  { name: "stop_5", position: new Vector3(-8, 0, 1), pauseSeconds: 2.5 },
  { name: "turn_center_left", position: new Vector3(2, 0, 1) },
];

export const GOBLIN_PATROL_START_NODE_INDICES = [0, 2, 4];
export const ORC_PATROL_START_NODE_INDICES = [5, 7];

export function getPatrolSpawnPoints(startNodeIndices: number[]): Vector3[] {
  return startNodeIndices.map((index) => ENEMY_PATROL_ROUTE[index].position.clone());
}

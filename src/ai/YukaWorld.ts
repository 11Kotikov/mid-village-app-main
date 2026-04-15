import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";

import * as YUKA from "yuka";
import { Enemy } from "../entities/Enemy";

type PatrolRouteNode = {
  name?: string;
  position: Vector3;
  pauseSeconds?: number;
};

type PatrolEnemyOptions = {
  groundMeshes: AbstractMesh[];
  route: PatrolRouteNode[];

  startNodeIndex?: number;
  speed?: number;
  maxForce?: number;
  arriveDeceleration?: number;
  nodeReachedDistance?: number;
  raycastTopY?: number;
  raycastLength?: number;
  yawOffset?: number;
};

type AgentEntry = {
  enemy: Enemy;
  vehicle: YUKA.Vehicle;
  arriveBehavior: YUKA.ArriveBehavior;
  groundSet: Set<AbstractMesh>;
  route: PatrolRouteNode[];
  currentNodeIndex: number;
  waitTimeLeft: number;
  nodeReachedDistance: number;
  raycastTopY: number;
  raycastLength: number;
  yawOffset: number;
};

export class YukaWorld {
  #scene: Scene;
  #manager: YUKA.EntityManager;
  #agents: AgentEntry[];

  constructor(scene: Scene) {
    this.#scene = scene;
    this.#manager = new YUKA.EntityManager();
    this.#agents = [];
  }

  addPatrolEnemy(enemy: Enemy, opts: PatrolEnemyOptions) {
    if (opts.route.length === 0) {
      return;
    }

    const route = opts.route.map((node) => ({
      name: node.name,
      position: node.position.clone(),
      pauseSeconds: node.pauseSeconds ?? 0,
    }));

    const startNodeIndex = this.#normalizeNodeIndex(opts.startNodeIndex ?? 0, route.length);
    const startNode = route[startNodeIndex];
    const vehicle = new YUKA.Vehicle();

    vehicle.position.set(enemy.root.position.x, 0, enemy.root.position.z);
    vehicle.maxSpeed = opts.speed ?? 1.2;
    vehicle.maxForce = opts.maxForce ?? 10;
    vehicle.updateOrientation = false;
    const arriveBehavior = new YUKA.ArriveBehavior(
      new YUKA.Vector3(startNode.position.x, 0, startNode.position.z),
      opts.arriveDeceleration ?? 2,
      0
    );

    vehicle.steering.add(arriveBehavior);
    this.#manager.add(vehicle);

    const agent: AgentEntry = {
      enemy,
      vehicle,
      arriveBehavior,
      groundSet: new Set(opts.groundMeshes),
      route,
      currentNodeIndex: startNodeIndex,
      waitTimeLeft: 0,
      nodeReachedDistance: opts.nodeReachedDistance ?? 0.45,
      raycastTopY: opts.raycastTopY ?? 10000,
      raycastLength: opts.raycastLength ?? 20000,
      yawOffset: opts.yawOffset ?? 0,
    };

    this.#agents.push(agent);

    if (this.#hasReachedCurrentNode(agent)) {
      this.#snapToCurrentNode(agent);
      this.#enterPause(agent);
      return;
    }

    this.#playWalk(agent.enemy);
  }

  update(dt: number) {
    if (dt <= 0) return;

    this.#manager.update(dt);

    for (const a of this.#agents) {
      const root = a.enemy.root;

      root.position.x = a.vehicle.position.x;
      root.position.z = a.vehicle.position.z;
      this.#syncGround(a);

      if (a.waitTimeLeft > 0) {
        a.waitTimeLeft = Math.max(0, a.waitTimeLeft - dt);

        if (a.waitTimeLeft === 0) {
          this.#moveToNextNode(a);
        }
      } else if (this.#hasReachedCurrentNode(a)) {
        this.#snapToCurrentNode(a);
        this.#enterPause(a);
      }

      const vx = a.vehicle.velocity.x;
      const vz = a.vehicle.velocity.z;
      const speedSq = vx * vx + vz * vz;

      if (speedSq > 0.0001) {
        root.rotationQuaternion = null;
        root.rotation.y = Math.atan2(vx, vz) + a.yawOffset;
      }
    }
  }

  dispose() {
    this.#agents = [];
    this.#manager = new YUKA.EntityManager();
  }

  #hasReachedCurrentNode(agent: AgentEntry): boolean {
    const node = agent.route[agent.currentNodeIndex];
    const dx = agent.vehicle.position.x - node.position.x;
    const dz = agent.vehicle.position.z - node.position.z;

    return dx * dx + dz * dz <= agent.nodeReachedDistance * agent.nodeReachedDistance;
  }

  #snapToCurrentNode(agent: AgentEntry) {
    const node = agent.route[agent.currentNodeIndex];

    agent.vehicle.position.set(node.position.x, 0, node.position.z);
    agent.vehicle.velocity.set(0, 0, 0);
    agent.enemy.root.position.x = node.position.x;
    agent.enemy.root.position.z = node.position.z;
    this.#syncGround(agent);
  }

  #enterPause(agent: AgentEntry) {
    const node = agent.route[agent.currentNodeIndex];
    const pauseSeconds = node.pauseSeconds ?? 0;

    if (pauseSeconds <= 0) {
      this.#moveToNextNode(agent);
      return;
    }

    agent.waitTimeLeft = pauseSeconds;
    agent.arriveBehavior.active = false;
    this.#playIdle(agent.enemy);
  }

  #moveToNextNode(agent: AgentEntry) {
    agent.waitTimeLeft = 0;
    agent.currentNodeIndex = (agent.currentNodeIndex + 1) % agent.route.length;

    const node = agent.route[agent.currentNodeIndex];
    agent.arriveBehavior.target.set(node.position.x, 0, node.position.z);
    agent.arriveBehavior.active = true;
    this.#playWalk(agent.enemy);
  }

  #syncGround(agent: AgentEntry) {
    const root = agent.enemy.root;
    const ray = new Ray(
      new Vector3(root.position.x, agent.raycastTopY, root.position.z),
      Vector3.Down(),
      agent.raycastLength
    );

    const hit = this.#scene.pickWithRay(ray, (m) => agent.groundSet.has(m as AbstractMesh));

    if (hit?.hit && hit.pickedPoint) {
      root.position.y = hit.pickedPoint.y + agent.enemy.groundOffsetY;
    }
  }

  #playWalk(enemy: Enemy) {
    if (!enemy.playWalk(true)) {
      enemy.playIdle(true);
    }
  }

  #playIdle(enemy: Enemy) {
    if (!enemy.playIdle(true)) {
      enemy.playWalk(true);
    }
  }

  #normalizeNodeIndex(index: number, routeLength: number): number {
    return ((index % routeLength) + routeLength) % routeLength;
  }
}

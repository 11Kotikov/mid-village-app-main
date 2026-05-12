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
  player?: Enemy;
  respawnPosition?: Vector3;
  respawnDelaySeconds?: number;

  startNodeIndex?: number;
  speed?: number;
  chaseSpeed?: number;
  maxForce?: number;
  arriveDeceleration?: number;
  nodeReachedDistance?: number;
  aggroRange?: number;
  loseRange?: number;
  attackRange?: number;
  attackDamage?: number;
  attackCooldown?: number;
  separationRadius?: number;
  separationWeight?: number;
  raycastTopY?: number;
  raycastLength?: number;
  yawOffset?: number;
};

type AgentMode = "patrol" | "chase" | "return";

type AgentEntry = {
  enemy: Enemy;
  vehicle: YUKA.Vehicle;
  arriveBehavior: YUKA.ArriveBehavior;
  groundSet: Set<AbstractMesh>;
  route: PatrolRouteNode[];
  player: Enemy | null;
  mode: AgentMode;
  spawnPosition: Vector3;
  respawnNodeIndex: number;
  respawnDelaySeconds: number;
  respawnTimeLeft: number | null;
  currentNodeIndex: number;
  waitTimeLeft: number;
  patrolSpeed: number;
  chaseSpeed: number;
  nodeReachedDistance: number;
  aggroRange: number;
  loseRange: number;
  attackRange: number;
  attackDamage: number;
  attackCooldown: number;
  attackCooldownLeft: number;
  raycastTopY: number;
  raycastLength: number;
  yawOffset: number;
};

export class YukaWorld {
  #scene: Scene;
  #manager: YUKA.EntityManager;
  #agents: AgentEntry[];

  static readonly DEFAULT_RESPAWN_DELAY_SECONDS = 180;

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
    const patrolSpeed = opts.speed ?? 1.2;

    vehicle.position.set(enemy.root.position.x, 0, enemy.root.position.z);
    vehicle.maxSpeed = patrolSpeed;
    vehicle.maxForce = opts.maxForce ?? 10;
    vehicle.updateOrientation = false;

    const arriveBehavior = new YUKA.ArriveBehavior(
      new YUKA.Vector3(startNode.position.x, 0, startNode.position.z),
      opts.arriveDeceleration ?? 2,
      0
    );

    vehicle.steering.add(arriveBehavior);

    const separationRadius = opts.separationRadius ?? 2.5;
    if (separationRadius > 0) {
      const separationBehavior = new YUKA.SeparationBehavior();
      separationBehavior.weight = opts.separationWeight ?? 0.7;

      vehicle.updateNeighborhood = true;
      vehicle.neighborhoodRadius = separationRadius;
      vehicle.steering.add(separationBehavior);
    }

    this.#manager.add(vehicle);

    const agent: AgentEntry = {
      enemy,
      vehicle,
      arriveBehavior,
      groundSet: new Set(opts.groundMeshes),
      route,
      player: opts.player ?? null,
      mode: "patrol",
      // Точка возрождения врага. По умолчанию это место, где враг был создан.
      // Чтобы изменить точку respawn для конкретного врага, передай respawnPosition
      // в ai.addPatrolEnemy(...) из GameScene.ts.
      spawnPosition: opts.respawnPosition?.clone() ?? enemy.root.position.clone(),
      respawnNodeIndex: startNodeIndex,
      respawnDelaySeconds: opts.respawnDelaySeconds ?? YukaWorld.DEFAULT_RESPAWN_DELAY_SECONDS,
      respawnTimeLeft: null,
      currentNodeIndex: startNodeIndex,
      waitTimeLeft: 0,
      patrolSpeed,
      chaseSpeed: opts.chaseSpeed ?? Math.max(patrolSpeed * 1.55, patrolSpeed + 0.8),
      nodeReachedDistance: opts.nodeReachedDistance ?? 0.45,
      aggroRange: opts.aggroRange ?? 12,
      loseRange: opts.loseRange ?? 18,
      attackRange: opts.attackRange ?? enemy.stats.attackRange,
      attackDamage: opts.attackDamage ?? enemy.stats.attackDamage,
      attackCooldown: opts.attackCooldown ?? 1.25,
      attackCooldownLeft: 0,
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

    for (const a of this.#agents) {
      this.#updateIntent(a, dt);
    }

    this.#manager.update(dt);

    for (const a of this.#agents) {
      if (a.enemy.isDead) {
        a.vehicle.velocity.set(0, 0, 0);
        continue;
      }

      const root = a.enemy.root;

      root.position.x = a.vehicle.position.x;
      root.position.z = a.vehicle.position.z;
      this.#syncGround(a);

      if (a.mode === "patrol") {
        if (a.waitTimeLeft > 0) {
          a.waitTimeLeft = Math.max(0, a.waitTimeLeft - dt);

          if (a.waitTimeLeft === 0) {
            this.#moveToNextNode(a);
          }
        } else if (this.#hasReachedCurrentNode(a)) {
          this.#snapToCurrentNode(a);
          this.#enterPause(a);
        }
      } else if (a.mode === "return" && this.#hasReachedPosition(a, a.spawnPosition, 0.65)) {
        a.vehicle.position.set(a.spawnPosition.x, 0, a.spawnPosition.z);
        a.vehicle.velocity.set(0, 0, 0);
        a.arriveBehavior.active = false;
        root.position.x = a.spawnPosition.x;
        root.position.z = a.spawnPosition.z;
        this.#syncGround(a);
        this.#playIdle(a.enemy);
      }

      const vx = a.vehicle.velocity.x;
      const vz = a.vehicle.velocity.z;
      const speedSq = vx * vx + vz * vz;

      if (speedSq > 0.0001) {
        root.rotationQuaternion = null;
        root.rotation.y = Math.atan2(vx, vz) + a.yawOffset;
      }

      a.enemy.update(dt);
    }
  }

  dispose() {
    this.#agents = [];
    this.#manager = new YUKA.EntityManager();
  }

  #hasReachedCurrentNode(agent: AgentEntry): boolean {
    const node = agent.route[agent.currentNodeIndex];

    return this.#hasReachedPosition(agent, node.position, agent.nodeReachedDistance);
  }

  #hasReachedPosition(agent: AgentEntry, position: Vector3, distance: number): boolean {
    const dx = agent.vehicle.position.x - position.x;
    const dz = agent.vehicle.position.z - position.z;

    return dx * dx + dz * dz <= distance * distance;
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
    this.#playIdle(agent.enemy);
  }

  #moveToNextNode(agent: AgentEntry) {
    agent.waitTimeLeft = 0;
    agent.mode = "patrol";
    agent.vehicle.maxSpeed = agent.patrolSpeed;
    agent.currentNodeIndex = (agent.currentNodeIndex + 1) % agent.route.length;

    const node = agent.route[agent.currentNodeIndex];
    agent.arriveBehavior.target.set(node.position.x, 0, node.position.z);
    agent.arriveBehavior.active = true;
    this.#playWalk(agent.enemy);
  }

  #updateIntent(agent: AgentEntry, dt: number) {
    agent.attackCooldownLeft = Math.max(0, agent.attackCooldownLeft - dt);

    if (agent.enemy.isDead) {
      this.#updateRespawn(agent, dt);
      return;
    }

    agent.respawnTimeLeft = null;

    const player = agent.player;
    const playerCanBeChased = player && !player.isDead;

    if (!playerCanBeChased) {
      if (agent.mode === "chase") {
        this.#returnToSpawn(agent);
      }
      return;
    }

    const distanceToPlayer = agent.enemy.distanceTo(player);

    if (agent.mode === "patrol" && distanceToPlayer <= agent.aggroRange) {
      this.#startChase(agent);
    } else if (agent.mode === "chase" && distanceToPlayer > agent.loseRange) {
      this.#returnToSpawn(agent);
    } else if (agent.mode === "return" && distanceToPlayer <= agent.aggroRange * 0.75) {
      this.#startChase(agent);
    }

    if (agent.mode === "chase") {
      agent.arriveBehavior.target.set(player.root.position.x, 0, player.root.position.z);
      agent.arriveBehavior.active = distanceToPlayer > agent.attackRange * 0.82;

      if (distanceToPlayer <= agent.attackRange) {
        agent.vehicle.velocity.set(0, 0, 0);
        this.#faceTarget(agent.enemy, player.root.position, agent.yawOffset);
        this.#tryAttack(agent, player);
      } else {
        this.#playRun(agent.enemy);
      }
    }
  }

  #startChase(agent: AgentEntry) {
    agent.mode = "chase";
    agent.waitTimeLeft = 0;
    agent.vehicle.maxSpeed = agent.chaseSpeed;
    agent.arriveBehavior.active = true;
    this.#playRun(agent.enemy);
  }

  #returnToSpawn(agent: AgentEntry) {
    agent.mode = "return";
    agent.waitTimeLeft = 0;
    agent.vehicle.maxSpeed = agent.patrolSpeed;
    agent.arriveBehavior.target.set(agent.spawnPosition.x, 0, agent.spawnPosition.z);
    agent.arriveBehavior.active = true;
    this.#playWalk(agent.enemy);
  }

  #tryAttack(agent: AgentEntry, player: Enemy) {
    if (agent.attackCooldownLeft > 0) {
      return;
    }

    agent.attackCooldownLeft = agent.attackCooldown;
    agent.enemy.playAttack(false);
    player.takeDamage(agent.attackDamage);
  }

  #updateRespawn(agent: AgentEntry, dt: number) {
    agent.vehicle.velocity.set(0, 0, 0);
    agent.arriveBehavior.active = false;
    agent.waitTimeLeft = 0;

    if (agent.respawnTimeLeft == null) {
      agent.respawnTimeLeft = agent.respawnDelaySeconds;
    }

    agent.respawnTimeLeft = Math.max(0, agent.respawnTimeLeft - dt);

    if (agent.respawnTimeLeft > 0) {
      return;
    }

    this.#respawnAgent(agent);
  }

  #respawnAgent(agent: AgentEntry) {
    agent.respawnTimeLeft = null;
    agent.mode = "patrol";
    agent.currentNodeIndex = agent.respawnNodeIndex;
    agent.waitTimeLeft = 0;
    agent.attackCooldownLeft = 0;
    agent.vehicle.maxSpeed = agent.patrolSpeed;
    agent.vehicle.position.set(agent.spawnPosition.x, 0, agent.spawnPosition.z);
    agent.vehicle.velocity.set(0, 0, 0);
    agent.arriveBehavior.target.set(agent.spawnPosition.x, 0, agent.spawnPosition.z);
    agent.arriveBehavior.active = false;
    agent.enemy.respawn(agent.spawnPosition);
    this.#syncGround(agent);

    if (this.#hasReachedCurrentNode(agent)) {
      this.#enterPause(agent);
      return;
    }

    this.#moveToNextNode(agent);
  }

  #faceTarget(enemy: Enemy, target: Vector3, yawOffset: number) {
    const dx = target.x - enemy.root.position.x;
    const dz = target.z - enemy.root.position.z;

    if (dx * dx + dz * dz <= 0.0001) {
      return;
    }

    enemy.root.rotationQuaternion = null;
    enemy.root.rotation.y = Math.atan2(dx, dz) + yawOffset;
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

  #playRun(enemy: Enemy) {
    if (!enemy.playRun(true) && !enemy.playWalk(true)) {
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

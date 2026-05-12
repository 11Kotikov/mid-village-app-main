import type { Engine } from "@babylonjs/core/Engines/engine";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { PickingInfo } from "@babylonjs/core/Collisions/pickingInfo";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";

import {
  CURRENT_LEVEL_KEY,
  LEVEL_URLS,
  ENEMY_URLS,
  PLAYER_URLS,
  AUDIO_URLS,
  SKYBOX_URLS,
  type LevelKey,
} from "../assets/paths";
import { loadGLBAsContainer } from "../assets/loaders";
import { Level } from "../world/Level";
import { Skybox } from "../environment/Skybox";
import {
  ENEMY_PATROL_ROUTE,
  GOBLIN_PATROL_START_NODE_INDICES,
  ORC_PATROL_START_NODE_INDICES,
  getPatrolSpawnPoints,
} from "../world/enemyPatrolRoute";
import { LEVEL_WALKABLE_SUFFIXES } from "../world/levelWalkableConfig";
import {
  LEVEL_PORTALS,
  LEVEL_SETUP,
  type LevelPortalDefinition,
} from "../world/levelPortalConfig";
import { Enemy } from "../entities/Enemy";
import { EnemyPrefab } from "../entities/EnemyPrefab";
import { EnemySpawner } from "../entities/EnemySpawner";
import { YukaWorld } from "../ai/YukaWorld";
import { setupInspectorHotkey } from "../debug/inspectorHotkey";
import { ClickToMovePlayer } from "../player/ClickToMovePlayer";

import { AmbientAudio } from "../audio/AmbientAudio";

import { attachWASDControls } from "./cameraControls";
import { PortalParticleSystem } from "../effects/PortalParticleSystem";

type ActivePortal = {
  definition: LevelPortalDefinition;
  position: Vector3;
  effect: PortalParticleSystem;
};

const PORTAL_COOLDOWN_SECONDS = 1;
const PORTAL_RAYCAST_TOP_Y = 10000;
const PORTAL_RAYCAST_LENGTH = 20000;
const PLAYER_ATTACK_COOLDOWN_SECONDS = 0.55;
const PLAYER_ATTACK_MANA_COST = 4;
const PLAYER_MANA_REGEN_PER_SECOND = 7;
const PLAYER_ATTACK_DAMAGE = 24;
const PLAYER_ATTACK_RANGE = 2.4;

export class GameScene {
  #scene: Scene;
  #canvas: HTMLCanvasElement;
  #spawner: EnemySpawner | null;
  #prefabs: EnemyPrefab[];
  #goblinPrefab: EnemyPrefab | null;
  #orcPrefab: EnemyPrefab | null;
  #playerPrefab: EnemyPrefab | null;
  #level: Level | null;
  #groundMeshes: AbstractMesh[];
  #skybox: Skybox | null = null;
  #ai: YukaWorld | null;
  #player: Enemy | null;
  #playerController: ClickToMovePlayer | null;
  #audio: AmbientAudio | null;
  #disposeInspectorHotkey: (() => void) | null;
  #disposeWASDControls: (() => void) | null;
  #activePortals: ActivePortal[];
  #combatEnemies: Enemy[];
  #lastTarget: Enemy | null;
  #attackCooldown: number;
  #portalCooldown: number;
  #isChangingLevel: boolean;
  #hudRoot: HTMLDivElement | null;
  #healthFill: HTMLDivElement | null;
  #manaFill: HTMLDivElement | null;
  #targetFill: HTMLDivElement | null;
  #hudStatus: HTMLDivElement | null;

  constructor(engine: Engine, canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#scene = new Scene(engine);
    this.#level = null;
    this.#groundMeshes = [];
    this.#spawner = null;
    this.#prefabs = [];
    this.#goblinPrefab = null;
    this.#orcPrefab = null;
    this.#playerPrefab = null;
    this.#ai = null;
    this.#player = null;
    this.#playerController = null;
    this.#audio = null;
    this.#disposeInspectorHotkey = null;
    this.#disposeWASDControls = null;
    this.#activePortals = [];
    this.#combatEnemies = [];
    this.#lastTarget = null;
    this.#attackCooldown = 0;
    this.#portalCooldown = 0;
    this.#isChangingLevel = false;
    this.#hudRoot = null;
    this.#healthFill = null;
    this.#manaFill = null;
    this.#targetFill = null;
    this.#hudStatus = null;

    new HemisphericLight("light", new Vector3(0, 1, 0), this.#scene);

    this.#disposeInspectorHotkey = setupInspectorHotkey(this.#scene);
    this.#createHud();
  }

  get scene(): Scene {
    return this.#scene;
  }

  async init() {
    const camera = this.#createCamera();
    this.#disposeWASDControls = attachWASDControls(camera, this.#scene, 5);

    this.#skybox = new Skybox(this.scene, SKYBOX_URLS.skybox, 1000);

    const goblinContainer = await loadGLBAsContainer(this.#scene, ENEMY_URLS.goblin);
    const orcContainer = await loadGLBAsContainer(this.#scene, ENEMY_URLS.orc);
    const playerContainer = await loadGLBAsContainer(this.#scene, PLAYER_URLS.hoodedAdventurer);

    this.#goblinPrefab = new EnemyPrefab(this.#scene, goblinContainer, "goblin", {
      targetHeight: 1.6,
    });
    this.#orcPrefab = new EnemyPrefab(this.#scene, orcContainer, "orc", {
      targetHeight: 2.2,
    });
    this.#playerPrefab = new EnemyPrefab(this.#scene, playerContainer, "player", {
      targetHeight: 1.85,
    });

    this.#prefabs.push(this.#goblinPrefab, this.#orcPrefab, this.#playerPrefab);

    await this.#loadLevel(CURRENT_LEVEL_KEY);

    const audio = new AmbientAudio();
    this.#audio = audio;
    await audio.init(AUDIO_URLS.ambienceForest);
  }

  #createCamera() {
    const camera = new ArcRotateCamera(
      "camera",
      (2 * Math.PI) / 3,
      Math.PI / 3,
      60,
      new Vector3(10, 0, 10),
      this.#scene
    );
    camera.attachControl(this.#canvas, true);
    camera.wheelPrecision = 50;
    return camera;
  }

  async #loadLevel(levelKey: LevelKey, entryPortalId?: string) {
    this.#disposeActiveLevel();

    const setup = LEVEL_SETUP[levelKey];
    const levelUrl = LEVEL_URLS[levelKey];
    const levelContainer = await loadGLBAsContainer(this.#scene, levelUrl);
    const level = new Level(this.#scene, levelContainer, {
      scale: setup.scale,
      placeOnGround: true,
      logBounds: true,
    });

    this.#level = level;
    this.#groundMeshes = this.#getGroundMeshes(level, levelKey);

    const spawnPosition = this.#getSpawnPosition(levelKey, entryPortalId);
    this.#ensurePlayer(spawnPosition, this.#groundMeshes);
    this.#playerController = this.#createPlayerController(this.#groundMeshes);

    this.#spawnLevelActors(levelKey, this.#groundMeshes);
    this.#createPortals(levelKey, this.#groundMeshes);
    this.#centerCameraOnPlayer();

    console.log(`[level] loaded ${levelKey}`);
  }

  #getGroundMeshes(level: Level, levelKey: LevelKey): AbstractMesh[] {
    const suffixes = LEVEL_WALKABLE_SUFFIXES[levelKey] ?? [];
    const filteredGroundMeshes = level.getPickMeshesBySuffix(suffixes);
    const groundMeshes = filteredGroundMeshes.length > 0 ? filteredGroundMeshes : level.pickMeshes;

    if (suffixes.length > 0 && filteredGroundMeshes.length === 0) {
      console.warn(`[level] walkable meshes not found for ${levelKey}, fallback to all pickMeshes`);
      level.logPickMeshes();
    }

    return groundMeshes;
  }

  #getSpawnPosition(levelKey: LevelKey, entryPortalId?: string): Vector3 {
    if (entryPortalId) {
      const entryPortal = LEVEL_PORTALS[levelKey].find((portal) => portal.id === entryPortalId);

      if (entryPortal) {
        return entryPortal.position.add(entryPortal.arrivalOffset ?? Vector3.Zero());
      }

      console.warn(`[portal] entry portal "${entryPortalId}" not found on ${levelKey}`);
    }

    return LEVEL_SETUP[levelKey].startPosition.clone();
  }

  #ensurePlayer(spawnPosition: Vector3, groundMeshes: AbstractMesh[]) {
    if (!this.#playerPrefab) {
      throw new Error("[player] prefab is not loaded");
    }

    if (!this.#player) {
      this.#player = this.#playerPrefab.spawn(spawnPosition, "player", {
        groundMeshes,
        logSizing: true,
      });
      this.#player.configureStats({
        maxHealth: 120,
        health: 120,
        maxMana: 80,
        mana: 80,
        attackDamage: PLAYER_ATTACK_DAMAGE,
        attackRange: PLAYER_ATTACK_RANGE,
      });
    } else {
      this.#movePlayerTo(spawnPosition, groundMeshes);
    }

    if (
      !this.#player.playOnlyBySuffix("Idle_Neutral", true) &&
      !this.#player.playIdle(true)
    ) {
      this.#player.playWalk(true);
    }
  }

  #movePlayerTo(position: Vector3, groundMeshes: AbstractMesh[]) {
    if (!this.#player) return;

    const root = this.#player.root;
    root.position.copyFrom(position);
    this.#syncPlayerToGround(groundMeshes);
  }

  #syncPlayerToGround(groundMeshes: AbstractMesh[]) {
    if (!this.#player) return;

    const root = this.#player.root;
    const hit = this.#pickGroundAt(root.position, groundMeshes);

    if (hit) {
      root.position.y = hit.y + this.#player.groundOffsetY;
    }
  }

  #createPlayerController(groundMeshes: AbstractMesh[]) {
    if (!this.#player) return null;

    return new ClickToMovePlayer(this.#scene, this.#player, {
      groundMeshes,
      speed: 4.8,
      stopDistance: 0.2,
      clickThresholdPx: 8,
      raycastTopY: 10000,
      raycastLength: 20000,
      yawOffset: 0,
      onClick: (hit) => this.#handlePlayerAttackClick(hit),
    });
  }

  #spawnLevelActors(levelKey: LevelKey, groundMeshes: AbstractMesh[]) {
    if (levelKey !== "Walk_in_the_Woods") {
      return;
    }

    if (!this.#goblinPrefab || !this.#orcPrefab) {
      return;
    }

    const spawner = new EnemySpawner();
    this.#spawner = spawner;

    const goblins = spawner.spawnMany(
      this.#goblinPrefab,
      getPatrolSpawnPoints(GOBLIN_PATROL_START_NODE_INDICES),
      "goblin",
      { groundMeshes }
    );

    const orcs = spawner.spawnMany(
      this.#orcPrefab,
      getPatrolSpawnPoints(ORC_PATROL_START_NODE_INDICES),
      "orc",
      { groundMeshes }
    );

    const ai = new YukaWorld(this.#scene);
    this.#ai = ai;

    for (const goblin of goblins) {
      goblin.configureStats({
        maxHealth: 42,
        health: 42,
        maxMana: 10,
        mana: 10,
        attackDamage: 8,
        attackRange: 1.8,
      });
    }

    for (const orc of orcs) {
      orc.configureStats({
        maxHealth: 72,
        health: 72,
        maxMana: 15,
        mana: 15,
        attackDamage: 15,
        attackRange: 2.1,
      });
    }

    this.#combatEnemies.push(...goblins, ...orcs);

    for (const [index, g] of goblins.entries()) {
      ai.addPatrolEnemy(g, {
        groundMeshes,
        route: ENEMY_PATROL_ROUTE,
        player: this.#player ?? undefined,
        startNodeIndex: GOBLIN_PATROL_START_NODE_INDICES[index],
        speed: 1.4,
        chaseSpeed: 3.2,
        maxForce: 12,
        arriveDeceleration: 2,
        nodeReachedDistance: 0.5,
        aggroRange: 13,
        loseRange: 20,
        attackRange: g.stats.attackRange,
        attackDamage: g.stats.attackDamage,
        attackCooldown: 1.1,
        separationRadius: 2.4,
        separationWeight: 0.7,
        raycastTopY: 10000,
        raycastLength: 20000,
        yawOffset: 0,
      });
    }

    for (const [index, o] of orcs.entries()) {
      ai.addPatrolEnemy(o, {
        groundMeshes,
        route: ENEMY_PATROL_ROUTE,
        player: this.#player ?? undefined,
        startNodeIndex: ORC_PATROL_START_NODE_INDICES[index],
        speed: 1.0,
        chaseSpeed: 2.7,
        maxForce: 12,
        arriveDeceleration: 2.5,
        nodeReachedDistance: 0.55,
        aggroRange: 15,
        loseRange: 23,
        attackRange: o.stats.attackRange,
        attackDamage: o.stats.attackDamage,
        attackCooldown: 1.45,
        separationRadius: 2.8,
        separationWeight: 0.85,
        raycastTopY: 10000,
        raycastLength: 20000,
        yawOffset: 0,
      });
    }
  }

  #createPortals(levelKey: LevelKey, groundMeshes: AbstractMesh[]) {
    for (const definition of LEVEL_PORTALS[levelKey]) {
      const groundPosition = this.#getGroundedPosition(definition.position, groundMeshes);
      const visualCenter = groundPosition.add(new Vector3(0, definition.visualHeight ?? 3, 0));
      const effect = new PortalParticleSystem(this.scene, {
        center: visualCenter,
        orbitRadius: 2,
        angularSpeed: 2,
        emitRate: 1000,
        maxLifeTime: 8,
        minSize: 0.05,
        maxSize: 0.1,
        useRectEmitter: true,
        rectWidth: 4,
        rectHeight: 3,
      });

      this.#activePortals.push({
        definition,
        position: groundPosition,
        effect,
      });
    }
  }

  #getGroundedPosition(position: Vector3, groundMeshes: AbstractMesh[]): Vector3 {
    const grounded = position.clone();
    const hit = this.#pickGroundAt(position, groundMeshes);

    if (hit) {
      grounded.y = hit.y;
    }

    return grounded;
  }

  #pickGroundAt(position: Vector3, groundMeshes: AbstractMesh[]): Vector3 | null {
    const groundSet = new Set(groundMeshes);
    const ray = new Ray(
      new Vector3(position.x, PORTAL_RAYCAST_TOP_Y, position.z),
      Vector3.Down(),
      PORTAL_RAYCAST_LENGTH
    );
    const hit = this.#scene.pickWithRay(ray, (mesh) => groundSet.has(mesh as AbstractMesh));

    return hit?.hit && hit.pickedPoint ? hit.pickedPoint.clone() : null;
  }

  #centerCameraOnPlayer() {
    if (!this.#player || !(this.#scene.activeCamera instanceof ArcRotateCamera)) {
      return;
    }

    this.#scene.activeCamera.target.copyFrom(this.#player.root.position);
  }

  update(dt: number) {
    for (const portal of this.#activePortals) {
      portal.effect.update(dt);
    }

    this.#updateCombat(dt);

    if (this.#isChangingLevel) {
      return;
    }

    this.#portalCooldown = Math.max(0, this.#portalCooldown - dt);
    if (!this.#player?.isDead) {
      this.#playerController?.update(dt);
    }
    this.#ai?.update(dt);
    this.#spawner?.update(dt);
    this.#checkPortalTransitions();
  }

  #updateCombat(dt: number) {
    this.#attackCooldown = Math.max(0, this.#attackCooldown - dt);

    if (this.#player && !this.#player.isDead) {
      this.#player.restoreMana(PLAYER_MANA_REGEN_PER_SECOND * dt);
      this.#player.update(dt);
    }

    if (this.#lastTarget?.isDead) {
      this.#lastTarget = null;
    }

    this.#updateHud();
  }

  #handlePlayerAttackClick(hit: PickingInfo | null): boolean {
    if (!this.#player || this.#player.isDead) {
      return false;
    }

    const clickedEnemy = this.#getEnemyFromPickedMesh(hit?.pickedMesh ?? null);
    const target = clickedEnemy ?? this.#findNearestEnemyInRange();

    if (!target || target.isDead) {
      return false;
    }

    this.#lastTarget = target;
    return this.#tryPlayerAttack(target);
  }

  #getEnemyFromPickedMesh(mesh: AbstractMesh | null): Enemy | null {
    const combatant = mesh?.metadata?.combatant;

    if (!(combatant instanceof Enemy) || combatant === this.#player || combatant.isDead) {
      return null;
    }

    return this.#combatEnemies.includes(combatant) ? combatant : null;
  }

  #findNearestEnemyInRange(): Enemy | null {
    if (!this.#player) {
      return null;
    }

    let nearest: Enemy | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of this.#combatEnemies) {
      if (enemy.isDead) {
        continue;
      }

      const distance = this.#player.distanceTo(enemy);

      if (distance <= this.#player.stats.attackRange && distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  #tryPlayerAttack(target: Enemy): boolean {
    if (!this.#player || target.isDead || this.#attackCooldown > 0) {
      return true;
    }

    const distance = this.#player.distanceTo(target);

    if (distance > this.#player.stats.attackRange) {
      this.#hudStatusText("Too far");
      return true;
    }

    if (!this.#player.spendMana(PLAYER_ATTACK_MANA_COST)) {
      this.#hudStatusText("No mana");
      return true;
    }

    this.#attackCooldown = PLAYER_ATTACK_COOLDOWN_SECONDS;
    this.#faceTarget(this.#player, target.root.position);
    this.#player.playAttack(false);
    target.takeDamage(this.#player.stats.attackDamage);
    this.#hudStatusText(target.isDead ? "Enemy defeated" : `Hit ${this.#player.stats.attackDamage}`);
    this.#updateHud();
    return true;
  }

  #faceTarget(actor: Enemy, target: Vector3) {
    const dx = target.x - actor.root.position.x;
    const dz = target.z - actor.root.position.z;

    if (dx * dx + dz * dz <= 0.0001) {
      return;
    }

    actor.root.rotationQuaternion = null;
    actor.root.rotation.y = Math.atan2(dx, dz);
  }

  #checkPortalTransitions() {
    if (!this.#player || this.#portalCooldown > 0) {
      return;
    }

    const playerPosition = this.#player.root.position;

    for (const portal of this.#activePortals) {
      const radius = portal.definition.radius ?? 2.4;
      const dx = playerPosition.x - portal.position.x;
      const dz = playerPosition.z - portal.position.z;

      if (dx * dx + dz * dz <= radius * radius) {
        void this.#changeLevel(portal.definition);
        return;
      }
    }
  }

  async #changeLevel(portal: LevelPortalDefinition) {
    if (this.#isChangingLevel) {
      return;
    }

    this.#isChangingLevel = true;

    try {
      await this.#loadLevel(portal.targetLevel, portal.targetPortalId);
      this.#portalCooldown = PORTAL_COOLDOWN_SECONDS;
    } finally {
      this.#isChangingLevel = false;
    }
  }

  #disposeActiveLevel() {
    this.#playerController?.dispose();
    this.#playerController = null;

    this.#ai?.dispose();
    this.#ai = null;

    this.#spawner?.disposeAll();
    this.#spawner = null;

    for (const portal of this.#activePortals) {
      portal.effect.dispose();
    }
    this.#activePortals = [];
    this.#combatEnemies = [];
    this.#lastTarget = null;

    this.#level?.dispose();
    this.#level = null;
    this.#groundMeshes = [];
  }

  dispose() {
    this.#disposeInspectorHotkey?.();
    this.#disposeInspectorHotkey = null;

    this.#disposeWASDControls?.();
    this.#disposeWASDControls = null;

    this.#disposeActiveLevel();

    this.#skybox?.dispose();
    this.#skybox = null;

    this.#audio?.dispose();
    this.#audio = null;

    this.#player?.dispose();
    this.#player = null;

    this.#disposeHud();

    for (const p of this.#prefabs) {
      p.dispose();
    }
    this.#prefabs = [];
    this.#goblinPrefab = null;
    this.#orcPrefab = null;
    this.#playerPrefab = null;

    this.#scene.dispose();
  }

  #createHud() {
    const hudRoot = document.createElement("div");
    hudRoot.className = "game-hud";

    const playerPanel = document.createElement("div");
    playerPanel.className = "hud-panel";

    const playerTitle = document.createElement("div");
    playerTitle.className = "hud-title";
    playerTitle.textContent = "Player";

    const healthBar = this.#createHudBar("Health", "hud-fill-health");
    const manaBar = this.#createHudBar("Mana", "hud-fill-mana");
    this.#healthFill = healthBar.fill;
    this.#manaFill = manaBar.fill;

    playerPanel.append(playerTitle, healthBar.root, manaBar.root);

    const targetPanel = document.createElement("div");
    targetPanel.className = "hud-panel";

    const targetTitle = document.createElement("div");
    targetTitle.className = "hud-title";
    targetTitle.textContent = "Target";

    const targetBar = this.#createHudBar("Health", "hud-fill-target");
    this.#targetFill = targetBar.fill;

    this.#hudStatus = document.createElement("div");
    this.#hudStatus.className = "hud-status";
    this.#hudStatus.textContent = "Click an enemy to attack";

    targetPanel.append(targetTitle, targetBar.root, this.#hudStatus);
    hudRoot.append(playerPanel, targetPanel);
    document.body.append(hudRoot);
    this.#hudRoot = hudRoot;
  }

  #createHudBar(label: string, fillClassName: string) {
    const root = document.createElement("div");
    root.className = "hud-bar";

    const text = document.createElement("span");
    text.textContent = label;

    const track = document.createElement("div");
    track.className = "hud-track";

    const fill = document.createElement("div");
    fill.className = `hud-fill ${fillClassName}`;

    track.append(fill);
    root.append(text, track);

    return { root, fill };
  }

  #updateHud() {
    if (!this.#player || !this.#healthFill || !this.#manaFill || !this.#targetFill) {
      return;
    }

    this.#setFill(this.#healthFill, this.#player.stats.health, this.#player.stats.maxHealth);
    this.#setFill(this.#manaFill, this.#player.stats.mana, this.#player.stats.maxMana);

    if (this.#lastTarget && !this.#lastTarget.isDead) {
      this.#setFill(this.#targetFill, this.#lastTarget.stats.health, this.#lastTarget.stats.maxHealth);
    } else {
      this.#setFill(this.#targetFill, 0, 1);
    }

    if (this.#player.isDead) {
      this.#hudStatusText("You died");
    }
  }

  #setFill(fill: HTMLDivElement, value: number, maxValue: number) {
    const percent = maxValue <= 0 ? 0 : Math.max(0, Math.min(1, value / maxValue));
    fill.style.width = `${percent * 100}%`;
  }

  #hudStatusText(text: string) {
    if (this.#hudStatus) {
      this.#hudStatus.textContent = text;
    }
  }

  #disposeHud() {
    this.#hudRoot?.remove();
    this.#hudRoot = null;
    this.#healthFill = null;
    this.#manaFill = null;
    this.#targetFill = null;
    this.#hudStatus = null;
  }
}

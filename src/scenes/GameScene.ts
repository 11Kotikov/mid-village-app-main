import type { Engine } from "@babylonjs/core/Engines/engine";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { PickingInfo } from "@babylonjs/core/Collisions/pickingInfo";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Ray } from "@babylonjs/core/Culling/ray";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

import {
  CURRENT_LEVEL_KEY,
  LEVEL_URLS,
  ENEMY_URLS,
  PLAYER_URLS,
  NPC_URLS,
  POTION_URLS,
  PROP_URLS,
  AUDIO_URLS,
  PARTICLES_URLS,
  SKYBOX_URLS,
  type LevelKey,
} from "../assets/paths";
import { loadGLBAsContainer } from "../assets/loaders";
import { getHierarchyHeight, getHierarchyMinY } from "../assets/measure";
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

type LoadedSceneObject = {
  container: AssetContainer;
  root: TransformNode;
};

type WitchNpc = LoadedSceneObject & {
  idleAnimation: AnimationGroup | null;
  waveAnimation: AnimationGroup | null;
  waveTimer: number;
};

type PotionPickup = LoadedSceneObject & {
  kind: "health" | "mana";
  radius: number;
  cooldownLeft: number;
};

type FireballProjectile = {
  position: Vector3;
  velocity: Vector3;
  particleSystem: ParticleSystem;
  lifeLeft: number;
};

const PORTAL_COOLDOWN_SECONDS = 1;
const PORTAL_RAYCAST_TOP_Y = 10000;
const PORTAL_RAYCAST_LENGTH = 20000;
const PLAYER_ATTACK_COOLDOWN_SECONDS = 0.55;
const PLAYER_ATTACK_MANA_COST = 4;
const PLAYER_MANA_REGEN_RATIO_PER_SECOND = 0.01 / 60;
const PLAYER_ATTACK_DAMAGE = 24;
const PLAYER_ATTACK_RANGE = 2.4;
const PLAYER_RESPAWN_DELAY_SECONDS = 3.5;
const PLAYER_RESPAWN_HEALTH_RATIO = 0.05;
const PLAYER_RESPAWN_MANA_RATIO = 0.05;
const PLAYER_RESPAWN_LEVEL: LevelKey = "World_Village";
const PLAYER_FIREBALL_MANA_RATIO = 0.05;
const PLAYER_FIREBALL_DAMAGE = 36;
const PLAYER_FIREBALL_SPEED = 18;
const PLAYER_FIREBALL_LIFETIME_SECONDS = 2.2;
const PLAYER_FIREBALL_HIT_RADIUS = 1.25;
const PLAYER_FIREBALL_CAST_COOLDOWN_SECONDS = 0.85;
const PLAYER_FIREBALL_CAST_ANIMATION_SECONDS = 0.75;
const PLAYER_FIREBALL_TARGET_RANGE = 28;
const PLAYER_FIREBALL_SPAWN_HEIGHT = 1.25;
const PLAYER_FIREBALL_SPAWN_FORWARD_OFFSET = 1.1;
const WITCH_WAVE_INTERVAL_SECONDS = 20;
const WITCH_MANA_RESTORE_RADIUS = 1.45;
const WITCH_MANA_RESTORE_COOLDOWN_SECONDS = 2;
const POTION_PICKUP_RADIUS = 0.85;
const POTION_PICKUP_COOLDOWN_SECONDS = 2;

const WORLD_VILLAGE_HUB = {
  witch: new Vector3(-0.8, 0, 1.05),
  healthPotion: new Vector3(-1.35, 0, 0.45),
  manaPotion: new Vector3(-0.25, 0, 0.45),
  cauldron: new Vector3(-0.8, 0, 1.8),
  playerRespawn: new Vector3(-0.8, 0, -0.55),
};

const LEVEL_AMBIENT_AUDIO_URLS: Partial<Record<LevelKey, string>> = {
  Walk_in_the_Woods: AUDIO_URLS.ambienceForest,
  World_Village: AUDIO_URLS.ambienceVillage,
};

type PlayerRespawnOptions = {
  position: Vector3;
  healthRatio: number;
  manaRatio: number;
};

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
  #disposeFireballHotkey: (() => void) | null;
  #activePortals: ActivePortal[];
  #activeSceneObjects: LoadedSceneObject[];
  #witch: WitchNpc | null;
  #potionPickups: PotionPickup[];
  #fireballs: FireballProjectile[];
  #combatEnemies: Enemy[];
  #lastTarget: Enemy | null;
  #attackCooldown: number;
  #fireballCooldown: number;
  #witchManaRestoreCooldown: number;
  #playerCastAnimationTimeLeft: number;
  #playerRespawnTimeLeft: number | null;
  #isRespawningPlayer: boolean;
  #portalCooldown: number;
  #isChangingLevel: boolean;
  #currentLevelKey: LevelKey;
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
    this.#disposeFireballHotkey = null;
    this.#activePortals = [];
    this.#activeSceneObjects = [];
    this.#witch = null;
    this.#potionPickups = [];
    this.#fireballs = [];
    this.#combatEnemies = [];
    this.#lastTarget = null;
    this.#attackCooldown = 0;
    this.#fireballCooldown = 0;
    this.#witchManaRestoreCooldown = 0;
    this.#playerCastAnimationTimeLeft = 0;
    this.#playerRespawnTimeLeft = null;
    this.#isRespawningPlayer = false;
    this.#portalCooldown = 0;
    this.#isChangingLevel = false;
    this.#currentLevelKey = CURRENT_LEVEL_KEY;
    this.#hudRoot = null;
    this.#healthFill = null;
    this.#manaFill = null;
    this.#targetFill = null;
    this.#hudStatus = null;

    new HemisphericLight("light", new Vector3(0, 1, 0), this.#scene);

    this.#disposeInspectorHotkey = setupInspectorHotkey(this.#scene);
    this.#disposeFireballHotkey = this.#attachFireballHotkey();
    this.#createHud();
  }

  get scene(): Scene {
    return this.#scene;
  }

  async init() {
    const camera = this.#createCamera();
    this.#disposeWASDControls = attachWASDControls(camera, this.#scene, 6.5);

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

    const audio = new AmbientAudio();
    this.#audio = audio;

    await this.#loadLevel(CURRENT_LEVEL_KEY);
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

  #attachFireballHotkey() {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.code !== "Digit1") {
        return;
      }

      if (this.#tryCastFireball()) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }

  async #loadLevel(
    levelKey: LevelKey,
    entryPortalId?: string,
    playerRespawn?: PlayerRespawnOptions
  ) {
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

    const spawnPosition = playerRespawn?.position ?? this.#getSpawnPosition(levelKey, entryPortalId);
    this.#ensurePlayer(spawnPosition, this.#groundMeshes, playerRespawn);
    this.#playerController = this.#createPlayerController(this.#groundMeshes);

    this.#spawnLevelActors(levelKey, this.#groundMeshes);
    this.#createPortals(levelKey, this.#groundMeshes);
    await this.#createLevelSceneObjects(levelKey, this.#groundMeshes);
    this.#centerCameraOnPlayer();
    this.#currentLevelKey = levelKey;
    await this.#setAmbientAudio(levelKey);

    console.log(`[level] loaded ${levelKey}`);
  }

  async #setAmbientAudio(levelKey: LevelKey) {
    const ambientUrl = LEVEL_AMBIENT_AUDIO_URLS[levelKey];

    if (!ambientUrl) {
      this.#audio?.dispose();
      return;
    }

    await this.#audio?.init(ambientUrl);
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

  #ensurePlayer(
    spawnPosition: Vector3,
    groundMeshes: AbstractMesh[],
    playerRespawn?: PlayerRespawnOptions
  ) {
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
    } else if (this.#player.isDead && playerRespawn) {
      const health = this.#player.stats.maxHealth * playerRespawn.healthRatio;
      const mana = this.#player.stats.maxMana * playerRespawn.manaRatio;
      this.#player.respawn(spawnPosition, { health, mana });
      this.#syncPlayerToGround(groundMeshes);
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
        // Параметры возрождения можно менять здесь:
        // respawnPosition: new Vector3(x, y, z), // точка respawn для этого врага
        // respawnDelaySeconds: 180,              // задержка respawn в секундах
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
        // Параметры возрождения можно менять здесь:
        // respawnPosition: new Vector3(x, y, z), // точка respawn для этого врага
        // respawnDelaySeconds: 180,              // задержка respawn в секундах
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
      const radius = definition.radius ?? 2.4;
      const visualHeight = definition.visualHeight ?? 3;
      const groundPosition = this.#getGroundedPosition(definition.position, groundMeshes);
      const visualCenter = groundPosition.add(new Vector3(0, visualHeight, 0));
      const effect = new PortalParticleSystem(this.scene, {
        center: visualCenter,
        orbitRadius: radius * 0.8,
        angularSpeed: 2,
        emitRate: 1000,
        maxLifeTime: 8,
        minSize: 0.05,
        maxSize: 0.1,
        useRectEmitter: true,
        rectWidth: radius * 1.6,
        rectHeight: visualHeight,
      });

      this.#activePortals.push({
        definition,
        position: groundPosition,
        effect,
      });
    }
  }

  async #createLevelSceneObjects(levelKey: LevelKey, groundMeshes: AbstractMesh[]) {
    if (levelKey !== "World_Village") {
      return;
    }

    const witchObject = await this.#loadSceneObject(NPC_URLS.witch, {
      name: "witch_npc",
      position: WORLD_VILLAGE_HUB.witch,
      groundMeshes,
      targetHeight: 1.8,
      rotationY: Math.PI,
    });
    const witch: WitchNpc = {
      ...witchObject,
      idleAnimation: this.#findAnimationBySuffix(witchObject.container.animationGroups, [
        "Idle_Neutral",
      ]),
      waveAnimation: this.#findAnimationBySuffix(witchObject.container.animationGroups, ["Wave"]),
      waveTimer: WITCH_WAVE_INTERVAL_SECONDS,
    };
    this.#witch = witch;
    this.#playWitchIdle();

    const healthPotion = await this.#loadSceneObject(POTION_URLS.health, {
      name: "health_potion_pickup",
      position: WORLD_VILLAGE_HUB.healthPotion,
      groundMeshes,
      targetHeight: 0.7,
    });
    const manaPotion = await this.#loadSceneObject(POTION_URLS.mana, {
      name: "mana_potion_pickup",
      position: WORLD_VILLAGE_HUB.manaPotion,
      groundMeshes,
      targetHeight: 0.7,
    });
    await this.#loadSceneObject(PROP_URLS.magicCauldron, {
      name: "magic_cauldron",
      position: WORLD_VILLAGE_HUB.cauldron,
      groundMeshes,
      targetHeight: 1.45,
      rotationY: Math.PI,
    });

    this.#potionPickups.push(
      {
        ...healthPotion,
        kind: "health",
        radius: POTION_PICKUP_RADIUS,
        cooldownLeft: 0,
      },
      {
        ...manaPotion,
        kind: "mana",
        radius: POTION_PICKUP_RADIUS,
        cooldownLeft: 0,
      }
    );
  }

  async #loadSceneObject(
    url: string,
    options: {
      name: string;
      position: Vector3;
      groundMeshes: AbstractMesh[];
      targetHeight?: number;
      scale?: number;
      rotationY?: number;
    }
  ): Promise<LoadedSceneObject> {
    const container = await loadGLBAsContainer(this.#scene, url);
    container.addAllToScene();

    const root = new TransformNode(options.name, this.#scene);
    for (const node of container.rootNodes) {
      node.parent = root;
    }

    root.position.copyFrom(this.#getGroundedPosition(options.position, options.groundMeshes));
    root.rotation.y = options.rotationY ?? 0;

    if (options.targetHeight != null) {
      const rawHeight = getHierarchyHeight(root);
      if (rawHeight > 0) {
        root.scaling.setAll(options.targetHeight / rawHeight);
      }
    } else if (options.scale != null) {
      root.scaling.setAll(options.scale);
    }

    const minY = getHierarchyMinY(root);
    root.position.y += root.position.y - minY;

    const object = { container, root };
    this.#activeSceneObjects.push(object);
    return object;
  }

  #findAnimationBySuffix(animationGroups: AnimationGroup[], suffixes: string[]): AnimationGroup | null {
    const normalized = suffixes.map((suffix) => suffix.toLowerCase());

    for (const suffix of normalized) {
      for (const group of animationGroups) {
        const raw = (group.name ?? "").toLowerCase();
        const tail = raw.split("|").pop() ?? raw;

        if (tail === suffix || raw.endsWith(`|${suffix}`) || raw.endsWith(suffix)) {
          return group;
        }
      }
    }

    return null;
  }

  #stopWitchAnimations() {
    for (const group of this.#witch?.container.animationGroups ?? []) {
      group.stop();
      group.reset();
    }
  }

  #playWitchIdle() {
    const witch = this.#witch;
    if (!witch?.idleAnimation) {
      return;
    }

    this.#stopWitchAnimations();
    witch.idleAnimation.start(true);
  }

  #playWitchWave() {
    const witch = this.#witch;
    if (!witch?.waveAnimation) {
      this.#playWitchIdle();
      return;
    }

    this.#stopWitchAnimations();
    witch.waveAnimation.reset();
    witch.waveAnimation.start(false);
    witch.waveAnimation.onAnimationGroupEndObservable.addOnce(() => {
      this.#playWitchIdle();
    });
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

    this.#updateWitch(dt);
    this.#updatePotionPickups(dt);
    this.#updateFireballs(dt);
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

  #updateWitch(dt: number) {
    const witch = this.#witch;
    if (!witch) {
      return;
    }

    this.#updateWitchManaRestore(dt, witch);

    witch.waveTimer = Math.max(0, witch.waveTimer - dt);

    if (witch.waveTimer === 0) {
      witch.waveTimer = WITCH_WAVE_INTERVAL_SECONDS;
      this.#playWitchWave();
    }
  }

  #updateWitchManaRestore(dt: number, witch: WitchNpc) {
    this.#witchManaRestoreCooldown = Math.max(0, this.#witchManaRestoreCooldown - dt);

    if (!this.#player || this.#player.isDead || this.#witchManaRestoreCooldown > 0) {
      return;
    }

    if (this.#player.stats.mana >= this.#player.stats.maxMana) {
      return;
    }

    const playerPosition = this.#player.root.position;
    const witchPosition = witch.root.position;
    const dx = playerPosition.x - witchPosition.x;
    const dz = playerPosition.z - witchPosition.z;

    if (dx * dx + dz * dz > WITCH_MANA_RESTORE_RADIUS * WITCH_MANA_RESTORE_RADIUS) {
      return;
    }

    this.#player.restoreManaToFull();
    this.#witchManaRestoreCooldown = WITCH_MANA_RESTORE_COOLDOWN_SECONDS;
    this.#hudStatusText("Mana restored by Witch");
    this.#updateHud();
  }

  #updatePotionPickups(dt: number) {
    if (!this.#player || this.#player.isDead) {
      return;
    }

    const playerPosition = this.#player.root.position;

    for (const pickup of this.#potionPickups) {
      pickup.cooldownLeft = Math.max(0, pickup.cooldownLeft - dt);

      if (pickup.cooldownLeft > 0) {
        continue;
      }

      const dx = playerPosition.x - pickup.root.position.x;
      const dz = playerPosition.z - pickup.root.position.z;

      if (dx * dx + dz * dz > pickup.radius * pickup.radius) {
        continue;
      }

      if (pickup.kind === "health") {
        this.#player.restoreHealthToFull();
        this.#hudStatusText("Health restored");
      } else {
        this.#player.restoreManaToFull();
        this.#hudStatusText("Mana restored");
      }

      pickup.cooldownLeft = POTION_PICKUP_COOLDOWN_SECONDS;
      this.#updateHud();
    }
  }

  #tryCastFireball(): boolean {
    if (!this.#player || this.#player.isDead || this.#fireballCooldown > 0) {
      return false;
    }

    const manaCost = this.#player.stats.maxMana * PLAYER_FIREBALL_MANA_RATIO;
    if (!this.#player.spendMana(manaCost)) {
      this.#hudStatusText("No mana for fireball");
      this.#updateHud();
      return true;
    }

    const target = this.#findNearestFireballTarget();
    if (target) {
      this.#lastTarget = target;
      this.#faceTarget(this.#player, target.root.position);
    }

    const direction = target
      ? target.root.position
          .subtract(this.#player.root.position)
          .multiplyByFloats(1, 0, 1)
          .normalize()
      : this.#getForwardDirection(this.#player.root.rotation.y);

    if (direction.lengthSquared() <= 0.0001) {
      direction.copyFrom(this.#getForwardDirection(this.#player.root.rotation.y));
    }

    this.#player.playOnlyBySuffix("Idle_Gun_Shoot", false);
    this.#playerCastAnimationTimeLeft = PLAYER_FIREBALL_CAST_ANIMATION_SECONDS;
    this.#fireballCooldown = PLAYER_FIREBALL_CAST_COOLDOWN_SECONDS;

    const spawnPosition = this.#player.root.position
      .add(direction.scale(PLAYER_FIREBALL_SPAWN_FORWARD_OFFSET))
      .add(new Vector3(0, PLAYER_FIREBALL_SPAWN_HEIGHT, 0));

    const projectile: FireballProjectile = {
      position: spawnPosition,
      velocity: direction.scale(PLAYER_FIREBALL_SPEED),
      particleSystem: this.#createFireballParticleSystem(spawnPosition),
      lifeLeft: PLAYER_FIREBALL_LIFETIME_SECONDS,
    };

    this.#fireballs.push(projectile);
    this.#hudStatusText("Fireball");
    this.#updateHud();
    return true;
  }

  #createFireballParticleSystem(position: Vector3): ParticleSystem {
    const particleSystem = new ParticleSystem("player_fireball", 220, this.#scene);
    particleSystem.particleTexture = new Texture(PARTICLES_URLS.fireBall, this.#scene);
    particleSystem.emitter = position;
    particleSystem.minEmitBox.set(-0.08, -0.08, -0.08);
    particleSystem.maxEmitBox.set(0.08, 0.08, 0.08);
    particleSystem.color1 = new Color4(1, 0.45, 0.05, 1);
    particleSystem.color2 = new Color4(1, 0.05, 0.01, 1);
    particleSystem.colorDead = new Color4(0.2, 0.02, 0, 0);
    particleSystem.minSize = 0.35;
    particleSystem.maxSize = 0.8;
    particleSystem.minLifeTime = 0.12;
    particleSystem.maxLifeTime = 0.35;
    particleSystem.emitRate = 380;
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
    particleSystem.gravity = Vector3.Zero();
    particleSystem.direction1 = new Vector3(-0.25, -0.1, -0.25);
    particleSystem.direction2 = new Vector3(0.25, 0.1, 0.25);
    particleSystem.minEmitPower = 0.2;
    particleSystem.maxEmitPower = 1.1;
    particleSystem.updateSpeed = 0.01;
    particleSystem.start();
    return particleSystem;
  }

  #updateFireballs(dt: number) {
    for (let i = this.#fireballs.length - 1; i >= 0; i--) {
      const fireball = this.#fireballs[i];
      fireball.lifeLeft -= dt;
      fireball.position.addInPlace(fireball.velocity.scale(dt));

      const hitEnemy = this.#getFireballHitEnemy(fireball.position);
      if (hitEnemy) {
        hitEnemy.takeDamage(PLAYER_FIREBALL_DAMAGE);
        this.#lastTarget = hitEnemy;
        this.#hudStatusText(hitEnemy.isDead ? "Enemy burned" : `Fireball ${PLAYER_FIREBALL_DAMAGE}`);
        this.#updateHud();
        this.#disposeFireball(i);
        continue;
      }

      if (fireball.lifeLeft <= 0) {
        this.#disposeFireball(i);
      }
    }
  }

  #getFireballHitEnemy(position: Vector3): Enemy | null {
    for (const enemy of this.#combatEnemies) {
      if (enemy.isDead) {
        continue;
      }

      const enemyCenter = enemy.hitbox.position;
      if (Vector3.DistanceSquared(position, enemyCenter) <= PLAYER_FIREBALL_HIT_RADIUS * PLAYER_FIREBALL_HIT_RADIUS) {
        return enemy;
      }
    }

    return null;
  }

  #disposeFireball(index: number) {
    const [fireball] = this.#fireballs.splice(index, 1);
    fireball.particleSystem.stop();
    fireball.particleSystem.dispose();
  }

  #disposeFireballs() {
    for (let i = this.#fireballs.length - 1; i >= 0; i--) {
      this.#disposeFireball(i);
    }
  }

  #findNearestFireballTarget(): Enemy | null {
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
      if (distance <= PLAYER_FIREBALL_TARGET_RANGE && distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  #getForwardDirection(rotationY: number): Vector3 {
    return new Vector3(Math.sin(rotationY), 0, Math.cos(rotationY)).normalize();
  }

  #updateCombat(dt: number) {
    this.#attackCooldown = Math.max(0, this.#attackCooldown - dt);
    this.#fireballCooldown = Math.max(0, this.#fireballCooldown - dt);

    if (this.#player) {
      if (!this.#player.isDead) {
        this.#playerRespawnTimeLeft = null;
        this.#player.restoreMana(this.#player.stats.maxMana * PLAYER_MANA_REGEN_RATIO_PER_SECOND * dt);
      }

      this.#player.update(dt);

      if (this.#player.isDead) {
        this.#updatePlayerRespawn(dt);
      }
    }

    if (this.#lastTarget?.isDead) {
      this.#lastTarget = null;
    }

    if (this.#playerCastAnimationTimeLeft > 0) {
      this.#playerCastAnimationTimeLeft = Math.max(0, this.#playerCastAnimationTimeLeft - dt);

      if (this.#playerCastAnimationTimeLeft === 0 && this.#player && !this.#player.isDead) {
        this.#player.playOnlyBySuffix("Idle_Neutral", true) || this.#player.playIdle(true);
      }
    }

    this.#updateHud();
  }

  #updatePlayerRespawn(dt: number) {
    if (!this.#player || this.#isRespawningPlayer) {
      return;
    }

    if (this.#playerRespawnTimeLeft == null) {
      this.#playerRespawnTimeLeft = PLAYER_RESPAWN_DELAY_SECONDS;
      this.#hudStatusText("You died. Respawning...");
    }

    this.#playerRespawnTimeLeft = Math.max(0, this.#playerRespawnTimeLeft - dt);

    if (this.#playerRespawnTimeLeft > 0) {
      return;
    }

    void this.#respawnPlayerNearWitchPortal();
  }

  async #respawnPlayerNearWitchPortal() {
    if (!this.#player || this.#isRespawningPlayer) {
      return;
    }

    this.#isRespawningPlayer = true;
    const playerRespawn = {
      position: WORLD_VILLAGE_HUB.playerRespawn,
      healthRatio: PLAYER_RESPAWN_HEALTH_RATIO,
      manaRatio: PLAYER_RESPAWN_MANA_RATIO,
    };

    try {
      if (this.#currentLevelKey === PLAYER_RESPAWN_LEVEL) {
        const health = this.#player.stats.maxHealth * playerRespawn.healthRatio;
        const mana = this.#player.stats.maxMana * playerRespawn.manaRatio;
        this.#player.respawn(playerRespawn.position, { health, mana });
        this.#syncPlayerToGround(this.#groundMeshes);
        this.#centerCameraOnPlayer();
      } else {
        await this.#loadLevel(PLAYER_RESPAWN_LEVEL, undefined, playerRespawn);
      }

      this.#portalCooldown = PORTAL_COOLDOWN_SECONDS;
      this.#hudStatusText("Respawned near Witch");
      this.#updateHud();
    } finally {
      this.#playerRespawnTimeLeft = null;
      this.#isRespawningPlayer = false;
    }
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

    this.#disposeFireballs();
    this.#fireballCooldown = 0;
    this.#playerCastAnimationTimeLeft = 0;

    this.#ai?.dispose();
    this.#ai = null;

    this.#spawner?.disposeAll();
    this.#spawner = null;

    for (const portal of this.#activePortals) {
      portal.effect.dispose();
    }
    this.#activePortals = [];

    for (const object of this.#activeSceneObjects) {
      object.container.dispose();
      object.root.dispose();
    }
    this.#activeSceneObjects = [];
    this.#witch = null;
    this.#potionPickups = [];
    this.#witchManaRestoreCooldown = 0;

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

    this.#disposeFireballHotkey?.();
    this.#disposeFireballHotkey = null;

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
    hudRoot.append(playerPanel, targetPanel, this.#createSkillBar());
    document.body.append(hudRoot);
    this.#hudRoot = hudRoot;
  }

  #createSkillBar() {
    const skillBar = document.createElement("div");
    skillBar.className = "skill-bar";

    for (let i = 0; i < 4; i++) {
      const slot = document.createElement("div");
      slot.className = i === 0 ? "skill-slot skill-slot-active" : "skill-slot";

      if (i === 0) {
        const image = document.createElement("img");
        image.className = "skill-icon";
        image.src = PARTICLES_URLS.fireBall;
        image.alt = "Fireball";

        const key = document.createElement("span");
        key.className = "skill-key";
        key.textContent = "1";

        slot.append(image, key);
      }

      skillBar.append(slot);
    }

    return skillBar;
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

    if (this.#player.isDead && this.#playerRespawnTimeLeft == null && !this.#isRespawningPlayer) {
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

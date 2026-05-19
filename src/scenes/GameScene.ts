import type { Engine } from "@babylonjs/core/Engines/engine";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { PickingInfo } from "@babylonjs/core/Collisions/pickingInfo";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import type { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";

import {
  CURRENT_LEVEL_KEY,
  LEVEL_URLS,
  PLAYER_URLS,
  NPC_URLS,
  POTION_URLS,
  PROP_URLS,
  PARTICLES_URLS,
  SKYBOX_URLS,
  type LevelKey,
} from "../assets/paths";
import { GAME_SETTINGS } from "../config/gameSettings";
import { loadGLBAsContainer } from "../assets/loaders";
import { getHierarchyHeight } from "../assets/measure";
import { Level } from "../world/Level";
import { Skybox } from "../environment/Skybox";
import {
  LEVEL_ENEMY_PATROL_CONFIG,
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
import { GameHud } from "../ui/GameHud";

import { AmbientAudio } from "../audio/AmbientAudio";

import { attachWASDControls } from "./cameraControls";
import {
  findAnimationBySuffix,
  loadSceneObject,
  playSceneObjectAnimation,
  type LoadedSceneObject,
} from "./sceneObjects";
import { createFireballParticleSystem } from "../effects/FireballEffect";
import { createPortalLabel } from "../effects/PortalLabel";
import { PortalParticleSystem } from "../effects/PortalParticleSystem";
import { createSnowTerrainSnowfall } from "../effects/Snowfall";

type ActivePortal = {
  definition: LevelPortalDefinition;
  position: Vector3;
  effect: PortalParticleSystem;
  labelRoot: TransformNode | null;
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

type PatrolNpc = LoadedSceneObject & {
  route: Vector3[];
  currentRouteIndex: number;
  speed: number;
  groundOffsetY: number;
  walkAnimation: AnimationGroup | null;
};

type FireballProjectile = {
  position: Vector3;
  velocity: Vector3;
  particleSystem: ParticleSystem;
  lifeLeft: number;
};

type BossProjectile = {
  root: TransformNode;
  animationGroups: AnimationGroup[];
  position: Vector3;
  velocity: Vector3;
  lifeLeft: number;
};

const PORTAL_COOLDOWN_SECONDS = 1;
const PORTAL_RAYCAST_TOP_Y = 10000;
const PORTAL_RAYCAST_LENGTH = 20000;
const PLAYER_ATTACK_COOLDOWN_SECONDS = GAME_SETTINGS.player.swordAttack.cooldownSeconds;
const PLAYER_ATTACK_MANA_COST = GAME_SETTINGS.player.swordAttack.manaCost;
const PLAYER_MANA_REGEN_RATIO_PER_SECOND = GAME_SETTINGS.player.manaRegenRatioPerSecond;
const PLAYER_RESPAWN_DELAY_SECONDS = GAME_SETTINGS.player.respawn.delaySeconds;
const PLAYER_RESPAWN_HEALTH_RATIO = GAME_SETTINGS.player.respawn.healthRatio;
const PLAYER_RESPAWN_MANA_RATIO = GAME_SETTINGS.player.respawn.manaRatio;
const PLAYER_RESPAWN_LEVEL: LevelKey = GAME_SETTINGS.player.respawn.level;
const PLAYER_FIREBALL_MANA_RATIO = GAME_SETTINGS.player.fireball.manaRatioCost;
const PLAYER_FIREBALL_DAMAGE = GAME_SETTINGS.player.fireball.damage;
const PLAYER_FIREBALL_SPEED = GAME_SETTINGS.player.fireball.speed;
const PLAYER_FIREBALL_LIFETIME_SECONDS = GAME_SETTINGS.player.fireball.lifetimeSeconds;
const PLAYER_FIREBALL_HIT_RADIUS = GAME_SETTINGS.player.fireball.hitRadius;
const PLAYER_FIREBALL_CAST_COOLDOWN_SECONDS = GAME_SETTINGS.player.fireball.castCooldownSeconds;
const PLAYER_FIREBALL_CAST_ANIMATION_SECONDS = GAME_SETTINGS.player.fireball.castAnimationSeconds;
const PLAYER_FIREBALL_TARGET_RANGE = GAME_SETTINGS.player.fireball.targetRange;
const PLAYER_FIREBALL_SPAWN_HEIGHT = GAME_SETTINGS.player.fireball.spawnHeight;
const PLAYER_FIREBALL_SPAWN_FORWARD_OFFSET = GAME_SETTINGS.player.fireball.spawnForwardOffset;
const WITCH_WAVE_INTERVAL_SECONDS = GAME_SETTINGS.witch.waveIntervalSeconds;
const WITCH_MANA_RESTORE_RADIUS = GAME_SETTINGS.witch.manaRestoreRadius;
const WITCH_MANA_RESTORE_COOLDOWN_SECONDS = GAME_SETTINGS.witch.manaRestoreCooldownSeconds;
const POTION_PICKUP_RADIUS = GAME_SETTINGS.pickups.potionRadius;
const POTION_PICKUP_COOLDOWN_SECONDS = GAME_SETTINGS.pickups.potionCooldownSeconds;
const WORLD_VILLAGE_HUB = GAME_SETTINGS.worldVillageHub;

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
  #enemyPrefabs: Map<string, EnemyPrefab>;
  #playerPrefab: EnemyPrefab | null;
  #bossProjectileContainer: AssetContainer | null;
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
  #patrolNpcs: PatrolNpc[];
  #witch: WitchNpc | null;
  #potionPickups: PotionPickup[];
  #fireballs: FireballProjectile[];
  #bossProjectiles: BossProjectile[];
  #snowfall: ParticleSystem | null;
  #snowBoss: Enemy | null;
  #snowBossShootCooldown: number;
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
  #hud: GameHud | null;

  constructor(engine: Engine, canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#scene = new Scene(engine);
    this.#level = null;
    this.#groundMeshes = [];
    this.#spawner = null;
    this.#prefabs = [];
    this.#enemyPrefabs = new Map();
    this.#playerPrefab = null;
    this.#bossProjectileContainer = null;
    this.#ai = null;
    this.#player = null;
    this.#playerController = null;
    this.#audio = null;
    this.#disposeInspectorHotkey = null;
    this.#disposeWASDControls = null;
    this.#disposeFireballHotkey = null;
    this.#activePortals = [];
    this.#activeSceneObjects = [];
    this.#patrolNpcs = [];
    this.#witch = null;
    this.#potionPickups = [];
    this.#fireballs = [];
    this.#bossProjectiles = [];
    this.#snowfall = null;
    this.#snowBoss = null;
    this.#snowBossShootCooldown = GAME_SETTINGS.snowBoss.shootIntervalSeconds;
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
    this.#hud = null;

    new HemisphericLight("light", new Vector3(0, 1, 0), this.#scene);

    this.#disposeInspectorHotkey = setupInspectorHotkey(this.#scene);
    this.#disposeFireballHotkey = this.#attachFireballHotkey();
    this.#hud = new GameHud(PARTICLES_URLS.fireBall);
  }

  get scene(): Scene {
    return this.#scene;
  }

  async init() {
    const camera = this.#createCamera();
    this.#disposeWASDControls = attachWASDControls(camera, this.#scene, GAME_SETTINGS.camera);

    this.#skybox = new Skybox(this.scene, SKYBOX_URLS.skybox, 1000);

    for (const [modelKey, modelConfig] of Object.entries(GAME_SETTINGS.enemyModels)) {
      const enemyContainer = await loadGLBAsContainer(this.#scene, modelConfig.url);
      const enemyPrefab = new EnemyPrefab(
        this.#scene,
        enemyContainer,
        modelKey,
        { targetHeight: modelConfig.targetHeight },
        modelConfig.animations
      );

      this.#enemyPrefabs.set(modelKey, enemyPrefab);
      this.#prefabs.push(enemyPrefab);
    }

    this.#bossProjectileContainer = await loadGLBAsContainer(
      this.#scene,
      GAME_SETTINGS.snowBoss.projectileUrl
    );

    const playerContainer = await loadGLBAsContainer(this.#scene, PLAYER_URLS.hoodedAdventurer);

    this.#playerPrefab = new EnemyPrefab(this.#scene, playerContainer, "player", {
      targetHeight: GAME_SETTINGS.player.targetHeight,
    });

    this.#prefabs.push(this.#playerPrefab);

    const audio = new AmbientAudio();
    this.#audio = audio;

    await this.#loadLevel(CURRENT_LEVEL_KEY);
  }

  #createCamera() {
    const cameraSettings = GAME_SETTINGS.camera;
    const camera = new ArcRotateCamera(
      "camera",
      cameraSettings.alpha,
      cameraSettings.beta,
      cameraSettings.radius,
      cameraSettings.target.clone(),
      this.#scene
    );
    camera.attachControl(this.#canvas, true);
    camera.wheelPrecision = cameraSettings.wheelPrecision;
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
    this.#createLevelWeather(levelKey);
    this.#centerCameraOnPlayer();
    this.#currentLevelKey = levelKey;
    await this.#setAmbientAudio(levelKey);

    console.log(`[level] loaded ${levelKey}`);
  }

  async #setAmbientAudio(levelKey: LevelKey) {
    const levelSettings = GAME_SETTINGS.levels[levelKey];
    const ambientUrl = "ambientAudioUrl" in levelSettings ? levelSettings.ambientAudioUrl : undefined;

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
      this.#player.configureStats(GAME_SETTINGS.player.stats);
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
    if (this.#enemyPrefabs.size === 0) {
      return;
    }

    const enemyConfig = LEVEL_ENEMY_PATROL_CONFIG[levelKey];
    const spawner = new EnemySpawner();
    this.#spawner = spawner;
    const ai = new YukaWorld(this.#scene);
    this.#ai = ai;

    for (const group of enemyConfig.groups) {
      const modelKey = group.model as keyof typeof GAME_SETTINGS.enemyModels;
      const modelSettings = GAME_SETTINGS.enemyModels[modelKey];
      const prefab = this.#enemyPrefabs.get(group.model);

      if (!modelSettings || !prefab) {
        console.warn(`[enemy] model "${group.model}" is not configured or loaded`);
        continue;
      }

      const enemies = spawner.spawnMany(
        prefab,
        getPatrolSpawnPoints(enemyConfig.route, group.startNodeIndices),
        group.baseName ?? group.model,
        { groundMeshes }
      );

      this.#combatEnemies.push(...enemies);

      for (const [index, enemy] of enemies.entries()) {
        const startNodeIndex = group.startNodeIndices[index] ?? 0;

        enemy.configureStats(modelSettings.stats);

        if (group.boss) {
          this.#snowBoss = enemy;
          this.#snowBossShootCooldown = GAME_SETTINGS.snowBoss.shootIntervalSeconds;
          this.#lastTarget = enemy;
        }

        ai.addPatrolEnemy(enemy, {
          ...modelSettings.ai,
          groundMeshes,
          route: enemyConfig.route,
          player: this.#player ?? undefined,
          startNodeIndex,
          attackRange: enemy.stats.attackRange,
          attackDamage: enemy.stats.attackDamage,
          // Параметры возрождения можно менять в src/config/gameSettings.ts:
          // startNodeIndices задает точку spawn/respawn на маршруте для группы врагов.
          // Для индивидуального respawn можно добавить respawnPosition/respawnDelaySeconds здесь.
          raycastTopY: 10000,
          raycastLength: 20000,
        });
      }
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
        labelRoot: createPortalLabel(this.#scene, definition, visualCenter, visualHeight),
      });
    }
  }

  async #createLevelSceneObjects(levelKey: LevelKey, groundMeshes: AbstractMesh[]) {
    if (levelKey === "Blocks_Trailer_Map") {
      const cathedral = GAME_SETTINGS.blocksTrailerProps.cathedral;
      await this.#loadSceneObject(PROP_URLS.cathedral, {
        name: "blocks_trailer_cathedral",
        position: cathedral.position,
        groundMeshes,
        targetHeight: cathedral.targetHeight,
        rotationY: cathedral.rotationY,
      });
      await this.#createBlocksTrailerCastleNpcs(groundMeshes);
      return;
    }

    if (levelKey === "Cave_Scene_Draft") {
      const stable = GAME_SETTINGS.caveSceneDraftProps.fantasyStable;
      await this.#loadSceneObject(PROP_URLS.fantasyStable, {
        name: "cave_fantasy_stable",
        position: stable.position,
        groundMeshes,
        targetHeight: stable.targetHeight,
        rotationY: stable.rotationY,
      });
      return;
    }

    if (levelKey !== "World_Village") {
      return;
    }

    const witchObject = await this.#loadSceneObject(NPC_URLS.witch, {
      name: "witch_npc",
      position: WORLD_VILLAGE_HUB.witch,
      groundMeshes,
      targetHeight: GAME_SETTINGS.witch.targetHeight,
      rotationY: Math.PI,
    });
    const witch: WitchNpc = {
      ...witchObject,
      idleAnimation: findAnimationBySuffix(witchObject.container.animationGroups, [
        "Idle_Neutral",
      ]),
      waveAnimation: findAnimationBySuffix(witchObject.container.animationGroups, ["Wave"]),
      waveTimer: WITCH_WAVE_INTERVAL_SECONDS,
    };
    this.#witch = witch;
    this.#playWitchIdle();

    const healthPotion = await this.#loadSceneObject(POTION_URLS.health, {
      name: "health_potion_pickup",
      position: WORLD_VILLAGE_HUB.healthPotion,
      groundMeshes,
      targetHeight: GAME_SETTINGS.pickups.potionTargetHeight,
    });
    const manaPotion = await this.#loadSceneObject(POTION_URLS.mana, {
      name: "mana_potion_pickup",
      position: WORLD_VILLAGE_HUB.manaPotion,
      groundMeshes,
      targetHeight: GAME_SETTINGS.pickups.potionTargetHeight,
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

  async #createBlocksTrailerCastleNpcs(groundMeshes: AbstractMesh[]) {
    const npcs = GAME_SETTINGS.blocksTrailerProps.castleNpcs;

    const king = await this.#loadSceneObject(NPC_URLS.king, {
      name: "blocks_trailer_king",
      position: npcs.king.position,
      groundMeshes,
      targetHeight: npcs.king.targetHeight,
      rotationY: npcs.king.rotationY,
    });
    playSceneObjectAnimation(
      king,
      findAnimationBySuffix(king.container.animationGroups, ["Idle_Neutral", "Idle"]),
      true
    );

    const knight = await this.#loadSceneObject(NPC_URLS.knight, {
      name: "blocks_trailer_knight",
      position: npcs.knight.position,
      groundMeshes,
      targetHeight: npcs.knight.targetHeight,
      rotationY: npcs.knight.rotationY,
    });
    playSceneObjectAnimation(
      knight,
      findAnimationBySuffix(knight.container.animationGroups, ["Idle", "ArmatureAction"]),
      true
    );

    for (const [index, patrol] of npcs.knight2Patrols.entries()) {
      const knight2 = await this.#loadSceneObject(NPC_URLS.knight2, {
        name: `blocks_trailer_knight2_patrol_${index + 1}`,
        position: patrol.startPosition,
        groundMeshes,
        targetHeight: npcs.knight2TargetHeight,
      });
      const walkAnimation = findAnimationBySuffix(knight2.container.animationGroups, [
        "Walk_Formal_Loop",
        "Walk",
        "Run",
      ]);
      playSceneObjectAnimation(knight2, walkAnimation, true);

      const grounded = this.#getGroundedPosition(knight2.root.position, groundMeshes);
      this.#patrolNpcs.push({
        ...knight2,
        route: patrol.route.map((point) => this.#getGroundedPosition(point, groundMeshes)),
        currentRouteIndex: 0,
        speed: npcs.knight2Speed,
        groundOffsetY: knight2.root.position.y - grounded.y,
        walkAnimation,
      });
    }
  }

  #createLevelWeather(levelKey: LevelKey) {
    if (levelKey !== "Snow_Terrain") {
      return;
    }

    this.#snowfall = createSnowTerrainSnowfall(this.#scene);
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
    const object = await loadSceneObject(this.#scene, url, {
      ...options,
      getGroundedPosition: (position, groundMeshes) =>
        this.#getGroundedPosition(position, groundMeshes),
    });
    this.#activeSceneObjects.push(object);
    return object;
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
    this.#updatePatrolNpcs(dt);
    this.#updatePotionPickups(dt);
    this.#updateFireballs(dt);
    this.#updateBossProjectiles(dt);
    this.#updateSnowBoss(dt);
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

  #updatePatrolNpcs(dt: number) {
    if (dt <= 0) {
      return;
    }

    for (const npc of this.#patrolNpcs) {
      if (npc.route.length === 0) {
        continue;
      }

      const target = npc.route[npc.currentRouteIndex];
      const toTarget = target.subtract(npc.root.position);
      toTarget.y = 0;

      const distance = toTarget.length();
      if (distance <= Math.max(0.05, npc.speed * dt)) {
        npc.root.position.x = target.x;
        npc.root.position.z = target.z;
        npc.currentRouteIndex = (npc.currentRouteIndex + 1) % npc.route.length;
        continue;
      }

      const direction = toTarget.normalize();
      npc.root.position.addInPlace(direction.scale(npc.speed * dt));
      npc.root.rotation.y = Math.atan2(direction.x, direction.z);

      const ground = this.#pickGroundAt(npc.root.position, this.#groundMeshes);
      if (ground) {
        npc.root.position.y = ground.y + npc.groundOffsetY;
      }

      if (npc.walkAnimation && !npc.walkAnimation.isPlaying) {
        playSceneObjectAnimation(npc, npc.walkAnimation, true);
      }
    }
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
      particleSystem: createFireballParticleSystem(this.#scene, spawnPosition),
      lifeLeft: PLAYER_FIREBALL_LIFETIME_SECONDS,
    };

    this.#fireballs.push(projectile);
    this.#hudStatusText("Fireball");
    this.#updateHud();
    return true;
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

  #updateSnowBoss(dt: number) {
    const boss = this.#snowBoss;

    if (!boss || boss.isDead || !this.#player || this.#player.isDead) {
      this.#snowBossShootCooldown = GAME_SETTINGS.snowBoss.shootIntervalSeconds;
      return;
    }

    const distanceToPlayer = boss.distanceTo(this.#player);
    if (distanceToPlayer > GAME_SETTINGS.snowBoss.targetRange) {
      this.#snowBossShootCooldown = Math.min(
        this.#snowBossShootCooldown,
        GAME_SETTINGS.snowBoss.shootIntervalSeconds
      );
      return;
    }

    this.#snowBossShootCooldown = Math.max(0, this.#snowBossShootCooldown - dt);

    if (this.#snowBossShootCooldown > 0) {
      return;
    }

    this.#snowBossShootCooldown = GAME_SETTINGS.snowBoss.shootIntervalSeconds;
    this.#shootSnowBossProjectile(boss, this.#player);
  }

  #shootSnowBossProjectile(boss: Enemy, player: Enemy) {
    if (!this.#bossProjectileContainer) {
      return;
    }

    const spawnPosition = boss.root.position
      .add(new Vector3(0, GAME_SETTINGS.snowBoss.projectileSpawnHeight, 0));
    const targetPosition = player.hitbox.position.clone();
    const direction = targetPosition.subtract(spawnPosition);

    if (direction.lengthSquared() <= 0.0001) {
      return;
    }

    direction.normalize();
    spawnPosition.addInPlace(direction.scale(GAME_SETTINGS.snowBoss.projectileForwardOffset));

    const instance = this.#bossProjectileContainer.instantiateModelsToScene(
      (sourceName) => `snow_boss_iceberg_${sourceName}`,
      true
    );
    const root = new TransformNode("snow_boss_iceberg", this.#scene);
    for (const node of instance.rootNodes) {
      node.parent = root;
    }

    root.position.copyFrom(spawnPosition);
    root.rotation.y = Math.atan2(direction.x, direction.z)
      + GAME_SETTINGS.snowBoss.projectileRotationYOffset;

    const rawHeight = getHierarchyHeight(root);
    if (rawHeight > 0) {
      root.scaling.setAll(GAME_SETTINGS.snowBoss.projectileTargetHeight / rawHeight);
    }

    boss.playAttack(false);

    this.#bossProjectiles.push({
      root,
      animationGroups: instance.animationGroups,
      position: spawnPosition.clone(),
      velocity: direction.scale(GAME_SETTINGS.snowBoss.projectileSpeed),
      lifeLeft: GAME_SETTINGS.snowBoss.projectileLifetimeSeconds,
    });
  }

  #updateBossProjectiles(dt: number) {
    for (let i = this.#bossProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.#bossProjectiles[i];
      projectile.lifeLeft -= dt;
      projectile.position.addInPlace(projectile.velocity.scale(dt));
      projectile.root.position.copyFrom(projectile.position);

      if (this.#player && !this.#player.isDead) {
        const hitRadius = GAME_SETTINGS.snowBoss.projectileHitRadius;
        const distanceSq = Vector3.DistanceSquared(projectile.position, this.#player.hitbox.position);

        if (distanceSq <= hitRadius * hitRadius) {
          this.#player.takeDamage(GAME_SETTINGS.snowBoss.projectileDamage);
          this.#hudStatusText(`Ice hit ${GAME_SETTINGS.snowBoss.projectileDamage}`);
          this.#updateHud();
          this.#disposeBossProjectile(i);
          continue;
        }
      }

      if (projectile.lifeLeft <= 0) {
        this.#disposeBossProjectile(i);
      }
    }
  }

  #disposeBossProjectile(index: number) {
    const [projectile] = this.#bossProjectiles.splice(index, 1);

    for (const group of projectile.animationGroups) {
      group.stop();
      group.dispose();
    }

    projectile.root.dispose(false, true);
  }

  #disposeBossProjectiles() {
    for (let i = this.#bossProjectiles.length - 1; i >= 0; i--) {
      this.#disposeBossProjectile(i);
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

    void this.#respawnPlayer();
  }

  async #respawnPlayer() {
    if (!this.#player || this.#isRespawningPlayer) {
      return;
    }

    this.#isRespawningPlayer = true;
    const playerRespawn = {
      position: GAME_SETTINGS.player.respawn.points[PLAYER_RESPAWN_LEVEL].clone(),
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
      this.#hudStatusText(`Respawned on ${PLAYER_RESPAWN_LEVEL}`);
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
    this.#disposeBossProjectiles();
    this.#snowfall?.dispose();
    this.#snowfall = null;
    this.#fireballCooldown = 0;
    this.#playerCastAnimationTimeLeft = 0;
    this.#snowBoss = null;
    this.#snowBossShootCooldown = GAME_SETTINGS.snowBoss.shootIntervalSeconds;

    this.#ai?.dispose();
    this.#ai = null;

    this.#spawner?.disposeAll();
    this.#spawner = null;

    for (const portal of this.#activePortals) {
      portal.effect.dispose();
      portal.labelRoot?.dispose(false, true);
    }
    this.#activePortals = [];

    for (const object of this.#activeSceneObjects) {
      object.container.dispose();
      object.root.dispose();
    }
    this.#activeSceneObjects = [];
    this.#patrolNpcs = [];
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

    this.#bossProjectileContainer?.dispose();
    this.#bossProjectileContainer = null;

    this.#disposeHud();

    for (const p of this.#prefabs) {
      p.dispose();
    }
    this.#prefabs = [];
    this.#enemyPrefabs.clear();
    this.#playerPrefab = null;

    this.#scene.dispose();
  }

  #updateHud() {
    this.#hud?.update({
      player: this.#player,
      target: this.#lastTarget,
      playerRespawnTimeLeft: this.#playerRespawnTimeLeft,
      isRespawningPlayer: this.#isRespawningPlayer,
    });
  }

  #hudStatusText(text: string) {
    this.#hud?.setStatus(text);
  }

  #disposeHud() {
    this.#hud?.dispose();
    this.#hud = null;
  }
}

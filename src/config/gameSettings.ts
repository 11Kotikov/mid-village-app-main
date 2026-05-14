import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import type { LevelKey } from "../assets/paths";

const DEFAULT_ENEMY_AI = {
  maxForce: 12,
  arriveDeceleration: 2,
  nodeReachedDistance: 0.5,
  aggroRange: 13,
  loseRange: 20,
  attackCooldown: 1.1,
  separationRadius: 2.4,
  separationWeight: 0.7,
  yawOffset: 0,
};

const DEFAULT_ENEMY_ROUTE = [
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

const DEFAULT_ENEMY_GROUPS = [
  { model: "goblin", baseName: "goblin", startNodeIndices: [0, 2, 4] },
  { model: "orc", baseName: "orc", startNodeIndices: [5, 7] },
];

const VILLAGE_OUTSKIRTS_ENEMY_ROUTE = [
  { name: "village_far_left_spawn", position: new Vector3(-14, 0, 12), pauseSeconds: 2 },
  { name: "village_far_left_turn", position: new Vector3(-10, 0, 18) },
  { name: "village_north_spawn", position: new Vector3(0, 0, 18), pauseSeconds: 2 },
  { name: "village_far_right_turn", position: new Vector3(10, 0, 18) },
  { name: "village_far_right_spawn", position: new Vector3(14, 0, 12), pauseSeconds: 2 },
  { name: "village_orc_right_spawn", position: new Vector3(16, 0, 6), pauseSeconds: 2.5 },
  { name: "village_back_patrol", position: new Vector3(0, 0, 22) },
  { name: "village_orc_left_spawn", position: new Vector3(-16, 0, 6), pauseSeconds: 2.5 },
];

const SNOW_TERRAIN_ENEMY_ROUTE = [
  { name: "snowman_spawn_left", position: new Vector3(-12, 0, 8), pauseSeconds: 2 },
  { name: "snowman_patrol_left", position: new Vector3(-6, 0, 14) },
  { name: "snowman_spawn_center", position: new Vector3(0, 0, 13), pauseSeconds: 2 },
  { name: "snowman_patrol_right", position: new Vector3(6, 0, 14) },
  { name: "snowman_spawn_right", position: new Vector3(12, 0, 8), pauseSeconds: 2 },
  { name: "yeti_spawn_left", position: new Vector3(-14, 0, -6), pauseSeconds: 2.5 },
  { name: "cold_planet_boss_spawn", position: new Vector3(0, 0, -16), pauseSeconds: 4 },
  { name: "yeti_spawn_right", position: new Vector3(14, 0, -6), pauseSeconds: 2.5 },
];

export const GAME_SETTINGS = {
  startLevel: "World_Village" as LevelKey,

  player: {
    targetHeight: 1.85,
    cameraMoveSpeed: 6.5,
    stats: {
      maxHealth: 120,
      health: 120,
      maxMana: 80,
      mana: 80,
      attackDamage: 24,
      attackRange: 2.4,
    },
    swordAttack: {
      cooldownSeconds: 0.55,
      manaCost: 4,
    },
    manaRegenRatioPerSecond: 0.01 / 60,
    respawn: {
      level: "World_Village" as LevelKey,
      delaySeconds: 3.5,
      healthRatio: 0.05,
      manaRatio: 0.05,
    },
    fireball: {
      manaRatioCost: 0.05,
      damage: 36,
      speed: 18,
      lifetimeSeconds: 2.2,
      hitRadius: 1.25,
      castCooldownSeconds: 0.85,
      castAnimationSeconds: 0.75,
      targetRange: 28,
      spawnHeight: 1.25,
      spawnForwardOffset: 1.1,
    },
  },

  witch: {
    waveIntervalSeconds: 20,
    manaRestoreRadius: 1.45,
    manaRestoreCooldownSeconds: 2,
    targetHeight: 1.8,
  },

  pickups: {
    potionRadius: 0.85,
    potionCooldownSeconds: 2,
    potionTargetHeight: 0.7,
  },

  portalLabels: {
    textureWidth: 512,
    textureHeight: 160,
    planeWidth: 1.55,
    planeHeight: 0.48,
  },

  worldVillageHub: {
    witch: new Vector3(0, 0, 2.6),
    healthPotion: new Vector3(-0.75, 0, 1.65),
    manaPotion: new Vector3(0.75, 0, 1.65),
    cauldron: new Vector3(0, 0, 3.55),
    playerRespawn: new Vector3(0, 0, -2.25),
  },

  levels: {
    Blocks_Trailer_Map: {
      scale: 33,
      startPosition: new Vector3(0, 0, -6),
    },
    Cave_Scene_Draft: {
      scale: 60,
      startPosition: new Vector3(0, 0, -6),
    },
    Snow_Terrain: {
      scale: 10,
      startPosition: new Vector3(0, 0, -6),
      ambientAudioUrl: "/audio/snowWind.mp3",
    },
    Walk_in_the_Woods: {
      scale: 50,
      startPosition: new Vector3(-9.45, 0, 26),
      ambientAudioUrl: "/audio/forest.mp3",
    },
    Warefall: {
      scale: 60,
      startPosition: new Vector3(0, 0, -6),
    },
    World_Village: {
      scale: 10,
      startPosition: new Vector3(0, 0, -2.25),
      ambientAudioUrl: "/audio/village.wav",
    },
  } satisfies Record<LevelKey, { scale: number; startPosition: Vector3; ambientAudioUrl?: string }>,

  portalDefaults: {
    radius: 2.4,
    visualHeight: 3,
    arrivalOffset: new Vector3(0, 0, -4),
    villageRadius: 0.75,
    villageVisualHeight: 1.35,
  },

  portals: {
    Blocks_Trailer_Map: [
      {
        id: "blocks_from_village",
        position: new Vector3(0, 0, 0),
        targetLevel: "World_Village" as LevelKey,
        targetPortalId: "village_to_blocks",
      },
    ],
    Cave_Scene_Draft: [
      {
        id: "cave_from_village",
        position: new Vector3(0, 0, 0),
        targetLevel: "World_Village" as LevelKey,
        targetPortalId: "village_to_cave",
      },
      {
        id: "cave_to_snow",
        position: new Vector3(7, 0, 0),
        targetLevel: "Snow_Terrain" as LevelKey,
        targetPortalId: "snow_from_cave",
        arrivalOffset: new Vector3(-4, 0, 0),
      },
    ],
    Snow_Terrain: [
      {
        id: "snow_from_village",
        position: new Vector3(-6, 0, 0),
        targetLevel: "World_Village" as LevelKey,
        targetPortalId: "village_to_snow",
      },
      {
        id: "snow_from_cave",
        position: new Vector3(0, 0, 6),
        targetLevel: "Cave_Scene_Draft" as LevelKey,
        targetPortalId: "cave_to_snow",
      },
      {
        id: "snow_to_waterfall",
        position: new Vector3(6, 0, 0),
        targetLevel: "Warefall" as LevelKey,
        targetPortalId: "waterfall_from_snow",
        arrivalOffset: new Vector3(-4, 0, 0),
      },
    ],
    Walk_in_the_Woods: [
      {
        id: "woods_to_village",
        position: new Vector3(-10, 0, 30),
        targetLevel: "World_Village" as LevelKey,
        targetPortalId: "village_from_woods",
      },
    ],
    Warefall: [
      {
        id: "waterfall_from_village",
        position: new Vector3(-6, 0, 0),
        targetLevel: "World_Village" as LevelKey,
        targetPortalId: "village_to_waterfall",
      },
      {
        id: "waterfall_from_snow",
        position: new Vector3(0, 0, 6),
        targetLevel: "Snow_Terrain" as LevelKey,
        targetPortalId: "snow_to_waterfall",
      },
    ],
    World_Village: [
      {
        id: "village_from_woods",
        position: new Vector3(-4.8, 0, 0),
        targetLevel: "Walk_in_the_Woods" as LevelKey,
        targetPortalId: "woods_to_village",
        arrivalOffset: new Vector3(0, 0, -1.5),
        radius: 0.75,
        visualHeight: 1.35,
        label: "Лес",
      },
      {
        id: "village_to_cave",
        position: new Vector3(-2.4, 0, 0),
        targetLevel: "Cave_Scene_Draft" as LevelKey,
        targetPortalId: "cave_from_village",
        arrivalOffset: new Vector3(0, 0, -1.5),
        radius: 0.75,
        visualHeight: 1.35,
        label: "Пещера",
      },
      {
        id: "village_to_snow",
        position: new Vector3(0, 0, 0),
        targetLevel: "Snow_Terrain" as LevelKey,
        targetPortalId: "snow_from_village",
        arrivalOffset: new Vector3(0, 0, -1.5),
        radius: 0.75,
        visualHeight: 1.35,
        label: "Снег",
      },
      {
        id: "village_to_blocks",
        position: new Vector3(2.4, 0, 0),
        targetLevel: "Blocks_Trailer_Map" as LevelKey,
        targetPortalId: "blocks_from_village",
        arrivalOffset: new Vector3(0, 0, -1.5),
        radius: 0.75,
        visualHeight: 1.35,
        label: "Блоки",
      },
      {
        id: "village_to_waterfall",
        position: new Vector3(4.8, 0, 0),
        targetLevel: "Warefall" as LevelKey,
        targetPortalId: "waterfall_from_village",
        arrivalOffset: new Vector3(0, 0, -1.5),
        radius: 0.75,
        visualHeight: 1.35,
        label: "Водопад",
      },
    ],
  },

  enemyModels: {
    goblin: {
      url: "/models/enemies/Goblin.glb",
      targetHeight: 1.6,
      stats: {
        maxHealth: 42,
        health: 42,
        maxMana: 10,
        mana: 10,
        attackDamage: 8,
        attackRange: 1.8,
      },
      ai: {
        ...DEFAULT_ENEMY_AI,
        speed: 1.4,
        chaseSpeed: 3.2,
      },
    },
    orc: {
      url: "/models/enemies/Orc.glb",
      targetHeight: 2.2,
      stats: {
        maxHealth: 72,
        health: 72,
        maxMana: 15,
        mana: 15,
        attackDamage: 15,
        attackRange: 2.1,
      },
      ai: {
        ...DEFAULT_ENEMY_AI,
        speed: 1,
        chaseSpeed: 2.7,
        arriveDeceleration: 2.5,
        nodeReachedDistance: 0.55,
        aggroRange: 15,
        loseRange: 23,
        attackCooldown: 1.45,
        separationRadius: 2.8,
        separationWeight: 0.85,
      },
    },
    snowman: {
      url: "/models/enemies/Snowman.glb",
      targetHeight: 1.65,
      stats: {
        maxHealth: 48,
        health: 48,
        maxMana: 8,
        mana: 8,
        attackDamage: 9,
        attackRange: 1.9,
      },
      ai: {
        ...DEFAULT_ENEMY_AI,
        speed: 1.15,
        chaseSpeed: 2.6,
        aggroRange: 12,
        loseRange: 19,
        attackCooldown: 1.25,
      },
    },
    yeti: {
      url: "/models/enemies/Yeti.glb",
      targetHeight: 2.45,
      stats: {
        maxHealth: 96,
        health: 96,
        maxMana: 12,
        mana: 12,
        attackDamage: 18,
        attackRange: 2.35,
      },
      ai: {
        ...DEFAULT_ENEMY_AI,
        speed: 0.95,
        chaseSpeed: 2.55,
        arriveDeceleration: 2.6,
        nodeReachedDistance: 0.6,
        aggroRange: 14,
        loseRange: 22,
        attackCooldown: 1.65,
        separationRadius: 3,
        separationWeight: 0.9,
      },
    },
    coldPlanet: {
      url: "/models/enemies/Cold_Planet.glb",
      targetHeight: 2.8,
      stats: {
        maxHealth: 360,
        health: 360,
        maxMana: 80,
        mana: 80,
        attackDamage: 22,
        attackRange: 3.2,
      },
      ai: {
        ...DEFAULT_ENEMY_AI,
        speed: 0.55,
        chaseSpeed: 1.45,
        arriveDeceleration: 3,
        nodeReachedDistance: 0.75,
        aggroRange: 22,
        loseRange: 32,
        attackCooldown: 2.2,
        separationRadius: 4.5,
        separationWeight: 1,
        respawnDelaySeconds: 420,
      },
    },
  },

  snowBoss: {
    projectileUrl: "/models/projectiles/iceberg.glb",
    projectileTargetHeight: 0.85,
    projectileRotationYOffset: Math.PI / 2,
    shootIntervalSeconds: 4,
    projectileSpeed: 11,
    projectileLifetimeSeconds: 5,
    projectileDamage: 24,
    projectileHitRadius: 1.15,
    projectileSpawnHeight: 1.8,
    projectileForwardOffset: 1.5,
    targetRange: 34,
  },

  enemyRoutes: {
    default: DEFAULT_ENEMY_ROUTE,
    villageOutskirts: VILLAGE_OUTSKIRTS_ENEMY_ROUTE,
    snowTerrain: SNOW_TERRAIN_ENEMY_ROUTE,
  },

  enemiesByLevel: {
    Blocks_Trailer_Map: {
      route: "default",
      groups: DEFAULT_ENEMY_GROUPS,
    },
    Cave_Scene_Draft: {
      route: "default",
      groups: DEFAULT_ENEMY_GROUPS,
    },
    Snow_Terrain: {
      route: "snowTerrain",
      groups: [
        { model: "snowman", baseName: "snowman", startNodeIndices: [0, 2, 4] },
        { model: "yeti", baseName: "yeti", startNodeIndices: [5, 7] },
        { model: "coldPlanet", baseName: "cold_planet_boss", startNodeIndices: [6], boss: true },
      ],
    },
    Walk_in_the_Woods: {
      route: "default",
      groups: DEFAULT_ENEMY_GROUPS,
    },
    Warefall: {
      route: "default",
      groups: DEFAULT_ENEMY_GROUPS,
    },
    World_Village: {
      route: "villageOutskirts",
      groups: DEFAULT_ENEMY_GROUPS,
    },
  } satisfies Record<
    LevelKey,
    {
      route: string;
      groups: ReadonlyArray<{
        model: string;
        baseName?: string;
        startNodeIndices: readonly number[];
        boss?: boolean;
      }>;
    }
  >,
} as const;

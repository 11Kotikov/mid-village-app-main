import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";

import type { LevelKey } from "../assets/paths";

export const GAME_SETTINGS = {
  // Стартовая карта после запуска игры.
  startLevel: "Blocks_Trailer_Map" as LevelKey,

  // Игрок: размер, камера, здоровье/мана, атака мечом, регенерация и fireball.
  player: {
    targetHeight: 1.85,
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
      // Точки возрождения игрока после смерти. Меняй нужную карту здесь,
      // а active-карту выбирай через поле level выше.
      points: {
        Blocks_Trailer_Map: new Vector3(0, 0, -6),
        Cave_Scene_Draft: new Vector3(0, 0, -6),
        Dark_Stage: new Vector3(0, 0, 4),
        Snow_Terrain: new Vector3(0, 0, -6),
        Walk_in_the_Woods: new Vector3(-9.45, 0, 26),
        Warefall: new Vector3(0, 0, -6),
        World_Village: new Vector3(0, 0, -2.25),
      } satisfies Record<LevelKey, Vector3>,
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

  // Камера: здесь можно менять стартовый угол, дистанцию, зум и управление.
  camera: {
    alpha: (2 * Math.PI) / 3,
    beta: Math.PI / 3,
    radius: 60,
    target: new Vector3(10, 0, 10),
    wheelPrecision: 10,
    inertia: 0.65,
    panningInertia: 0,
    lowerBetaLimit: 0.25,
    upperBetaLimit: Math.PI * 0.48,
    // Скорость движения камеры по W/A/S/D. Увеличь число, если камера должна двигаться быстрее.
    moveSpeed: 2,
    // Чувствительность вращения камеры при зажатом колесе мыши.
    middleMouseRotateSpeed: 0.005,
    // Кнопки, которые оставляет стандартному Babylon-управлению: 0 - левая, 2 - правая.
    // Колесо мыши (1) обрабатывается отдельно ниже в cameraControls.ts.
    pointerButtons: [0, 2],
  },

  // Ведьма у порталов: частота wave-анимации, радиус восстановления маны, размер модели.
  witch: {
    waveIntervalSeconds: 20,
    manaRestoreRadius: 1.45,
    manaRestoreCooldownSeconds: 2,
    targetHeight: 1.8,
  },

  // Зелья рядом с ведьмой: радиус подбора, задержка повторного срабатывания, размер моделей.
  pickups: {
    potionRadius: 0.85,
    potionCooldownSeconds: 2,
    potionTargetHeight: 0.7,
  },

  // Таблички над порталами: размер текстуры и физический размер плоскости в мире.
  portalLabels: {
    textureWidth: 512,
    textureHeight: 160,
    planeWidth: 1.55,
    planeHeight: 0.48,
  },

  // World_Village: точки ведьмы, зелий, котла и безопасного респавна рядом с хабом.
  worldVillageHub: {
    witch: new Vector3(0, 0, 2.6),
    healthPotion: new Vector3(-0.75, 0, 1.65),
    manaPotion: new Vector3(0.75, 0, 1.65),
    cauldron: new Vector3(0, 0, 3.55),
    playerRespawn: new Vector3(0, 0, -2.25),
  },

  // Cave_Scene_Draft: декоративные объекты на карте.
  caveSceneDraftProps: {
    fantasyStable: {
      position: new Vector3(8, 0, -10),
      targetHeight: 4.5,
      rotationY: Math.PI / 2,
    },
  },

  // Dark_Stage: парящая книга в центре карты и слабое зеленоватое свечение вокруг нее.
  darkStageProps: {
    evilBook: {
      position: new Vector3(0, 0, 0),
      targetHeight: 1.05,
      hoverHeight: 1.25,
      floatAmplitude: 0.08,
      floatSpeed: 1.35,
      rotationY: 0,
      glow: {
        capacity: 350,
        emitRate: 28,
        minLifeTime: 1.2,
        maxLifeTime: 2.4,
        minSize: 0.12,
        maxSize: 0.32,
        minEmitPower: 0.05,
        maxEmitPower: 0.18,
        minEmitBox: new Vector3(-0.45, -0.12, -0.45),
        maxEmitBox: new Vector3(0.45, 0.28, 0.45),
        color1: new Color4(0.55, 1, 0.62, 0.22),
        color2: new Color4(0.75, 1, 0.82, 0.14),
        colorDead: new Color4(0.2, 0.75, 0.32, 0),
      },
    },
  },

  // Blocks_Trailer_Map: замок/собор, NPC рядом с ним и маршруты патруля рыцарей.
  blocksTrailerProps: {
    cathedral: {
      position: new Vector3(0, 0, -20),
      targetHeight: 10,
      rotationY: Math.PI,
    },
    castleNpcs: {
      king: {
        position: new Vector3(0, 0, -13.5),
        targetHeight: 1.9,
        rotationY: Math.PI,
      },
      knight: {
        position: new Vector3(3.2, 0, -13.25),
        targetHeight: 1.85,
        rotationY: Math.PI,
      },
      knight2TargetHeight: 1.85,
      knight2Speed: 2,
      knight2Patrols: [
        {
          startPosition: new Vector3(-4, 0, -13.5),
          route: [
            new Vector3(-6.5, 0, -15.5),
            new Vector3(-6.5, 0, -25),
            new Vector3(-1.5, 0, -27.5),
            new Vector3(-1.5, 0, -15.5),
          ],
        },
        {
          startPosition: new Vector3(4, 0, -13.5),
          route: [
            new Vector3(6.5, 0, -15.5),
            new Vector3(6.5, 0, -25),
            new Vector3(1.5, 0, -27.5),
            new Vector3(1.5, 0, -15.5),
          ],
        },
      ],
    },
  },

  // Настройки уровней. scale меняет размер всей GLB-карты, startPosition - старт игрока,
  // ambientAudioUrl - музыка/звук окружения для конкретной карты.
  levels: {
    Blocks_Trailer_Map: {
      scale: 33,
      startPosition: new Vector3(100, 0, -6),
    },
    Cave_Scene_Draft: {
      scale: 60,
      startPosition: new Vector3(0, 0, -6),
    },
    Dark_Stage: {
      scale: 10,
      startPosition: new Vector3(0, 0, 4),
    },
    Snow_Terrain: {
      scale: 10,
      startPosition: new Vector3(0, 0, -6),
      ambientAudioUrl: "/audio/snowWind.mp3",
    },
    Walk_in_the_Woods: {
      scale: 50,
      startPosition: new Vector3(-9.45, 0, 26),
      ambientAudioUrl: "/audio/nightForest.mp3",
    },
    Warefall: {
      scale: 60,
      startPosition: new Vector3(0, 0, -6),
      ambientAudioUrl: "/audio/forest.mp3",
    },
    World_Village: {
      scale: 10,
      startPosition: new Vector3(0, 0, -2.25),
      ambientAudioUrl: "/audio/village.wav",
    },
  } satisfies Record<LevelKey, { scale: number; startPosition: Vector3; ambientAudioUrl?: string }>,

  // Общие параметры порталов. Можно переопределить внутри конкретного портала ниже.
  portalCommon: {
    radius: 2.4,
    visualHeight: 3,
    arrivalOffset: new Vector3(0, 0, -4),
    villageRadius: 0.75,
    villageVisualHeight: 1.35,
  },

  // Порталы по картам. position - место портала на текущей карте,
  // targetLevel/targetPortalId - куда переносит, label - подпись над порталом.
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
    Dark_Stage: [
      {
        id: "dark_stage_from_village",
        position: new Vector3(0, 0, 8),
        targetLevel: "World_Village" as LevelKey,
        targetPortalId: "village_to_dark_stage",
        arrivalOffset: new Vector3(0, 0, -4),
        particleColors: {
          color1: new Color4(1, 0.08, 0.04, 1),
          color2: new Color4(0.7, 0, 0, 1),
          colorDead: new Color4(0.4, 0, 0, 0),
        },
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
      {
        id: "village_to_dark_stage",
        position: new Vector3(7.2, 0, 0),
        targetLevel: "Dark_Stage" as LevelKey,
        targetPortalId: "dark_stage_from_village",
        arrivalOffset: new Vector3(0, 0, -1.5),
        radius: 0.75,
        visualHeight: 1.35,
        label: "Тьма",
        particleColors: {
          color1: new Color4(1, 0.08, 0.04, 1),
          color2: new Color4(0.7, 0, 0, 1),
          colorDead: new Color4(0.4, 0, 0, 0),
        },
      },
    ],
  },

  // Каталог моделей врагов. Здесь меняй путь к GLB, рост, анимации, здоровье и AI-поведение.
  enemyModels: {
    goblin: {
      url: "/models/enemies/Goblin.glb",
      targetHeight: 1.6,
      animations: {
        idle: ["Idle"],
        walk: ["Walk"],
        run: ["Run"],
        attack: ["Attack"],
        death: ["Death"],
      },
      stats: {
        maxHealth: 42,
        health: 42,
        maxMana: 10,
        mana: 10,
        attackDamage: 8,
        attackRange: 1.8,
      },
      ai: {
        maxForce: 12,
        arriveDeceleration: 2,
        nodeReachedDistance: 0.5,
        aggroRange: 13,
        loseRange: 20,
        attackCooldown: 1.1,
        separationRadius: 2.4,
        separationWeight: 0.7,
        yawOffset: 0,
        speed: 1.4,
        chaseSpeed: 3.2,
      },
    },
    orc: {
      url: "/models/enemies/Orc.glb",
      targetHeight: 2.2,
      animations: {
        idle: ["Idle"],
        walk: ["Walk"],
        run: ["Run"],
        attack: ["Punch", "Weapon"],
        death: ["Death"],
      },
      stats: {
        maxHealth: 72,
        health: 72,
        maxMana: 15,
        mana: 15,
        attackDamage: 15,
        attackRange: 2.1,
      },
      ai: {
        maxForce: 12,
        speed: 1,
        chaseSpeed: 2.7,
        arriveDeceleration: 2.5,
        nodeReachedDistance: 0.55,
        aggroRange: 15,
        loseRange: 23,
        attackCooldown: 1.45,
        separationRadius: 2.8,
        separationWeight: 0.85,
        yawOffset: 0,
      },
    },
    skeletonHeadless: {
      url: "/models/enemies/Skeleton_headless.glb",
      targetHeight: 1.75,
      animations: {
        idle: ["Idle"],
        walk: ["Walk"],
        run: ["Run"],
        attack: ["Sword", "Punch"],
        death: ["Death"],
      },
      stats: {
        maxHealth: 48,
        health: 48,
        maxMana: 8,
        mana: 8,
        attackDamage: 9,
        attackRange: 1.85,
      },
      ai: {
        maxForce: 12,
        arriveDeceleration: 2,
        nodeReachedDistance: 0.5,
        speed: 1.25,
        chaseSpeed: 3,
        aggroRange: 13,
        loseRange: 20,
        attackCooldown: 1.15,
        separationRadius: 2.4,
        separationWeight: 0.7,
        yawOffset: 0,
      },
    },
    skeletonHelmed: {
      url: "/models/enemies/Skeleton_helmed.glb",
      targetHeight: 1.9,
      animations: {
        idle: ["Idle"],
        walk: ["Walk"],
        run: ["Run"],
        attack: ["Attack"],
        death: ["Death"],
      },
      stats: {
        maxHealth: 76,
        health: 76,
        maxMana: 12,
        mana: 12,
        attackDamage: 15,
        attackRange: 2.05,
      },
      ai: {
        maxForce: 12,
        speed: 1,
        chaseSpeed: 2.65,
        arriveDeceleration: 2.4,
        nodeReachedDistance: 0.55,
        aggroRange: 15,
        loseRange: 23,
        attackCooldown: 1.4,
        separationRadius: 2.7,
        separationWeight: 0.85,
        yawOffset: 0,
      },
    },
    skeletonHelmedBoss: {
      url: "/models/enemies/Skeleton_helmed.glb",
      targetHeight: 2.35,
      animations: {
        idle: ["Idle"],
        walk: ["Walk"],
        run: ["Run"],
        attack: ["Attack"],
        death: ["Death"],
      },
      stats: {
        maxHealth: 280,
        health: 280,
        maxMana: 35,
        mana: 35,
        attackDamage: 24,
        attackRange: 2.6,
      },
      ai: {
        maxForce: 12,
        speed: 0.85,
        chaseSpeed: 2.25,
        arriveDeceleration: 2.8,
        nodeReachedDistance: 0.65,
        aggroRange: 20,
        loseRange: 30,
        attackCooldown: 1.9,
        separationRadius: 4,
        separationWeight: 1,
        yawOffset: 0,
        respawnDelaySeconds: 420,
      },
    },
    whiteMan: {
      url: "/models/enemies/White_man.glb",
      targetHeight: 1.65,
      animations: {
        idle: ["Idle"],
        walk: ["Walk"],
        run: ["Run"],
        attack: ["Punch"],
        death: ["Death"],
      },
      stats: {
        maxHealth: 48,
        health: 48,
        maxMana: 8,
        mana: 8,
        attackDamage: 9,
        attackRange: 1.9,
      },
      ai: {
        maxForce: 12,
        arriveDeceleration: 2,
        nodeReachedDistance: 0.5,
        speed: 1.15,
        chaseSpeed: 2.6,
        aggroRange: 12,
        loseRange: 19,
        attackCooldown: 1.25,
        separationRadius: 2.4,
        separationWeight: 0.7,
        yawOffset: 0,
      },
    },
    fish: {
      url: "/models/enemies/Fish.glb",
      targetHeight: 1.55,
      animations: {
        idle: ["Idle"],
        walk: ["Walk"],
        run: ["Run"],
        attack: ["Punch", "Weapon"],
        death: ["Death"],
      },
      stats: {
        maxHealth: 52,
        health: 52,
        maxMana: 8,
        mana: 8,
        attackDamage: 10,
        attackRange: 1.85,
      },
      ai: {
        maxForce: 12,
        arriveDeceleration: 2,
        nodeReachedDistance: 0.5,
        speed: 1.25,
        chaseSpeed: 2.95,
        aggroRange: 13,
        loseRange: 20,
        attackCooldown: 1.15,
        separationRadius: 2.4,
        separationWeight: 0.7,
        yawOffset: 0,
      },
    },
    frog: {
      url: "/models/enemies/Frog.glb",
      targetHeight: 1.35,
      animations: {
        idle: ["Frog_Idle"],
        walk: ["Frog_Jump"],
        run: ["Frog_Jump"],
        attack: ["Frog_Attack"],
        death: ["Frog_Death"],
      },
      stats: {
        maxHealth: 44,
        health: 44,
        maxMana: 10,
        mana: 10,
        attackDamage: 8,
        attackRange: 1.7,
      },
      ai: {
        maxForce: 12,
        arriveDeceleration: 2,
        nodeReachedDistance: 0.5,
        speed: 1.35,
        chaseSpeed: 3.15,
        aggroRange: 12,
        loseRange: 19,
        attackCooldown: 1.05,
        separationRadius: 2.1,
        separationWeight: 0.7,
        yawOffset: 0,
      },
    },
    makoBoss: {
      url: "/models/enemies/Mako.glb",
      targetHeight: 2.45,
      animations: {
        idle: ["Idle"],
        walk: ["Walk"],
        run: ["Run"],
        attack: ["Punch", "Sword"],
        death: ["Death"],
      },
      stats: {
        maxHealth: 320,
        health: 320,
        maxMana: 45,
        mana: 45,
        attackDamage: 24,
        attackRange: 2.7,
      },
      ai: {
        maxForce: 12,
        speed: 0.85,
        chaseSpeed: 2.25,
        arriveDeceleration: 2.8,
        nodeReachedDistance: 0.65,
        aggroRange: 20,
        loseRange: 30,
        attackCooldown: 1.9,
        separationRadius: 4,
        separationWeight: 1,
        yawOffset: 0,
        respawnDelaySeconds: 420,
      },
    },
    yeti: {
      url: "/models/enemies/Yeti.glb",
      targetHeight: 2.45,
      animations: {
        idle: ["Idle"],
        walk: ["Walk"],
        run: ["Run"],
        attack: ["Attack"],
        death: ["Death"],
      },
      stats: {
        maxHealth: 96,
        health: 96,
        maxMana: 12,
        mana: 12,
        attackDamage: 18,
        attackRange: 2.35,
      },
      ai: {
        maxForce: 12,
        speed: 0.95,
        chaseSpeed: 2.55,
        arriveDeceleration: 2.6,
        nodeReachedDistance: 0.6,
        aggroRange: 14,
        loseRange: 22,
        attackCooldown: 1.65,
        separationRadius: 3,
        separationWeight: 0.9,
        yawOffset: 0,
      },
    },
    coldPlanet: {
      url: "/models/enemies/Cold_Planet.glb",
      targetHeight: 2.8,
      animations: {
        idle: [],
        walk: [],
        run: [],
        attack: [],
        death: [],
      },
      stats: {
        maxHealth: 360,
        health: 360,
        maxMana: 80,
        mana: 80,
        attackDamage: 22,
        attackRange: 3.2,
      },
      ai: {
        maxForce: 12,
        speed: 0.55,
        chaseSpeed: 1.45,
        arriveDeceleration: 3,
        nodeReachedDistance: 0.75,
        aggroRange: 22,
        loseRange: 32,
        attackCooldown: 2.2,
        separationRadius: 4.5,
        separationWeight: 1,
        yawOffset: 0,
        respawnDelaySeconds: 420,
      },
    },
  },

  // Босс Snow_Terrain: настройки ледяного снаряда и дистанции стрельбы.
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

  // Snow_Terrain: параметры снегопада из системы частиц.
  snowTerrainWeather: {
    emitRate: 850,
    capacity: 4500,
    minEmitBox: new Vector3(-45, 26, -45),
    maxEmitBox: new Vector3(45, 32, 45),
    gravity: new Vector3(0.25, -3.4, 0.15),
    direction1: new Vector3(-0.45, -1, -0.25),
    direction2: new Vector3(0.45, -1, 0.25),
    minLifeTime: 5,
    maxLifeTime: 8,
    minSize: 0.35,
    maxSize: 0.9,
    minEmitPower: 0.15,
    maxEmitPower: 0.55,
    updateSpeed: 0.012,
  },

  // Враги по уровням.
  // route: точки патруля/спавна на конкретной карте.
  // groups: какие модели врагов ставить на какие индексы route.
  // startNodeIndices берут координаты из route по номеру элемента, начиная с 0.
  enemiesByLevel: {
    Blocks_Trailer_Map: {
      // Здесь меняй расстановку скелетов и боссов на Blocks_Trailer_Map.
      route: [
        { name: "skeleton_headless_spawn_left", position: new Vector3(-20, 0, 8), pauseSeconds: 2 },
        { name: "skeleton_headless_patrol_left", position: new Vector3(-5, 0, 13) },
        { name: "skeleton_headless_spawn_center", position: new Vector3(0, 0, 9), pauseSeconds: 2 },
        { name: "skeleton_headless_patrol_right", position: new Vector3(5, 0, 13) },
        { name: "skeleton_headless_spawn_right", position: new Vector3(10, 0, 8), pauseSeconds: 2 },
        { name: "skeleton_helmed_spawn_left", position: new Vector3(-12, 0, -2), pauseSeconds: 2.5 },
        { name: "skeleton_helmed_patrol_center", position: new Vector3(0, 0, 2) },
        { name: "skeleton_helmed_spawn_right", position: new Vector3(12, 0, -2), pauseSeconds: 2.5 },
        { name: "skeleton_boss_spawn_left", position: new Vector3(-9, 0, -13), pauseSeconds: 4 },
        { name: "skeleton_boss_spawn_right", position: new Vector3(9, 0, -13), pauseSeconds: 4 },
      ],
      groups: [
        { model: "skeletonHeadless", baseName: "skeleton_headless", startNodeIndices: [0, 2, 4] },
        { model: "skeletonHelmed", baseName: "skeleton_helmed", startNodeIndices: [5, 7] },
        { model: "skeletonHelmedBoss", baseName: "skeleton_boss", startNodeIndices: [8, 9] },
      ],
    },
    Cave_Scene_Draft: {
      // Здесь меняй врагов и маршрут на Cave_Scene_Draft.
      route: [
        { name: "goblin_spawn_1", position: new Vector3(2, 0, 8), pauseSeconds: 2.5 },
        { name: "goblin_patrol_1", position: new Vector3(10, 0, 8) },
        { name: "goblin_spawn_2", position: new Vector3(10, 0, 2), pauseSeconds: 2.5 },
        { name: "goblin_patrol_2", position: new Vector3(10, 0, -4) },
        { name: "goblin_spawn_3", position: new Vector3(4, 0, -4), pauseSeconds: 2.5 },
        { name: "orc_spawn_1", position: new Vector3(-3, 0, -4), pauseSeconds: 2.5 },
        { name: "orc_patrol_1", position: new Vector3(-3, 0, 1) },
        { name: "orc_spawn_2", position: new Vector3(-8, 0, 1), pauseSeconds: 2.5 },
        { name: "center_patrol", position: new Vector3(2, 0, 1) },
      ],
      groups: [
        { model: "goblin", baseName: "goblin", startNodeIndices: [0, 2, 4] },
        { model: "orc", baseName: "orc", startNodeIndices: [5, 7] },
      ],
    },
    Dark_Stage: {
      // Здесь можно добавить врагов на Dark_Stage. Сейчас карта без врагов: только книга и портал.
      route: [],
      groups: [],
    },
    Snow_Terrain: {
      // Здесь меняй White_man, Yeti и босса Cold_Planet на Snow_Terrain.
      route: [
        { name: "white_man_spawn_left", position: new Vector3(-12, 0, 8), pauseSeconds: 2 },
        { name: "white_man_patrol_left", position: new Vector3(-6, 0, 14) },
        { name: "white_man_spawn_center", position: new Vector3(0, 0, 13), pauseSeconds: 2 },
        { name: "white_man_patrol_right", position: new Vector3(6, 0, 14) },
        { name: "white_man_spawn_right", position: new Vector3(12, 0, 8), pauseSeconds: 2 },
        { name: "yeti_spawn_left", position: new Vector3(-14, 0, -6), pauseSeconds: 2.5 },
        { name: "cold_planet_boss_spawn", position: new Vector3(0, 0, -16), pauseSeconds: 4 },
        { name: "yeti_spawn_right", position: new Vector3(14, 0, -6), pauseSeconds: 2.5 },
      ],
      groups: [
        { model: "whiteMan", baseName: "white_man", startNodeIndices: [0, 2, 4] },
        { model: "yeti", baseName: "yeti", startNodeIndices: [5, 7] },
        { model: "coldPlanet", baseName: "cold_planet_boss", startNodeIndices: [6], boss: true },
      ],
    },
    Walk_in_the_Woods: {
      // Здесь меняй врагов и маршрут на Walk_in_the_Woods.
      route: [
        { name: "goblin_spawn_1", position: new Vector3(2, 0, 8), pauseSeconds: 2.5 },
        { name: "goblin_patrol_1", position: new Vector3(10, 0, 8) },
        { name: "goblin_spawn_2", position: new Vector3(10, 0, 2), pauseSeconds: 2.5 },
        { name: "goblin_patrol_2", position: new Vector3(10, 0, -4) },
        { name: "goblin_spawn_3", position: new Vector3(4, 0, -4), pauseSeconds: 2.5 },
        { name: "orc_spawn_1", position: new Vector3(-3, 0, -4), pauseSeconds: 2.5 },
        { name: "orc_patrol_1", position: new Vector3(-3, 0, 1) },
        { name: "orc_spawn_2", position: new Vector3(-8, 0, 1), pauseSeconds: 2.5 },
        { name: "center_patrol", position: new Vector3(2, 0, 1) },
      ],
      groups: [
        { model: "goblin", baseName: "goblin", startNodeIndices: [0, 2, 4] },
        { model: "orc", baseName: "orc", startNodeIndices: [5, 7] },
      ],
    },
    Warefall: {
      // Здесь меняй Fish, Frog и босса Mako на Warefall.
      route: [
        { name: "fish_spawn_left", position: new Vector3(-12, 0, 8), pauseSeconds: 2 },
        { name: "fish_patrol_left", position: new Vector3(-6, 0, 13) },
        { name: "fish_spawn_center", position: new Vector3(0, 0, 10), pauseSeconds: 2 },
        { name: "fish_patrol_right", position: new Vector3(6, 0, 13) },
        { name: "fish_spawn_right", position: new Vector3(12, 0, 8), pauseSeconds: 2 },
        { name: "frog_spawn_left", position: new Vector3(-11, 0, -4), pauseSeconds: 2.5 },
        { name: "mako_boss_spawn", position: new Vector3(0, 0, -14), pauseSeconds: 4 },
        { name: "frog_spawn_right", position: new Vector3(11, 0, -4), pauseSeconds: 2.5 },
      ],
      groups: [
        { model: "fish", baseName: "fish", startNodeIndices: [0, 2, 4] },
        { model: "frog", baseName: "frog", startNodeIndices: [5, 7] },
        { model: "makoBoss", baseName: "mako_boss", startNodeIndices: [6] },
      ],
    },
    World_Village: {
      // Здесь меняй врагов вокруг деревни. Порталы и ведьма находятся отдельно выше.
      route: [
        { name: "village_far_left_spawn", position: new Vector3(-14, 0, 12), pauseSeconds: 2 },
        { name: "village_far_left_turn", position: new Vector3(-10, 0, 18) },
        { name: "village_north_spawn", position: new Vector3(0, 0, 18), pauseSeconds: 2 },
        { name: "village_far_right_turn", position: new Vector3(10, 0, 18) },
        { name: "village_far_right_spawn", position: new Vector3(14, 0, 12), pauseSeconds: 2 },
        { name: "village_orc_right_spawn", position: new Vector3(16, 0, 6), pauseSeconds: 2.5 },
        { name: "village_back_patrol", position: new Vector3(0, 0, 22) },
        { name: "village_orc_left_spawn", position: new Vector3(-16, 0, 6), pauseSeconds: 2.5 },
      ],
      groups: [
        { model: "goblin", baseName: "goblin", startNodeIndices: [0, 2, 4] },
        { model: "orc", baseName: "orc", startNodeIndices: [5, 7] },
      ],
    },
  } satisfies Record<
    LevelKey,
    {
      route: ReadonlyArray<{
        name: string;
        position: Vector3;
        pauseSeconds?: number;
      }>;
      groups: ReadonlyArray<{
        model: string;
        baseName?: string;
        startNodeIndices: readonly number[];
        boss?: boolean;
      }>;
    }
  >,
} as const;

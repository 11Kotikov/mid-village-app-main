import type { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";

import { CURRENT_LEVEL_KEY, LEVEL_URLS, ENEMY_URLS, PLAYER_URLS, AUDIO_URLS } from "../assets/paths";
import { loadGLBAsContainer } from "../assets/loaders";
import { Level } from "../world/Level";
import {
  ENEMY_PATROL_ROUTE,
  GOBLIN_PATROL_START_NODE_INDICES,
  ORC_PATROL_START_NODE_INDICES,
  getPatrolSpawnPoints,
} from "../world/enemyPatrolRoute";
import { LEVEL_WALKABLE_SUFFIXES } from "../world/levelWalkableConfig";
import { Enemy } from "../entities/Enemy";
import { EnemyPrefab } from "../entities/EnemyPrefab";
import { EnemySpawner } from "../entities/EnemySpawner";
import { YukaWorld } from "../ai/YukaWorld";
import { setupInspectorHotkey } from "../debug/inspectorHotkey";
import { ClickToMovePlayer } from "../player/ClickToMovePlayer";

import { AmbientAudio } from "../audio/AmbientAudio";

import { attachWASDControls } from "./cameraControls";

export class GameScene {
  #scene: Scene;
  #canvas: HTMLCanvasElement;
  #spawner: EnemySpawner | null;
  #prefabs: EnemyPrefab[];
  #level: Level | null;
  #ai: YukaWorld | null;
  #player: Enemy | null;
  #playerController: ClickToMovePlayer | null;
  #audio: AmbientAudio | null;
  #disposeInspectorHotkey: (() => void) | null;
  #disposeWASDControls: (() => void) | null;

  constructor(engine: Engine, canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#scene = new Scene(engine);
    this.#level = null;
    this.#spawner = null;
    this.#prefabs = [];
    this.#ai = null;
    this.#player = null;
    this.#playerController = null;
    this.#audio = null;
    this.#disposeInspectorHotkey = null;
    this.#disposeWASDControls = null;

    new HemisphericLight("light", new Vector3(0, 1, 0), this.#scene);

    this.#disposeInspectorHotkey = setupInspectorHotkey(this.#scene);
  }

  get scene(): Scene {
    return this.#scene;
  }

  async init() {

    const camera = this.#createCamera();
    this.#disposeWASDControls = attachWASDControls(camera, this.#scene, 5);

    const levelUrl = LEVEL_URLS[CURRENT_LEVEL_KEY];
    const levelContainer = await loadGLBAsContainer(this.#scene, levelUrl);
    const goblinContainer = await loadGLBAsContainer(this.#scene, ENEMY_URLS.goblin);
    const orcContainer = await loadGLBAsContainer(this.#scene, ENEMY_URLS.orc);
    const playerContainer = await loadGLBAsContainer(this.#scene, PLAYER_URLS.hoodedAdventurer);

    const level = new Level(this.#scene, levelContainer, {
      scale: 50,
      placeOnGround: true,
      logBounds: true,
    });
    this.#level = level;

    const suffixes = LEVEL_WALKABLE_SUFFIXES[CURRENT_LEVEL_KEY] ?? [];
    const filteredGroundMeshes = level.getPickMeshesBySuffix(suffixes);
    const groundMeshes = filteredGroundMeshes.length > 0 ? filteredGroundMeshes : level.pickMeshes;

    if (filteredGroundMeshes.length === 0) {
      console.warn("[level] walkable meshes not found, fallback to all pickMeshes");
      level.logPickMeshes();
    }

    const goblinPrefab = new EnemyPrefab(this.#scene, goblinContainer, "goblin", {
      targetHeight: 1.6,
    });
    const orcPrefab = new EnemyPrefab(this.#scene, orcContainer, "orc", {
      targetHeight: 2.2,
    });
    const playerPrefab = new EnemyPrefab(this.#scene, playerContainer, "player", {
      targetHeight: 1.85,
    });

    this.#prefabs.push(goblinPrefab, orcPrefab, playerPrefab);

    const spawner = new EnemySpawner();
    this.#spawner = spawner;

    const goblins = spawner.spawnMany(goblinPrefab, getPatrolSpawnPoints(GOBLIN_PATROL_START_NODE_INDICES), "goblin", {
      groundMeshes,
    });

    const orcs = spawner.spawnMany(orcPrefab, getPatrolSpawnPoints(ORC_PATROL_START_NODE_INDICES), "orc", {
      groundMeshes,
    });

    const ai = new YukaWorld(this.#scene);
    this.#ai = ai;

    for (const [index, g] of goblins.entries()) {
      ai.addPatrolEnemy(g, {
        groundMeshes,
        route: ENEMY_PATROL_ROUTE,
        startNodeIndex: GOBLIN_PATROL_START_NODE_INDICES[index],
        speed: 1.4,
        maxForce: 12,
        arriveDeceleration: 2,
        nodeReachedDistance: 0.5,
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
        startNodeIndex: ORC_PATROL_START_NODE_INDICES[index],
        speed: 1.0,
        maxForce: 12,
        arriveDeceleration: 2.5,
        nodeReachedDistance: 0.55,
        separationRadius: 2.8,
        separationWeight: 0.85,
        raycastTopY: 10000,
        raycastLength: 20000,
        yawOffset: 0,
      });
    }

    const playerStartPosition =
      ENEMY_PATROL_ROUTE[1]?.position.clone() ?? ENEMY_PATROL_ROUTE[0]?.position.clone() ?? Vector3.Zero();

    const player = playerPrefab.spawn(playerStartPosition, "player", {
      groundMeshes,
      logSizing: true,
    });
    if (!player.playOnlyBySuffix("Idle_Neutral", true) && !player.playIdle(true)) {
      player.playWalk(true);
    }

    this.#player = player;
    this.#playerController = new ClickToMovePlayer(this.#scene, player, {
      groundMeshes,
      speed: 4.8,
      stopDistance: 0.2,
      clickThresholdPx: 8,
      raycastTopY: 10000,
      raycastLength: 20000,
      yawOffset: 0,
    });

    const audio = new AmbientAudio();
    this.#audio = audio;
    await audio.init(AUDIO_URLS.ambienceForest);
  }

  #createCamera() {
    const camera = new ArcRotateCamera("camera", Math.PI / 2, Math.PI / 3, 20, Vector3.Zero(), this.#scene);
    camera.attachControl(this.#canvas, true);
    camera.wheelPrecision = 50;
    return camera;
  }

  update(dt: number) {
    this.#playerController?.update(dt);
    this.#ai?.update(dt);
    this.#spawner?.update(dt);
  }

  dispose() {
    this.#disposeInspectorHotkey?.();
    this.#disposeInspectorHotkey = null;

    this.#disposeWASDControls?.(); // очистка WASD
    this.#disposeWASDControls = null;

    this.#audio?.dispose();
    this.#audio = null;

    this.#playerController?.dispose();
    this.#playerController = null;

    this.#player?.dispose();
    this.#player = null;

    this.#ai?.dispose();
    this.#ai = null;

    this.#level?.dispose();
    this.#level = null;

    this.#spawner?.disposeAll();
    this.#spawner = null;

    for (const p of this.#prefabs) {
      p.dispose();
    }
    this.#prefabs = [];

    this.#scene.dispose();
  }
}

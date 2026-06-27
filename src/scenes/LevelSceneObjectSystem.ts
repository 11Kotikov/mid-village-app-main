import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Scene } from "@babylonjs/core/scene";
import type { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import {
  NPC_URLS,
  POTION_URLS,
  PROP_URLS,
  type LevelKey,
} from "../assets/paths";
import { GAME_SETTINGS } from "../config/gameSettings";
import type { CombatActor } from "../entities/CombatActor";
import { createEvilBookGlow } from "../effects/BookGlow";

import {
  findAnimationBySuffix,
  loadSceneObject,
  playSceneObjectAnimation,
  type LoadedSceneObject,
} from "./sceneObjects";

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

type FloatingSceneObject = LoadedSceneObject & {
  baseY: number;
  elapsed: number;
  floatAmplitude: number;
  floatSpeed: number;
  particleSystem: ParticleSystem | null;
};

type LevelSceneObjectSystemOptions = {
  getGroundedPosition: (position: Vector3, groundMeshes: AbstractMesh[]) => Vector3;
  pickGroundAt: (position: Vector3, groundMeshes: AbstractMesh[]) => Vector3 | null;
  onStatusText: (text: string) => void;
  onHudChanged: () => void;
};

const WITCH_WAVE_INTERVAL_SECONDS = GAME_SETTINGS.witch.waveIntervalSeconds;
const WITCH_MANA_RESTORE_RADIUS = GAME_SETTINGS.witch.manaRestoreRadius;
const WITCH_MANA_RESTORE_COOLDOWN_SECONDS = GAME_SETTINGS.witch.manaRestoreCooldownSeconds;
const POTION_PICKUP_RADIUS = GAME_SETTINGS.pickups.potionRadius;
const POTION_PICKUP_COOLDOWN_SECONDS = GAME_SETTINGS.pickups.potionCooldownSeconds;
const WORLD_VILLAGE_HUB = GAME_SETTINGS.worldVillageHub;

export class LevelSceneObjectSystem {
  #scene: Scene;
  #getGroundedPosition: LevelSceneObjectSystemOptions["getGroundedPosition"];
  #pickGroundAt: LevelSceneObjectSystemOptions["pickGroundAt"];
  #onStatusText: LevelSceneObjectSystemOptions["onStatusText"];
  #onHudChanged: LevelSceneObjectSystemOptions["onHudChanged"];
  #activeSceneObjects: LoadedSceneObject[] = [];
  #floatingSceneObjects: FloatingSceneObject[] = [];
  #patrolNpcs: PatrolNpc[] = [];
  #witch: WitchNpc | null = null;
  #potionPickups: PotionPickup[] = [];
  #witchManaRestoreCooldown = 0;

  constructor(scene: Scene, options: LevelSceneObjectSystemOptions) {
    this.#scene = scene;
    this.#getGroundedPosition = options.getGroundedPosition;
    this.#pickGroundAt = options.pickGroundAt;
    this.#onStatusText = options.onStatusText;
    this.#onHudChanged = options.onHudChanged;
  }

  async createForLevel(levelKey: LevelKey, groundMeshes: AbstractMesh[]) {
    this.dispose();

    if (levelKey === "Blocks_Trailer_Map") {
      await this.#createBlocksTrailerObjects(groundMeshes);
      return;
    }

    if (levelKey === "Cave_Scene_Draft") {
      await this.#createCaveSceneObjects(groundMeshes);
      return;
    }

    if (levelKey === "Dark_Stage") {
      await this.#createDarkStageObjects(groundMeshes);
      return;
    }

    if (levelKey === "World_Village") {
      await this.#createWorldVillageObjects(groundMeshes);
    }
  }

  update(dt: number, player: CombatActor | null, groundMeshes: AbstractMesh[]) {
    this.#updateFloatingSceneObjects(dt);
    this.#updateWitch(dt, player);
    this.#updatePatrolNpcs(dt, groundMeshes);
    this.#updatePotionPickups(dt, player);
  }

  async #createBlocksTrailerObjects(groundMeshes: AbstractMesh[]) {
    const cathedral = GAME_SETTINGS.blocksTrailerProps.cathedral;
    await this.#loadSceneObject(PROP_URLS.cathedral, {
      name: "blocks_trailer_cathedral",
      position: cathedral.position,
      groundMeshes,
      targetHeight: cathedral.targetHeight,
      rotationY: cathedral.rotationY,
    });

    await this.#createBlocksTrailerCastleNpcs(groundMeshes);
  }

  async #createCaveSceneObjects(groundMeshes: AbstractMesh[]) {
    const stable = GAME_SETTINGS.caveSceneDraftProps.fantasyStable;
    await this.#loadSceneObject(PROP_URLS.fantasyStable, {
      name: "cave_fantasy_stable",
      position: stable.position,
      groundMeshes,
      targetHeight: stable.targetHeight,
      rotationY: stable.rotationY,
    });
  }

  async #createWorldVillageObjects(groundMeshes: AbstractMesh[]) {
    const witchObject = await this.#loadSceneObject(NPC_URLS.witch, {
      name: "witch_npc",
      position: WORLD_VILLAGE_HUB.witch,
      groundMeshes,
      targetHeight: GAME_SETTINGS.witch.targetHeight,
      rotationY: Math.PI,
    });
    this.#witch = {
      ...witchObject,
      idleAnimation: findAnimationBySuffix(witchObject.container.animationGroups, [
        "Idle_Neutral",
      ]),
      waveAnimation: findAnimationBySuffix(witchObject.container.animationGroups, ["Wave"]),
      waveTimer: WITCH_WAVE_INTERVAL_SECONDS,
    };
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

  async #createDarkStageObjects(groundMeshes: AbstractMesh[]) {
    const bookSettings = GAME_SETTINGS.darkStageProps.evilBook;
    const book = await this.#loadSceneObject(PROP_URLS.evilBook, {
      name: "dark_stage_evil_book",
      position: bookSettings.position,
      groundMeshes,
      targetHeight: bookSettings.targetHeight,
      rotationY: bookSettings.rotationY,
    });

    book.root.position.y += bookSettings.hoverHeight;

    this.#floatingSceneObjects.push({
      ...book,
      baseY: book.root.position.y,
      elapsed: 0,
      floatAmplitude: bookSettings.floatAmplitude,
      floatSpeed: bookSettings.floatSpeed,
      particleSystem: createEvilBookGlow(this.#scene, book.root, bookSettings.glow),
    });
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
      getGroundedPosition: this.#getGroundedPosition,
    });
    this.#activeSceneObjects.push(object);
    return object;
  }

  #updateFloatingSceneObjects(dt: number) {
    for (const object of this.#floatingSceneObjects) {
      object.elapsed += dt;
      object.root.position.y =
        object.baseY + Math.sin(object.elapsed * object.floatSpeed) * object.floatAmplitude;
    }
  }

  #updatePatrolNpcs(dt: number, groundMeshes: AbstractMesh[]) {
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

      const ground = this.#pickGroundAt(npc.root.position, groundMeshes);
      if (ground) {
        npc.root.position.y = ground.y + npc.groundOffsetY;
      }

      if (npc.walkAnimation && !npc.walkAnimation.isPlaying) {
        playSceneObjectAnimation(npc, npc.walkAnimation, true);
      }
    }
  }

  #updateWitch(dt: number, player: CombatActor | null) {
    const witch = this.#witch;
    if (!witch) {
      return;
    }

    this.#updateWitchManaRestore(dt, witch, player);

    witch.waveTimer = Math.max(0, witch.waveTimer - dt);

    if (witch.waveTimer === 0) {
      witch.waveTimer = WITCH_WAVE_INTERVAL_SECONDS;
      this.#playWitchWave();
    }
  }

  #updateWitchManaRestore(dt: number, witch: WitchNpc, player: CombatActor | null) {
    this.#witchManaRestoreCooldown = Math.max(0, this.#witchManaRestoreCooldown - dt);

    if (!player || player.isDead || this.#witchManaRestoreCooldown > 0) {
      return;
    }

    if (player.stats.mana >= player.stats.maxMana) {
      return;
    }

    const playerPosition = player.root.position;
    const witchPosition = witch.root.position;
    const dx = playerPosition.x - witchPosition.x;
    const dz = playerPosition.z - witchPosition.z;

    if (dx * dx + dz * dz > WITCH_MANA_RESTORE_RADIUS * WITCH_MANA_RESTORE_RADIUS) {
      return;
    }

    player.restoreManaToFull();
    this.#witchManaRestoreCooldown = WITCH_MANA_RESTORE_COOLDOWN_SECONDS;
    this.#onStatusText("Mana restored by Witch");
    this.#onHudChanged();
  }

  #updatePotionPickups(dt: number, player: CombatActor | null) {
    if (!player || player.isDead) {
      return;
    }

    const playerPosition = player.root.position;

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
        player.restoreHealthToFull();
        this.#onStatusText("Health restored");
      } else {
        player.restoreManaToFull();
        this.#onStatusText("Mana restored");
      }

      pickup.cooldownLeft = POTION_PICKUP_COOLDOWN_SECONDS;
      this.#onHudChanged();
    }
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

  dispose() {
    for (const object of this.#floatingSceneObjects) {
      object.particleSystem?.dispose();
    }
    this.#floatingSceneObjects = [];

    for (const object of this.#activeSceneObjects) {
      object.container.dispose();
      object.root.dispose();
    }
    this.#activeSceneObjects = [];
    this.#patrolNpcs = [];
    this.#witch = null;
    this.#potionPickups = [];
    this.#witchManaRestoreCooldown = 0;
  }
}

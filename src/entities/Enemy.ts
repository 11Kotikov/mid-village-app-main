import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder, type Mesh } from "@babylonjs/core/Meshes";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

import { getHierarchyHeight } from "../assets/measure";

export type CombatStats = {
  maxHealth: number;
  health: number;
  maxMana: number;
  mana: number;
  attackDamage: number;
  attackRange: number;
};

type CombatStatsOptions = Partial<Omit<CombatStats, "health" | "mana">> & {
  health?: number;
  mana?: number;
};

type RespawnOptions = {
  health?: number;
  mana?: number;
};

const DEFAULT_DEATH_DESPAWN_SECONDS = 3.5;

export class Enemy {
  #root: TransformNode;
  #animationGroups: AnimationGroup[];
  #baseScaling: Vector3;
  #groundOffsetY: number;
  #activeAnimationName: string | null;
  #stats: CombatStats;
  #respawnStats: CombatStats;
  #hitbox: Mesh;
  #hitboxHeight: number;
  #dead: boolean;
  #deathDespawnTimer: number | null;

  constructor(root: TransformNode, animationGroups: AnimationGroup[]) {
    this.#root = root;
    this.#animationGroups = animationGroups;
    this.#baseScaling = root.scaling.clone();
    this.#groundOffsetY = 0;
    this.#activeAnimationName = null;
    this.#stats = {
      maxHealth: 100,
      health: 100,
      maxMana: 40,
      mana: 40,
      attackDamage: 10,
      attackRange: 2.1,
    };
    this.#respawnStats = { ...this.#stats };
    this.#dead = false;
    this.#deathDespawnTimer = null;

    this.#hitboxHeight = Math.max(1.4, getHierarchyHeight(root));
    const hitboxWidth = Math.max(0.7, this.#hitboxHeight * 0.42);
    this.#hitbox = MeshBuilder.CreateBox(
      `${root.name}_combat_hitbox`,
      {
        width: hitboxWidth,
        height: this.#hitboxHeight,
        depth: hitboxWidth,
      },
      root.getScene()
    );
    this.#hitbox.isPickable = true;
    this.#hitbox.checkCollisions = true;
    this.#hitbox.visibility = 0.001;
    this.#hitbox.metadata = {
      combatant: this,
      kind: "combat-hitbox",
    };

    const material = new StandardMaterial(`${root.name}_combat_hitbox_mat`, root.getScene());
    material.diffuseColor = Color3.Red();
    material.alpha = 0;
    this.#hitbox.material = material;

    this.updateHitbox();
  }

  get root(): TransformNode {
    return this.#root;
  }

  get groundOffsetY(): number {
    return this.#groundOffsetY;
  }

  get stats(): CombatStats {
    return this.#stats;
  }

  get hitbox(): Mesh {
    return this.#hitbox;
  }

  get isDead(): boolean {
    return this.#dead;
  }

  setGroundOffsetY(value: number) {
    this.#groundOffsetY = value;
  }

  configureStats(options: CombatStatsOptions) {
    const maxHealth = options.maxHealth ?? this.#stats.maxHealth;
    const maxMana = options.maxMana ?? this.#stats.maxMana;

    this.#stats = {
      maxHealth,
      health: Math.min(options.health ?? maxHealth, maxHealth),
      maxMana,
      mana: Math.min(options.mana ?? maxMana, maxMana),
      attackDamage: options.attackDamage ?? this.#stats.attackDamage,
      attackRange: options.attackRange ?? this.#stats.attackRange,
    };
    this.#respawnStats = {
      ...this.#stats,
      health: maxHealth,
      mana: maxMana,
    };

    this.#dead = this.#stats.health <= 0;
    this.#deathDespawnTimer = null;
    this.#root.setEnabled(!this.#dead);
    this.#hitbox.setEnabled(!this.#dead);
  }

  takeDamage(amount: number): boolean {
    if (this.#dead || amount <= 0) {
      return false;
    }

    this.#stats.health = Math.max(0, this.#stats.health - amount);

    if (this.#stats.health === 0) {
      this.#die();
      return true;
    }

    return false;
  }

  spendMana(amount: number): boolean {
    if (amount <= 0) {
      return true;
    }

    if (this.#stats.mana < amount) {
      return false;
    }

    this.#stats.mana -= amount;
    return true;
  }

  restoreMana(amount: number) {
    if (amount <= 0 || this.#dead) {
      return;
    }

    this.#stats.mana = Math.min(this.#stats.maxMana, this.#stats.mana + amount);
  }

  restoreHealthToFull() {
    if (this.#dead) {
      return;
    }

    this.#stats.health = this.#stats.maxHealth;
  }

  restoreManaToFull() {
    if (this.#dead) {
      return;
    }

    this.#stats.mana = this.#stats.maxMana;
  }

  respawn(position: Vector3, options: RespawnOptions = {}) {
    this.#stats = { ...this.#respawnStats };
    this.#stats.health = Math.min(options.health ?? this.#stats.health, this.#stats.maxHealth);
    this.#stats.mana = Math.min(options.mana ?? this.#stats.mana, this.#stats.maxMana);
    this.#dead = false;
    this.#deathDespawnTimer = null;
    this.#activeAnimationName = null;
    this.#resetScale();
    this.#resetAnimations();
    this.#root.position.copyFrom(position);
    this.#root.setEnabled(true);
    this.#hitbox.setEnabled(true);
    this.updateHitbox();

    if (!this.playIdle(true)) {
      this.playWalk(true);
    }
  }

  distanceTo(other: Enemy): number {
    return Vector3.Distance(this.#root.position, other.root.position);
  }

  updateHitbox() {
    this.#hitbox.position.set(
      this.#root.position.x,
      this.#root.position.y + this.#hitboxHeight * 0.5,
      this.#root.position.z
    );
  }

  playOnlyBySuffix(suffix: string, loop = true): boolean {
    const needle = suffix.toLowerCase();

    let selected: AnimationGroup | null = null;

    for (const g of this.#animationGroups) {
      const raw = (g.name ?? "").toLowerCase();
      const tail = raw.split("|").pop() ?? raw;

      if (tail === needle || raw.endsWith(`|${needle}`) || raw.endsWith(needle)) {
        selected = g;
        break;
      }
    }

    if (!selected) return false;

    if (this.#activeAnimationName === selected.name && loop) {
      return true;
    }

    for (const g of this.#animationGroups) {
      if (g === selected) {
        continue;
      }

      g.stop();
      g.reset();
    }

    selected.reset();
    selected.start(loop);
    this.#activeAnimationName = selected.name;
    return true;
  }

  playWalk(loop = true): boolean {
    return this.playOnlyBySuffix("Walk", loop);
  }

  playRun(loop = true): boolean {
    return (
      this.playOnlyBySuffix("Run", loop) ||
      this.playOnlyBySuffix("Running", loop) ||
      this.playOnlyBySuffix("Sprint", loop)
    );
  }

  playIdle(loop = true): boolean {
    return this.playOnlyBySuffix("Idle", loop);
  }

  playAttack(loop = false): boolean {
    return (
      this.playOnlyBySuffix("Attack", loop) ||
      this.playOnlyBySuffix("Punch", loop) ||
      this.playOnlyBySuffix("Weapon", loop) ||
      this.playOnlyBySuffix("Slash", loop) ||
      this.playOnlyBySuffix("Melee", loop) ||
      this.playWalk(false)
    );
  }

  playDeath(loop = false): boolean {
    return (
      this.playOnlyBySuffix("Death", loop) ||
      this.playOnlyBySuffix("Die", loop) ||
      this.playOnlyBySuffix("Dead", loop)
    );
  }

  playAll(loop = true) {
    this.#activeAnimationName = null;

    for (const g of this.#animationGroups) {
      g.start(loop);
    }
  }

  update(dt: number) {
    if (this.#dead) {
      if (this.#deathDespawnTimer != null) {
        this.#deathDespawnTimer = Math.max(0, this.#deathDespawnTimer - dt);

        if (this.#deathDespawnTimer === 0) {
          this.#deathDespawnTimer = null;
          this.#root.setEnabled(false);
        }
      }

      return;
    }

    this.updateHitbox();
  }

  dispose() {
    this.#activeAnimationName = null;

    for (const g of this.#animationGroups) {
      g.stop();
      g.dispose();
    }

    this.#hitbox.dispose(false, true);
    this.#root.dispose();
  }

  #die() {
    this.#dead = true;
    this.#activeAnimationName = null;
    this.#resetScale();
    this.#hitbox.setEnabled(false);

    if (this.playDeath(false)) {
      this.#deathDespawnTimer = DEFAULT_DEATH_DESPAWN_SECONDS;
      return;
    }

    this.#root.setEnabled(false);
  }

  #resetScale() {
    this.#root.scaling.copyFrom(this.#baseScaling);
  }

  #resetAnimations() {
    for (const g of this.#animationGroups) {
      g.stop();
      g.reset();
    }
  }
}

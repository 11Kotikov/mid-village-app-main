import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

export type ActorAnimationAction = "idle" | "walk" | "run" | "attack" | "death";

export type ActorAnimationSet = Partial<Record<ActorAnimationAction, readonly string[]>>;

const DEFAULT_ANIMATIONS = {
  idle: ["Idle"],
  walk: ["Walk"],
  run: ["Run", "Running", "Sprint"],
  attack: ["Attack", "Punch", "Weapon", "Sword", "Slash", "Melee"],
  death: ["Death", "Die", "Dead"],
} satisfies Record<ActorAnimationAction, readonly string[]>;

export class AnimationController {
  #animationGroups: AnimationGroup[];
  #animations: ActorAnimationSet;
  #activeAnimationName: string | null = null;

  constructor(animationGroups: AnimationGroup[], animations: ActorAnimationSet = {}) {
    this.#animationGroups = animationGroups;
    this.#animations = animations;
  }

  playOnlyBySuffix(suffix: string, loop = true): boolean {
    return this.#playAnimationByNames([suffix], loop);
  }

  playWalk(loop = true): boolean {
    return this.#playAction("walk", loop);
  }

  playRun(loop = true): boolean {
    return this.#playAction("run", loop);
  }

  playIdle(loop = true): boolean {
    return this.#playAction("idle", loop);
  }

  playAttack(loop = false): boolean {
    return this.#playAction("attack", loop) || this.playWalk(false);
  }

  playDeath(loop = false): boolean {
    return this.#playAction("death", loop);
  }

  playAll(loop = true) {
    this.#activeAnimationName = null;

    for (const group of this.#animationGroups) {
      group.start(loop);
    }
  }

  reset() {
    this.#activeAnimationName = null;

    for (const group of this.#animationGroups) {
      group.stop();
      group.reset();
    }
  }

  dispose() {
    this.#activeAnimationName = null;

    for (const group of this.#animationGroups) {
      group.stop();
      group.dispose();
    }
  }

  clearActiveAnimation() {
    this.#activeAnimationName = null;
  }

  #playAction(action: ActorAnimationAction, loop = true): boolean {
    const names = [...(this.#animations[action] ?? []), ...DEFAULT_ANIMATIONS[action]];
    return this.#playAnimationByNames(names, loop);
  }

  #playAnimationByNames(names: readonly string[], loop = true): boolean {
    let selected: AnimationGroup | null = null;
    let selectedScore = 0;

    for (const group of this.#animationGroups) {
      for (const name of names) {
        const score = this.#scoreAnimationMatch(group.name ?? "", name);

        if (score > selectedScore) {
          selected = group;
          selectedScore = score;
        }
      }
    }

    if (!selected) {
      return false;
    }

    if (this.#activeAnimationName === selected.name && loop) {
      return true;
    }

    for (const group of this.#animationGroups) {
      if (group === selected) {
        continue;
      }

      group.stop();
      group.reset();
    }

    selected.reset();
    selected.start(loop);
    this.#activeAnimationName = selected.name;
    return true;
  }

  #scoreAnimationMatch(rawName: string, expectedName: string): number {
    const raw = rawName.toLowerCase();
    const needle = expectedName.toLowerCase();
    const parts = raw.split("|").map((part) => part.trim()).filter(Boolean);
    const tail = parts.at(-1) ?? raw;

    if (raw === needle || tail === needle) {
      return 120;
    }

    if (raw.endsWith(`|${needle}`) || raw.endsWith(needle)) {
      return 100;
    }

    if (parts.some((part) => part === needle)) {
      return 90;
    }

    const rawTokens = raw.split(/[\s_|.:-]+/).filter(Boolean);
    const expectedTokens = needle.split(/[\s_|.:-]+/).filter(Boolean);

    if (expectedTokens.length > 0 && this.#containsTokenSequence(rawTokens, expectedTokens)) {
      return 80;
    }

    if (raw.includes(`|${needle}|`) || raw.includes(`|${needle}`)) {
      return 70;
    }

    if (raw.includes(needle)) {
      return 50;
    }

    return 0;
  }

  #containsTokenSequence(tokens: string[], expected: string[]): boolean {
    if (expected.length > tokens.length) {
      return false;
    }

    for (let i = 0; i <= tokens.length - expected.length; i += 1) {
      let matches = true;

      for (let j = 0; j < expected.length; j += 1) {
        if (tokens[i + j] !== expected[j]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return true;
      }
    }

    return false;
  }
}

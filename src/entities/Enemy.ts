import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

export class Enemy {
  #root: TransformNode;
  #animationGroups: AnimationGroup[];
  #groundOffsetY: number;
  #activeAnimationName: string | null;

  constructor(root: TransformNode, animationGroups: AnimationGroup[]) {
    this.#root = root;
    this.#animationGroups = animationGroups;
    this.#groundOffsetY = 0;
    this.#activeAnimationName = null;
  }

  get root(): TransformNode {
    return this.#root;
  }

  get groundOffsetY(): number {
    return this.#groundOffsetY;
  }

  setGroundOffsetY(value: number) {
    this.#groundOffsetY = value;
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

    if (this.#activeAnimationName === selected.name) {
      return true;
    }

    for (const g of this.#animationGroups) {
      g.stop();
    }

    selected.start(loop);
    this.#activeAnimationName = selected.name;
    return true;
  }

  playWalk(loop = true): boolean {
    return this.playOnlyBySuffix("Walk", loop);
  }

  playIdle(loop = true): boolean {
    return this.playOnlyBySuffix("Idle", loop);
  }

  playAll(loop = true) {
    this.#activeAnimationName = null;

    for (const g of this.#animationGroups) {
      g.start(loop);
    }
  }

  update(_dt: number) {
    // место для будущей локальной логики врага
  }

  dispose() {
    this.#activeAnimationName = null;

    for (const g of this.#animationGroups) {
      g.stop();
      g.dispose();
    }

    this.#root.dispose();
  }
}

import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

export class Enemy {
  #root: TransformNode;
  #animationGroups: AnimationGroup[];
  #groundOffsetY: number;

  constructor(root: TransformNode, animationGroups: AnimationGroup[]) {
    this.#root = root;
    this.#animationGroups = animationGroups;
    this.#groundOffsetY = 0;
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

    for (const g of this.#animationGroups) {
      g.stop();
    }

    if (!selected) return false;

    selected.start(loop);
    return true;
  }

  playAll(loop = true) {
    for (const g of this.#animationGroups) {
      g.start(loop);
    }
  }

  update(_dt: number) {
    // место для будущей локальной логики врага
  }

  dispose() {
    for (const g of this.#animationGroups) {
      g.stop();
      g.dispose();
    }

    this.#root.dispose();
  }
}
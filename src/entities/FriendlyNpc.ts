import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

import {
  AnimationController,
  type ActorAnimationSet,
} from "./animation/AnimationController";

export class FriendlyNpc {
  #root: TransformNode;
  #animations: AnimationController;

  constructor(
    root: TransformNode,
    animationGroups: AnimationGroup[],
    animations: ActorAnimationSet = {}
  ) {
    this.#root = root;
    this.#animations = new AnimationController(animationGroups, animations);
  }

  get root(): TransformNode {
    return this.#root;
  }

  playOnlyBySuffix(suffix: string, loop = true): boolean {
    return this.#animations.playOnlyBySuffix(suffix, loop);
  }

  playIdle(loop = true): boolean {
    return this.#animations.playIdle(loop);
  }

  resetAnimations() {
    this.#animations.reset();
  }

  dispose() {
    this.#animations.dispose();
    this.#root.dispose();
  }
}

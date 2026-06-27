import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import {
  AnimationController,
  type ActorAnimationSet,
} from "./animation/AnimationController";

export class AnimatedActor {
  #root: TransformNode;
  #animations: AnimationController;
  #baseScaling: Vector3;

  constructor(
    root: TransformNode,
    animationGroups: AnimationGroup[],
    animations: ActorAnimationSet = {}
  ) {
    this.#root = root;
    this.#animations = new AnimationController(animationGroups, animations);
    this.#baseScaling = root.scaling.clone();
  }

  get root(): TransformNode {
    return this.#root;
  }

  playOnlyBySuffix(suffix: string, loop = true): boolean {
    return this.#animations.playOnlyBySuffix(suffix, loop);
  }

  playOnceBySuffix(suffix: string, onEnded?: () => void): boolean {
    return this.#animations.playOnceBySuffix(suffix, onEnded);
  }

  playWalk(loop = true): boolean {
    return this.#animations.playWalk(loop);
  }

  playRun(loop = true): boolean {
    return this.#animations.playRun(loop);
  }

  playIdle(loop = true): boolean {
    return this.#animations.playIdle(loop);
  }

  playAttack(loop = false): boolean {
    return this.#animations.playAttack(loop);
  }

  playDeath(loop = false): boolean {
    return this.#animations.playDeath(loop);
  }

  playAll(loop = true) {
    this.#animations.playAll(loop);
  }

  resetAnimations() {
    this.#animations.reset();
  }

  clearActiveAnimation() {
    this.#animations.clearActiveAnimation();
  }

  resetScale() {
    this.#root.scaling.copyFrom(this.#baseScaling);
  }

  disposeAnimationState() {
    this.#animations.dispose();
  }

  disposeRoot() {
    this.#root.dispose();
  }
}

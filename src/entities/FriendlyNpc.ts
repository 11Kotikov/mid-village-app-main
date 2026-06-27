import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

import {
  AnimationController,
  type ActorAnimationSet,
} from "./animation/AnimationController";

export class FriendlyNpc {
  #container: AssetContainer;
  #root: TransformNode;
  #animations: AnimationController;

  constructor(
    container: AssetContainer,
    root: TransformNode,
    animationGroups: AnimationGroup[],
    animations: ActorAnimationSet = {}
  ) {
    this.#container = container;
    this.#root = root;
    this.#animations = new AnimationController(animationGroups, animations);
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

  playIdle(loop = true): boolean {
    return this.#animations.playIdle(loop);
  }

  playWalk(loop = true): boolean {
    return this.#animations.playWalk(loop);
  }

  playRun(loop = true): boolean {
    return this.#animations.playRun(loop);
  }

  resetAnimations() {
    this.#animations.reset();
  }

  dispose() {
    this.#animations.dispose();
    this.#container.dispose();
    this.#root.dispose();
  }
}

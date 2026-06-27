import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

import { AnimatedActor } from "./AnimatedActor";
import type { ActorAnimationSet } from "./animation/AnimationController";

export class FriendlyNpc extends AnimatedActor {
  #container: AssetContainer;

  constructor(
    container: AssetContainer,
    root: TransformNode,
    animationGroups: AnimationGroup[],
    animations: ActorAnimationSet = {}
  ) {
    super(root, animationGroups, animations);
    this.#container = container;
  }

  dispose() {
    this.disposeAnimationState();
    this.#container.dispose();
    this.disposeRoot();
  }
}

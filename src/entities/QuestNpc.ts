import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

import { FriendlyNpc } from "./FriendlyNpc";
import type { ActorAnimationSet } from "./animation/AnimationController";

export type QuestNpcOptions = {
  questId: string;
  interactionRadius?: number;
};

export class QuestNpc extends FriendlyNpc {
  readonly questId: string;
  readonly interactionRadius: number;

  constructor(
    container: AssetContainer,
    root: TransformNode,
    animationGroups: AnimationGroup[],
    animations: ActorAnimationSet = {},
    options: QuestNpcOptions
  ) {
    super(container, root, animationGroups, animations);
    this.questId = options.questId;
    this.interactionRadius = options.interactionRadius ?? 2;
  }
}

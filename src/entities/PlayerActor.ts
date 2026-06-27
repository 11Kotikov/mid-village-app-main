import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

import {
  CombatActor,
  type ActorAnimationSet,
} from "./CombatActor";

export class PlayerActor extends CombatActor {
  constructor(
    root: TransformNode,
    animationGroups: AnimationGroup[],
    animations: ActorAnimationSet = {}
  ) {
    super(root, animationGroups, animations);
  }
}

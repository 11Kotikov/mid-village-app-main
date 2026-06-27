import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

import {
  CombatActor,
  type ActorAnimationSet,
} from "./CombatActor";

export class EnemyActor extends CombatActor {
  constructor(
    root: TransformNode,
    animationGroups: AnimationGroup[],
    animations: ActorAnimationSet = {}
  ) {
    super(root, animationGroups, animations);
  }
}

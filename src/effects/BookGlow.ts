import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import type { Scene } from "@babylonjs/core/scene";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import { PARTICLES_URLS } from "../assets/paths";

export type EvilBookGlowOptions = {
  capacity: number;
  emitRate: number;
  minLifeTime: number;
  maxLifeTime: number;
  minSize: number;
  maxSize: number;
  minEmitPower: number;
  maxEmitPower: number;
  minEmitBox: Vector3;
  maxEmitBox: Vector3;
  color1: Color4;
  color2: Color4;
  colorDead: Color4;
};

export function createEvilBookGlow(
  scene: Scene,
  emitter: TransformNode,
  options: EvilBookGlowOptions
): ParticleSystem {
  const particles = new ParticleSystem("evilBookGlow", options.capacity, scene);
  const emitterMesh = MeshBuilder.CreateBox("evilBookGlowEmitter", { size: 0.1 }, scene);

  emitterMesh.visibility = 0;
  emitterMesh.parent = emitter;
  emitterMesh.position = Vector3.Zero();

  particles.particleTexture = new Texture(PARTICLES_URLS.portal, scene);
  particles.emitter = emitterMesh;
  particles.minEmitBox = options.minEmitBox;
  particles.maxEmitBox = options.maxEmitBox;
  particles.direction1 = new Vector3(-0.15, 0.25, -0.15);
  particles.direction2 = new Vector3(0.15, 0.45, 0.15);
  particles.color1 = options.color1;
  particles.color2 = options.color2;
  particles.colorDead = options.colorDead;
  particles.minSize = options.minSize;
  particles.maxSize = options.maxSize;
  particles.minLifeTime = options.minLifeTime;
  particles.maxLifeTime = options.maxLifeTime;
  particles.emitRate = options.emitRate;
  particles.blendMode = ParticleSystem.BLENDMODE_ADD;
  particles.gravity = new Vector3(0, 0.02, 0);
  particles.minEmitPower = options.minEmitPower;
  particles.maxEmitPower = options.maxEmitPower;
  particles.updateSpeed = 0.012;
  particles.isBillboardBased = true;

  particles.start();
  return particles;
}

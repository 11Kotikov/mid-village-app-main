import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

import { PARTICLES_URLS } from "../assets/paths";

export function createFireballParticleSystem(scene: Scene, position: Vector3): ParticleSystem {
  const particleSystem = new ParticleSystem("player_fireball", 220, scene);
  particleSystem.particleTexture = new Texture(PARTICLES_URLS.fireBall, scene);
  particleSystem.emitter = position;
  particleSystem.minEmitBox.set(-0.08, -0.08, -0.08);
  particleSystem.maxEmitBox.set(0.08, 0.08, 0.08);
  particleSystem.color1 = new Color4(1, 0.45, 0.05, 1);
  particleSystem.color2 = new Color4(1, 0.05, 0.01, 1);
  particleSystem.colorDead = new Color4(0.2, 0.02, 0, 0);
  particleSystem.minSize = 0.35;
  particleSystem.maxSize = 0.8;
  particleSystem.minLifeTime = 0.12;
  particleSystem.maxLifeTime = 0.35;
  particleSystem.emitRate = 380;
  particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
  particleSystem.gravity = Vector3.Zero();
  particleSystem.direction1 = new Vector3(-0.25, -0.1, -0.25);
  particleSystem.direction2 = new Vector3(0.25, 0.1, 0.25);
  particleSystem.minEmitPower = 0.2;
  particleSystem.maxEmitPower = 1.1;
  particleSystem.updateSpeed = 0.01;
  particleSystem.start();
  return particleSystem;
}

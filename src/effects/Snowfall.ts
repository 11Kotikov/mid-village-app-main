import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

import { GAME_SETTINGS } from "../config/gameSettings";
import { PARTICLES_URLS } from "../assets/paths";

export function createSnowTerrainSnowfall(scene: Scene): ParticleSystem {
  const weather = GAME_SETTINGS.snowTerrainWeather;
  const snowfall = new ParticleSystem("snow_terrain_snowfall", weather.capacity, scene);

  snowfall.particleTexture = new Texture(PARTICLES_URLS.snow, scene);
  snowfall.emitter = Vector3.Zero();
  snowfall.minEmitBox = weather.minEmitBox;
  snowfall.maxEmitBox = weather.maxEmitBox;
  snowfall.color1 = new Color4(1, 1, 1, 0.95);
  snowfall.color2 = new Color4(0.82, 0.9, 1, 0.75);
  snowfall.colorDead = new Color4(1, 1, 1, 0);
  snowfall.minSize = weather.minSize;
  snowfall.maxSize = weather.maxSize;
  snowfall.minLifeTime = weather.minLifeTime;
  snowfall.maxLifeTime = weather.maxLifeTime;
  snowfall.emitRate = weather.emitRate;
  snowfall.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  snowfall.gravity = weather.gravity;
  snowfall.direction1 = weather.direction1;
  snowfall.direction2 = weather.direction2;
  snowfall.minEmitPower = weather.minEmitPower;
  snowfall.maxEmitPower = weather.maxEmitPower;
  snowfall.updateSpeed = weather.updateSpeed;
  snowfall.start();

  return snowfall;
}

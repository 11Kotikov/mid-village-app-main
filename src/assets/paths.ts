export const LEVEL_URLS = {
  Blocks_Trailer_Map: "/models/environmental/Blocks_Trailer_Map.glb",
  Cave_Scene_Draft: "/models/environmental/Cave_Scene_Draft.glb",
  Snow_Terrain: "/models/environmental/Snow_Terrain.glb",
  Walk_in_the_Woods: "/models/environmental/Walk_in_the_Woods.glb",
  Warefall: "/models/environmental/Warefall.glb",
  World_Village: "/models/environmental/World_Village.glb",
} as const;

export type LevelKey = keyof typeof LEVEL_URLS;

export const CURRENT_LEVEL_KEY: LevelKey = "Walk_in_the_Woods";

export const ENEMY_URLS = {
  goblin: "/models/enemies/Goblin.glb",
  orc: "/models/enemies/Orc.glb",
} as const;

export const PLAYER_URLS = {
  hoodedAdventurer: "/models/player/Hooded_Adventurer.glb",
} as const;

export const AUDIO_URLS = {
  ambienceForest: "/audio/forest.mp3",
} as const;

export const PARTICLES_URLS = {
  portal: "/particles/flare3_portal.png",
} as const;

export const SKYBOX_URLS = {
  skybox: "/textures/skybox/skybox",
} as const;

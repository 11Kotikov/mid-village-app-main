import { GAME_SETTINGS } from "../config/gameSettings";

export const LEVEL_URLS = {
  Blocks_Trailer_Map: "/models/environmental/Blocks_Trailer_Map.glb",
  Cave_Scene_Draft: "/models/environmental/Cave_Scene_Draft.glb",
  Snow_Terrain: "/models/environmental/Snow_Terrain.glb",
  Walk_in_the_Woods: "/models/environmental/Walk_in_the_Woods.glb",
  Warefall: "/models/environmental/Warefall.glb",
  World_Village: "/models/environmental/World_Village.glb",
} as const;

export type LevelKey = keyof typeof LEVEL_URLS;

export const CURRENT_LEVEL_KEY: LevelKey = GAME_SETTINGS.startLevel;

export const ENEMY_URLS = {
  goblin: GAME_SETTINGS.enemyModels.goblin.url,
  orc: GAME_SETTINGS.enemyModels.orc.url,
} as const;

export const PLAYER_URLS = {
  hoodedAdventurer: "/models/player/Hooded_Adventurer.glb",
} as const;

export const NPC_URLS = {
  witch: "/models/npc/Witch.glb",
} as const;

export const POTION_URLS = {
  health: "/models/potions/Health_Potion.glb",
  mana: "/models/potions/Mana_Potion.glb",
} as const;

export const PROP_URLS = {
  magicCauldron: "/models/stuff/Magic_Cauldron.glb",
} as const;

export const AUDIO_URLS = {
  ambienceForest: "/audio/forest.mp3",
  ambienceVillage: "/audio/village.wav",
} as const;

export const PARTICLES_URLS = {
  portal: "/particles/flare3_portal.png",
  fireBall: "/particles/fire_ball.jpg",
} as const;

export const SKYBOX_URLS = {
  skybox: "/textures/skybox/skybox",
} as const;

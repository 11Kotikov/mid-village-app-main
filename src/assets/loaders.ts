import type { Scene } from "@babylonjs/core/scene";
import {
  AppendSceneAsync,
  LoadAssetContainerAsync,
} from "@babylonjs/core/Loading/sceneLoader";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";

registerBuiltInLoaders();

export async function appendGLBToScene(scene: Scene, url: string) {
  await AppendSceneAsync(url, scene);
}

export async function loadGLBAsContainer(scene: Scene, url: string) {
  return await LoadAssetContainerAsync(url, scene);
}
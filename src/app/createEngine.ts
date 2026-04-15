import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/core/Shaders/postprocess.vertex";
import "@babylonjs/core/Shaders/rgbdDecode.fragment";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

import { Engine } from "@babylonjs/core/Engines/engine";

export function createEngine(canvas: HTMLCanvasElement) {
  return new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
  });
}
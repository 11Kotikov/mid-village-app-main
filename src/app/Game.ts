import type { Engine } from "@babylonjs/core/Engines/engine";
import { createEngine } from "./createEngine";
import { GameScene } from "../scenes/GameScene";

export class Game {
  #engine: Engine;
  #gameScene: GameScene;
  #canvas: HTMLCanvasElement;

  #renderLoop: (() => void) | null;
  #onResize: (() => void) | null;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#engine = createEngine(canvas);
    this.#gameScene = new GameScene(this.#engine, this.#canvas);

    this.#renderLoop = null;
    this.#onResize = null;
  }

  async start() {
    await this.#gameScene.init();

    this.#renderLoop = () => {
      const dt = this.#engine.getDeltaTime() / 1000;
      this.#gameScene.update(dt);
      this.#gameScene.scene.render();
    };

    this.#engine.runRenderLoop(this.#renderLoop);

    this.#onResize = () => this.#engine.resize();
    window.addEventListener("resize", this.#onResize);
  }

  async restart() {
    this.#gameScene.dispose();
    this.#gameScene = new GameScene(this.#engine, this.#canvas);
    await this.#gameScene.init();
  }

  dispose({ disposeEngine = false } = {}) {
    if (this.#renderLoop) {
      this.#engine.stopRenderLoop(this.#renderLoop);
      this.#renderLoop = null;
    }

    if (this.#onResize) {
      window.removeEventListener("resize", this.#onResize);
      this.#onResize = null;
    }

    this.#gameScene.dispose();

    if (disposeEngine) {
      this.#engine.dispose();
    }
  }
}
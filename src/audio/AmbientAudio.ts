import { CreateAudioEngineAsync } from "@babylonjs/core";
import type { AudioEngineV2 } from "@babylonjs/core";
import type { StaticSound } from "@babylonjs/core";

export class AmbientAudio {
  #audioEngine: AudioEngineV2 | null;
  #forestSound: StaticSound | null;
  #unlockHandler: (() => void) | null;

  constructor() {
    this.#audioEngine = null;
    this.#forestSound = null;
    this.#unlockHandler = null;
  }

  async init(ambienceUrl: string) {
    this.dispose();

    try {
      const audioEngine = await CreateAudioEngineAsync({ volume: 0.5 });
      const forestSound = await audioEngine.createSoundAsync("forest_sound", ambienceUrl, {
        loop: true,
        autoplay: true,
      });

      this.#audioEngine = audioEngine;
      this.#forestSound = forestSound;

      await this.#armUnlockAndPlay();
    } catch (error) {
      this.dispose();
      console.warn("Аудио не найдено или не загрузилось", error);
    }
  }

  dispose() {
    this.#removeUnlockHandlers();

    this.#forestSound?.stop();
    this.#forestSound?.dispose();
    this.#forestSound = null;

    this.#audioEngine?.dispose();
    this.#audioEngine = null;
  }

  async #armUnlockAndPlay() {
    const start = async () => {
      const audioEngine = this.#audioEngine;
      const forestSound = this.#forestSound;

      if (!audioEngine || !forestSound) return;

      try {
        await audioEngine.unlockAsync();
        await audioEngine.resumeAsync();
        forestSound.play();
      } catch (error) {
        console.warn("Звук не запустился", error);
      }

      this.#removeUnlockHandlers();
    };

    this.#unlockHandler = () => {
      void start();
    };

    window.addEventListener("pointerdown", this.#unlockHandler, { once: true });
    window.addEventListener("keydown", this.#unlockHandler, { once: true });

    if (this.#audioEngine?.state === "running") {
      await start();
    }
  }

  #removeUnlockHandlers() {
    if (!this.#unlockHandler) return;

    window.removeEventListener("pointerdown", this.#unlockHandler);
    window.removeEventListener("keydown", this.#unlockHandler);
    this.#unlockHandler = null;
  }
}

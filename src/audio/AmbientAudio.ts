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
        try {
            this.#audioEngine = await CreateAudioEngineAsync({ volume: 0.5 });
            this.#forestSound = await this.#audioEngine.createSoundAsync("forest_sound", ambienceUrl, {
                loop: true,
                autoplay: true,
            });

            await this.#armUnlockAndPlay();

        } catch (error) {
            console.warn("Аудио не найдено или не загрузилось", error);
        }

    }

    dispose() {

    }

    async #armUnlockAndPlay() {

        const start = async () => {
            if (!this.#audioEngine || !this.#forestSound) return;

            try {
                await this.#audioEngine.unlockAsync();
                await this.#audioEngine.resumeAsync();
                this.#forestSound.play();
            } catch (error) {
                console.warn("звук не запустился (((", error);
            }

            if (this.#unlockHandler) {
                window.removeEventListener("pointerdown", this.#unlockHandler);
                window.removeEventListener("keydown", this.#unlockHandler);
                this.#unlockHandler = null;
            }
        }
        this.#unlockHandler = () => {
            void start();
        }

        window.addEventListener("pointerdown", this.#unlockHandler, {once: true});
        window.addEventListener("keydown", this.#unlockHandler, {once: true});

        const engine = this.#audioEngine;
        if (engine?.state === "running") {
            await start ();
        }
    }
}
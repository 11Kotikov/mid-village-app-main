import type { EnemyActor } from "../entities/EnemyActor";
import type { PlayerActor } from "../entities/PlayerActor";

type HudBar = {
  root: HTMLDivElement;
  fill: HTMLDivElement;
};

type HudUpdateOptions = {
  player: PlayerActor | null;
  target: EnemyActor | null;
  playerRespawnTimeLeft: number | null;
  isRespawningPlayer: boolean;
};

export class GameHud {
  #root: HTMLDivElement;
  #healthFill: HTMLDivElement;
  #manaFill: HTMLDivElement;
  #targetFill: HTMLDivElement;
  #status: HTMLDivElement;

  constructor(fireballIconUrl: string) {
    const hudRoot = document.createElement("div");
    hudRoot.className = "game-hud";

    const playerPanel = document.createElement("div");
    playerPanel.className = "hud-panel";

    const playerTitle = document.createElement("div");
    playerTitle.className = "hud-title";
    playerTitle.textContent = "Player";

    const healthBar = this.#createBar("Health", "hud-fill-health");
    const manaBar = this.#createBar("Mana", "hud-fill-mana");
    this.#healthFill = healthBar.fill;
    this.#manaFill = manaBar.fill;

    playerPanel.append(playerTitle, healthBar.root, manaBar.root);

    const targetPanel = document.createElement("div");
    targetPanel.className = "hud-panel";

    const targetTitle = document.createElement("div");
    targetTitle.className = "hud-title";
    targetTitle.textContent = "Target";

    const targetBar = this.#createBar("Health", "hud-fill-target");
    this.#targetFill = targetBar.fill;

    this.#status = document.createElement("div");
    this.#status.className = "hud-status";
    this.#status.textContent = "Click an enemy to attack";

    targetPanel.append(targetTitle, targetBar.root, this.#status);
    hudRoot.append(playerPanel, targetPanel, this.#createSkillBar(fireballIconUrl));
    document.body.append(hudRoot);
    this.#root = hudRoot;
  }

  update(options: HudUpdateOptions) {
    const { player, target, playerRespawnTimeLeft, isRespawningPlayer } = options;

    if (!player) {
      return;
    }

    this.#setFill(this.#healthFill, player.stats.health, player.stats.maxHealth);
    this.#setFill(this.#manaFill, player.stats.mana, player.stats.maxMana);

    if (target && !target.isDead) {
      this.#setFill(this.#targetFill, target.stats.health, target.stats.maxHealth);
    } else {
      this.#setFill(this.#targetFill, 0, 1);
    }

    if (player.isDead && playerRespawnTimeLeft == null && !isRespawningPlayer) {
      this.setStatus("You died");
    }
  }

  setStatus(text: string) {
    this.#status.textContent = text;
  }

  dispose() {
    this.#root.remove();
  }

  #createSkillBar(fireballIconUrl: string) {
    const skillBar = document.createElement("div");
    skillBar.className = "skill-bar";

    for (let i = 0; i < 4; i++) {
      const slot = document.createElement("div");
      slot.className = i === 0 ? "skill-slot skill-slot-active" : "skill-slot";

      if (i === 0) {
        const image = document.createElement("img");
        image.className = "skill-icon";
        image.src = fireballIconUrl;
        image.alt = "Fireball";

        const key = document.createElement("span");
        key.className = "skill-key";
        key.textContent = "1";

        slot.append(image, key);
      }

      skillBar.append(slot);
    }

    return skillBar;
  }

  #createBar(label: string, fillClassName: string): HudBar {
    const root = document.createElement("div");
    root.className = "hud-bar";

    const text = document.createElement("span");
    text.textContent = label;

    const track = document.createElement("div");
    track.className = "hud-track";

    const fill = document.createElement("div");
    fill.className = `hud-fill ${fillClassName}`;

    track.append(fill);
    root.append(text, track);

    return { root, fill };
  }

  #setFill(fill: HTMLDivElement, value: number, maxValue: number) {
    const percent = maxValue <= 0 ? 0 : Math.max(0, Math.min(1, value / maxValue));
    fill.style.width = `${percent * 100}%`;
  }
}

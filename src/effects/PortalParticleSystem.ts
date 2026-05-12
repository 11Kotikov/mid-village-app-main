// src/effects/PortalParticleSystem.ts
import {
  Scene,
  Vector3,
  MeshBuilder,
  AbstractMesh,
  ParticleSystem,
  CustomParticleEmitter,
  Texture,
  Color4,
} from "@babylonjs/core";
import { PARTICLES_URLS } from "../assets/paths";

export interface PortalParticleOptions {
  capacity?: number;           // максимальное количество частиц
  emitRate?: number;           // частиц в секунду
  maxLifeTime?: number;        // секунды
  minSize?: number;
  maxSize?: number;
  orbitRadius?: number;        // радиус окружности, на которой рождаются частицы (если используется круг)
  angularSpeed?: number;       // радиан в секунду (скорость вращения точки эмиссии)
  center?: Vector3;            // центр притяжения и центр окружности/прямоугольника
  textureUrl?: string;         // путь к текстуре (квадратной)
  emitterVisibility?: number;  // 0..1 видимость вспомогательной mesh (обычно 0)
  useRectEmitter?: boolean;    // true - прямоугольная эмиссия (дверь), false - круговая
  rectWidth?: number;          // ширина прямоугольной области эмиссии
  rectHeight?: number;         // высота прямоугольной области эмиссии
}

export class PortalParticleSystem {
  private particleSystem: ParticleSystem | null = null;
  private emitterMesh: AbstractMesh | null = null;
  private center: Vector3;
  private orbitRadius: number;
  private angularSpeed: number;
  private currentAngle: number = 0;
  private useRectEmitter: boolean;
  private rectWidth: number;
  private rectHeight: number;

  constructor(scene: Scene, options: PortalParticleOptions = {}) {
    this.center = options.center ?? Vector3.Zero();
    this.orbitRadius = options.orbitRadius ?? 5;
    this.angularSpeed = options.angularSpeed ?? 2.0;
    this.useRectEmitter = options.useRectEmitter ?? true;  // по умолчанию прямоугольная эмиссия (дверь)
    this.rectWidth = options.rectWidth ?? 3.0;
    this.rectHeight = options.rectHeight ?? 5.0;

    // Вспомогательный mesh (скрытый)
    this.emitterMesh = MeshBuilder.CreateBox("portalEmitter", { size: 0.1 }, scene);
    this.emitterMesh.visibility = options.emitterVisibility ?? 0;
    this.emitterMesh.position = this.center;

    // Система частиц
    this.particleSystem = new ParticleSystem(
      "portalParticles",
      options.capacity ?? 5000,
      scene
    );

    // Кастомный эмиттер
    const customEmitter = new CustomParticleEmitter();
    const getCenter = () => this.center;
    const getRadius = () => this.orbitRadius;
    const getAngle = () => this.currentAngle;
    const getUseRect = () => this.useRectEmitter;
    const getRectWidth = () => this.rectWidth;
    const getRectHeight = () => this.rectHeight;

    // Генератор позиций (где рождаются частицы)
    customEmitter.particlePositionGenerator = (_index, _particle, out) => {
      const center = getCenter();
      if (getUseRect()) {
        // Прямоугольная область (дверной проём)
        out.x = (Math.random() - 0.5) * getRectWidth();
        out.y = (Math.random() - 0.5) * getRectHeight();
        out.z = Math.random() - 0.5;
      } else {
        // Круговая область
        const angle = getAngle();
        const radius = getRadius();
        out.x = center.x + Math.cos(angle) * radius;
        out.y = center.y + Math.sin(angle) * radius;
        out.z = center.z;
      }
      // Небольшой случайный разброс для объёма
      out.x += (Math.random() - 0.5) * 0.2;
      out.y += (Math.random() - 0.5) * 0.2;
    };

    // Генератор цели (куда летят частицы)
    customEmitter.particleDestinationGenerator = (_index, _particle, out) => {
      const center = getCenter();
      out.x = center.x;
      out.y = center.y;
      out.z = center.z;
    };

    this.particleSystem.particleEmitterType = customEmitter;
    this.particleSystem.emitRate = options.emitRate ?? 2000;
    this.particleSystem.maxLifeTime = options.maxLifeTime ?? 10;
    this.particleSystem.minSize = options.minSize ?? 0.05;
    this.particleSystem.maxSize = options.maxSize ?? 0.2;
    this.particleSystem.emitter = this.emitterMesh;

    // Текстура (квадратная)
    const textureUrl = options.textureUrl ?? PARTICLES_URLS.portal;
    const texture = new Texture(textureUrl, scene);
    this.particleSystem.particleTexture = texture;

    // Настройки для квадратных частиц (дверной стиль)
    this.particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
    this.particleSystem.isBillboardBased = true;   // всегда повёрнуты к камере
    this.particleSystem.isLocal = false;

    // Вращение частиц (чтобы квадраты крутились)
    this.particleSystem.minAngularSpeed = 0;
    this.particleSystem.maxAngularSpeed = Math.PI * 2; // полный оборот в секунду

    // Прямоугольная форма (вертикальные частицы как "доски")
    this.particleSystem.minScaleX = 0.6;
    this.particleSystem.maxScaleX = 1.2;
    this.particleSystem.minScaleY = 1.2;
    this.particleSystem.maxScaleY = 2.0;

    // Цвета: магическая дверь (фиолетово-голубое свечение)
    this.particleSystem.color1 = new Color4(0.7, 0.4, 1.0, 1.0);
    this.particleSystem.color2 = new Color4(0.2, 0.6, 1.0, 1.0);
    this.particleSystem.colorDead = new Color4(0.5, 0.2, 0.8, 0.0);

    // Запуск
    this.particleSystem.start();
  }

  public update(deltaSeconds: number): void {
    if (!this.particleSystem) return;
    if (!this.useRectEmitter) {
      // Только для круговой эмиссии вращаем угол
      this.currentAngle += this.angularSpeed * deltaSeconds;
      if (this.currentAngle > Math.PI * 2) {
        this.currentAngle -= Math.PI * 2;
      }
    }
  }

  public setCenter(center: Vector3): void {
    this.center = center.clone();
    if (this.emitterMesh) {
      this.emitterMesh.position = this.center;
    }
  }

  public setOrbitRadius(radius: number): void {
    this.orbitRadius = radius;
  }

  public setAngularSpeed(speed: number): void {
    this.angularSpeed = speed;
  }

  public setRectEmitter(useRect: boolean): void {
    this.useRectEmitter = useRect;
  }

  public setRectSize(width: number, height: number): void {
    this.rectWidth = width;
    this.rectHeight = height;
  }

  public stop(): void {
    this.particleSystem?.stop();
  }

  public start(): void {
    if (this.particleSystem && !this.particleSystem.isStarted()) {
      this.particleSystem.start();
    }
  }

  public dispose(): void {
    if (this.particleSystem) {
      this.particleSystem.stop();
      this.particleSystem.dispose();
      this.particleSystem = null;
    }
    if (this.emitterMesh) {
      this.emitterMesh.dispose();
      this.emitterMesh = null;
    }
  }
}

// src/environment/Skybox.ts
import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  CubeTexture,
  Color3,
  Mesh,
  Texture,
} from "@babylonjs/core";

export class Skybox {
  private mesh: Mesh | null = null;
  private material: StandardMaterial | null = null;

  constructor(scene: Scene, texturePath: string, size: number = 500) {
    // Создаём куб
    this.mesh = MeshBuilder.CreateBox("skyBox", { size }, scene);
    this.mesh.infiniteDistance = true;
    this.mesh.isPickable = false;
    
    // Создаём материал
    this.material = new StandardMaterial("skyBoxMaterial", scene);
    this.material.backFaceCulling = false; // чтобы видеть внутреннюю сторону
    this.material.disableLighting = true;
    this.material.diffuseColor = Color3.Black();
    this.material.specularColor = Color3.Black();
    
    // Текстура куба
    const cubeTexture = new CubeTexture(texturePath, scene, {
      extensions: ["_px.jpg", "_py.jpg", "_pz.jpg", "_nx.jpg", "_ny.jpg", "_nz.jpg"],
      noMipmap: true,
      onError: (message) => {
        console.error(`[skybox] failed to load cube texture from "${texturePath}"`, message);
      },
    });
    cubeTexture.coordinatesMode = Texture.SKYBOX_MODE;
    this.material.reflectionTexture = cubeTexture;
    
    // Применяем материал
    this.mesh.material = this.material;
  }

  public dispose(): void {
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }
  }
}

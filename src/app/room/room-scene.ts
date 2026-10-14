import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Constants } from '@babylonjs/core/Engines/constants';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { RawCubeTexture } from '@babylonjs/core/Materials/Textures/rawCubeTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { ExtrudeShape } from '@babylonjs/core/Meshes/Builders/shapeBuilder';
import '@babylonjs/core/Culling/ray';
import '@babylonjs/core/Rendering/outlineRenderer';
import { VHS_SHADER_NAME } from './vhs-post';
import {
  doormatCanvas,
  planksCanvas,
  posterCanvas,
  rugCanvas,
  screenCanvas,
  sidingCanvas,
  skyCanvas,
  wallCanvas,
  woodCanvas,
} from './textures';

export type HotspotId = 'door' | 'shelf' | 'tv' | 'desk';
export type InteriorId = Exclude<HotspotId, 'door'>;
export type ScenePhase = 'intro' | 'entering' | 'idle' | 'focus';

export interface HoverInfo {
  id: HotspotId;
  x: number;
  y: number;
}

export interface RoomSceneCallbacks {
  onHover?: (info: HoverInfo | null) => void;
  onSelect?: (id: InteriorId) => void;
  onEnter?: () => void;
  onPhase?: (phase: ScenePhase) => void;
}

interface Pose {
  position: Vector3;
  target: Vector3;
}

const INTRO: Pose = {
  position: new Vector3(0, 1.78, 9.8),
  target: new Vector3(0, 1.35, 3.4),
};

const IDLE: Pose = {
  position: new Vector3(0, 1.62, 2.9),
  target: new Vector3(0, 1.15, -3.2),
};

const FOCUS: Record<InteriorId, Pose> = {
  shelf: {
    position: new Vector3(-1.7, 1.55, 1.1),
    target: new Vector3(-3.8, 1.2, -0.1),
  },
  tv: {
    position: new Vector3(1.4, 1.5, 0.9),
    target: new Vector3(3.72, 1.35, -0.5),
  },
  desk: {
    position: new Vector3(0, 1.2, -0.4),
    target: new Vector3(0, 1.05, -3.4),
  },
};

const ACCENT = Color3.FromHexString('#8fd6ff');
const NEON_PINK = Color3.FromHexString('#ff2fb0');
const NEON_CYAN = Color3.FromHexString('#39e0ff');
const NEON_PURPLE = Color3.FromHexString('#8a4dff');

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function hex(value: string): Color3 {
  return Color3.FromHexString(value);
}

export class RoomScene {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: FreeCamera;

  private readonly doorPickable: Mesh[] = [];
  private readonly interiorPickable = new Map<InteriorId, Mesh[]>();
  private readonly anchors = new Map<HotspotId, Vector3>();

  private readonly smoothPosition = new Vector3();
  private readonly smoothTarget = new Vector3();

  private readonly glow: GlowLayer;
  private readonly pipeline: DefaultRenderingPipeline;
  private readonly vhs: PostProcess;

  private transition?: { from: Pose; to: Pose; elapsed: number; duration: number };
  private doorPivot?: TransformNode;
  private doorTween?: number;
  private phase: ScenePhase = 'intro';
  private goal: Pose = INTRO;
  private hoveredId: HotspotId | null = null;
  private vhsValue = 1;
  private elapsed = 0;
  private texCounter = 0;
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: RoomSceneCallbacks = {},
  ) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.02, 0.01, 0.05, 1);
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogColor = hex('#0b0720');
    this.scene.fogDensity = 0.014;

    this.camera = new FreeCamera('pov', INTRO.position.clone(), this.scene);
    this.camera.fov = (52 * Math.PI) / 180;
    this.camera.minZ = 0.08;
    this.camera.maxZ = 320;
    this.smoothPosition.copyFrom(INTRO.position);
    this.smoothTarget.copyFrom(INTRO.target);
    this.camera.position.copyFrom(this.smoothPosition);
    this.camera.setTarget(this.smoothTarget);

    this.glow = new GlowLayer('glow', this.scene, { blurKernelSize: 32 });
    this.glow.intensity = 0.85;

    this.buildEnvironment();
    this.buildExterior();
    this.buildInterior();
    this.buildLights();

    this.pipeline = new DefaultRenderingPipeline('pipe', true, this.scene, [this.camera]);
    this.pipeline.fxaaEnabled = true;
    this.pipeline.samples = 4;
    this.pipeline.bloomEnabled = true;
    this.pipeline.bloomThreshold = 0.72;
    this.pipeline.bloomWeight = 0.28;
    this.pipeline.bloomKernel = 48;
    this.pipeline.imageProcessing.toneMappingEnabled = true;
    this.pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.pipeline.imageProcessing.contrast = 1.35;
    this.pipeline.imageProcessing.exposure = 1.12;
    this.pipeline.imageProcessing.vignetteEnabled = true;
    this.pipeline.imageProcessing.vignetteWeight = 2.2;
    this.pipeline.imageProcessing.vignetteColor = new Color4(0.02, 0.0, 0.07, 0);

    this.vhs = new PostProcess(
      'vhs',
      VHS_SHADER_NAME,
      ['uTime', 'uVhs', 'uVignette', 'uResolution'],
      null,
      1.0,
      this.camera,
      Texture.BILINEAR_SAMPLINGMODE,
      this.engine,
      false,
    );
    this.vhs.onApply = (effect) => {
      effect.setFloat('uTime', this.elapsed);
      effect.setFloat('uVhs', this.vhsValue);
      effect.setFloat('uVignette', 0.85);
      effect.setVector2('uResolution', new Vector2(this.engine.getRenderWidth(), this.engine.getRenderHeight()));
    };

    this.attachEvents();
    this.engine.runRenderLoop(() => this.render());
  }

  start(): void {
    /* render loop already running */
  }

  setPhase(phase: ScenePhase): void {
    if (phase === 'focus') {
      return;
    }
    this.phase = phase;
    this.goal = phase === 'intro' ? INTRO : IDLE;
    this.callbacks.onPhase?.(phase);
  }

  focus(id: InteriorId): void {
    this.phase = 'focus';
    this.goal = FOCUS[id];
    this.callbacks.onPhase?.('focus');
  }

  returnToIdle(): void {
    this.phase = 'idle';
    this.goal = IDLE;
    this.callbacks.onPhase?.('idle');
  }

  dispose(): void {
    this.disposed = true;
    this.detachEvents();
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
  }

  private render(): void {
    if (this.disposed) {
      return;
    }
    const dt = this.engine.getDeltaTime() / 1000;
    this.elapsed += dt;

    this.updateDoor(dt);
    this.updateCamera(dt);

    this.scene.render();
  }

  private updateCamera(dt: number): void {
    if (this.transition) {
      this.transition.elapsed += dt;
      const t = Math.min(1, this.transition.elapsed / this.transition.duration);
      const e = easeInOutCubic(t);

      Vector3.LerpToRef(this.transition.from.position, this.transition.to.position, e, this.smoothPosition);
      Vector3.LerpToRef(this.transition.from.target, this.transition.to.target, e, this.smoothTarget);

      if (t >= 1) {
        if (this.transition.to === IDLE || this.phase === 'focus') {
          this.phase = this.phase === 'entering' ? 'idle' : this.phase;
        }
        this.transition = undefined;
      }
    } else {
      const smooth = Math.min(1, dt * 3.2);
      this.smoothPosition.addInPlace(this.goal.position.subtract(this.smoothPosition).scale(smooth));
      this.smoothTarget.addInPlace(this.goal.target.subtract(this.smoothTarget).scale(smooth));
    }

    const bob = this.phase === 'idle' || this.phase === 'focus' ? Math.abs(Math.sin(this.elapsed * 1.1)) * 0.012 : 0;
    this.camera.position.copyFrom(this.smoothPosition);
    this.camera.position.y += bob;
    this.camera.setTarget(this.smoothTarget);
  }

  private updateDoor(dt: number): void {
    if (!this.doorPivot || this.doorTween === undefined) {
      return;
    }
    const target = -Math.PI * 0.62;
    this.doorTween = Math.min(1, this.doorTween + dt / 1.5);
    this.doorPivot.rotation.y = easeInOutCubic(this.doorTween) * target;
  }

  private texture(canvas: HTMLCanvasElement, uScale = 1, vScale = 1): DynamicTexture {
    const dt = new DynamicTexture(`tex-${this.texCounter++}`, { width: canvas.width, height: canvas.height }, this.scene, true);
    dt.getContext().drawImage(canvas, 0, 0);
    dt.update();
    dt.uScale = uScale;
    dt.vScale = vScale;
    dt.wrapU = Texture.WRAP_ADDRESSMODE;
    dt.wrapV = Texture.WRAP_ADDRESSMODE;
    return dt;
  }

  private pbr(
    name: string,
    color: string,
    opts: { metallic?: number; roughness?: number; emissive?: Color3; emissiveIntensity?: number } = {},
  ): PBRMaterial {
    const mat = new PBRMaterial(name, this.scene);
    mat.albedoColor = hex(color);
    mat.metallic = opts.metallic ?? 0.05;
    mat.roughness = opts.roughness ?? 0.78;
    mat.maxSimultaneousLights = 10;
    if (opts.emissive) {
      mat.emissiveColor = opts.emissive;
      mat.emissiveIntensity = opts.emissiveIntensity ?? 1;
    }
    return mat;
  }

  private emissive(name: string, color: Color3, intensity = 1.4): PBRMaterial {
    const mat = new PBRMaterial(name, this.scene);
    mat.albedoColor = Color3.Black();
    mat.emissiveColor = color;
    mat.emissiveIntensity = intensity;
    mat.metallic = 0;
    mat.roughness = 1;
    mat.maxSimultaneousLights = 10;
    return mat;
  }

  private box(name: string, size: { w: number; h: number; d: number }, pos: Vector3, mat: PBRMaterial): Mesh {
    const mesh = CreateBox(name, { width: size.w, height: size.h, depth: size.d }, this.scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    return mesh;
  }

  private slab(name: string, w: number, d: number, thickness: number, radius: number, pos: Vector3, mat: PBRMaterial): Mesh {
    const r = Math.max(0.004, Math.min(radius, w / 2 - 0.01, d / 2 - 0.01));
    const seg = 5;
    const pts: Vector3[] = [];
    const corners: [number, number, number][] = [
      [w / 2 - r, d / 2 - r, 0],
      [-w / 2 + r, d / 2 - r, Math.PI / 2],
      [-w / 2 + r, -d / 2 + r, Math.PI],
      [w / 2 - r, -d / 2 + r, (3 * Math.PI) / 2],
    ];
    for (const [cx, cy, a0] of corners) {
      for (let i = 0; i <= seg; i++) {
        const a = a0 + (i / seg) * (Math.PI / 2);
        pts.push(new Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0));
      }
    }
    pts.push(pts[0].clone());
    const mesh = ExtrudeShape(
      name,
      {
        shape: pts,
        path: [new Vector3(0, 0, -thickness / 2), new Vector3(0, 0, thickness / 2)],
        cap: Mesh.CAP_ALL,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      this.scene,
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.bakeCurrentTransformIntoVertices();
    mesh.position.copyFrom(pos);
    mesh.material = mat;
    return mesh;
  }

  private buildEnvironment(): void {
    try {
      const size = 128;
      const faces: Uint8Array[] = [];
      for (let f = 0; f < 6; f++) {
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d')!;
        const top = f === 2;
        const bottom = f === 3;
        const g = ctx.createLinearGradient(0, 0, 0, size);
        g.addColorStop(0, top ? '#3b2f80' : bottom ? '#04030a' : '#241a52');
        g.addColorStop(1, bottom ? '#020208' : '#0a0820');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        const blob = ctx.createRadialGradient(size * 0.7, size * 0.5, 0, size * 0.7, size * 0.5, size * 0.5);
        blob.addColorStop(0, 'rgba(255,80,190,0.35)');
        blob.addColorStop(1, 'rgba(255,80,190,0)');
        ctx.fillStyle = blob;
        ctx.fillRect(0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        faces.push(new Uint8Array(data.buffer.slice(0)));
      }
      const cube = new RawCubeTexture(
        this.scene,
        faces,
        size,
        Constants.TEXTUREFORMAT_RGBA,
        Constants.TEXTURETYPE_UNSIGNED_BYTE,
        true,
        false,
      );
      cube.gammaSpace = true;
      this.scene.environmentTexture = cube;
      this.scene.environmentIntensity = 0.6;
    } catch (error) {
      console.warn('Sin environment map:', error);
    }
  }

  private buildExterior(): void {
    const siding = this.pbr('siding', '#ffffff', { roughness: 0.85 });
    siding.albedoTexture = this.texture(sidingCanvas(), 3, 2);

    const trim = this.pbr('trim', '#15141f', { roughness: 0.6 });
    const roofMat = this.pbr('roof', '#0f0d18', { roughness: 0.7, metallic: 0.15 });
    const grass = this.pbr('grass', '#0c1a12', { roughness: 1 });
    grass.albedoTexture = this.texture(wallCanvas(), 6, 6);

    const ground = CreateGround('ground', { width: 120, height: 120, subdivisions: 2 }, this.scene);
    ground.material = grass;
    ground.position.y = -0.02;

    this.box('facadeFrontL', { w: 3.45, h: 3.4, d: 0.08 }, new Vector3(-2.475, 1.7, 3.96), siding);
    this.box('facadeFrontR', { w: 3.45, h: 3.4, d: 0.08 }, new Vector3(2.475, 1.7, 3.96), siding);
    this.box('facadeLintel', { w: 1.7, h: 0.9, d: 0.08 }, new Vector3(0, 2.95, 3.96), siding);
    this.box('facadeLeft', { w: 0.08, h: 3.4, d: 8.2 }, new Vector3(-4.22, 1.7, -0.1), siding);
    this.box('facadeRight', { w: 0.08, h: 3.4, d: 8.2 }, new Vector3(4.22, 1.7, -0.1), siding);
    this.box('facadeBack', { w: 8.5, h: 3.4, d: 0.08 }, new Vector3(0, 1.7, -4.22), siding);
    const roof = this.box('roof', { w: 9.2, h: 0.5, d: 8.8 }, new Vector3(0, 3.62, -0.1), roofMat);

    const step = this.slab('step', 3, 1.6, 0.2, 0.06, new Vector3(0, 0.1, 4.5), trim);

    const doormat = this.slab('doormat', 1.5, 0.9, 0.05, 0.05, new Vector3(0, 0.22, 4.15), this.pbr('doormat', '#ffffff', { roughness: 1 }));
    (doormat.material as PBRMaterial).albedoTexture = this.texture(doormatCanvas());

    const doorMat = this.pbr('door', '#3a2a55', { roughness: 0.5, metallic: 0.1 });
    const doorHinge = new TransformNode('hinge', this.scene);
    doorHinge.position = new Vector3(-0.62, 1.15, 3.9);
    this.doorPivot = doorHinge;
    const door = this.box('doorPanel', { w: 1.24, h: 2.25, d: 0.12 }, new Vector3(0.62, 0, 0), doorMat);
    door.parent = doorHinge;
    const handle = CreateCylinder('handle', { height: 0.16, diameter: 0.07, tessellation: 20 }, this.scene);
    handle.rotation.z = Math.PI / 2;
    handle.position = new Vector3(1.02, 0.1, 0.16);
    handle.material = this.emissive('handleMat', hex('#ffd27a'), 0.6);
    handle.parent = doorHinge;
    this.doorPickable.push(door, handle);
    door.metadata = { hotspotId: 'door' };
    handle.metadata = { hotspotId: 'door' };
    this.anchors.set('door', new Vector3(0, 1.2, 4.2));

    const frameMat = this.pbr('frame', '#251c3a', { roughness: 0.6 });
    this.box('frameL', { w: 0.18, h: 2.5, d: 0.24 }, new Vector3(-0.72, 1.25, 3.9), frameMat);
    this.box('frameR', { w: 0.18, h: 2.5, d: 0.24 }, new Vector3(0.72, 1.25, 3.9), frameMat);
    this.box('frameT', { w: 1.62, h: 0.2, d: 0.26 }, new Vector3(0, 2.5, 3.9), frameMat);

    const windowMat = this.emissive('windowGlass', hex('#ffcf8a'), 0.7);
    const pane = this.pbr('pane', '#0a0c16', { roughness: 0.2 });
    [
      new Vector3(-2.9, 2.0, 4.01),
      new Vector3(2.9, 2.0, 4.01),
    ].forEach((p, i) => {
      this.box(`window${i}`, { w: 1.6, h: 1.3, d: 0.06 }, p, windowMat);
      this.box(`windowFrame${i}`, { w: 1.8, h: 1.5, d: 0.12 }, p.add(new Vector3(0, 0, -0.06)), pane);
    });

    const porch = new PointLight('porch', new Vector3(1.6, 3.05, 4.18), this.scene);
    porch.diffuse = hex('#ffb066');
    porch.intensity = 14;
    porch.range = 12;

    const porchLamp = CreateSphere('porchLamp', { diameter: 0.22, segments: 16 }, this.scene);
    porchLamp.position = new Vector3(1.6, 3.05, 4.14);
    porchLamp.material = this.emissive('porchLampMat', hex('#ffb066'), 1.6);

    const bushMat = this.pbr('bush', '#10241a', { roughness: 1 });
    for (let i = 0; i < 6; i++) {
      const bush = CreateSphere('bush' + i, { diameter: 0.9 + Math.random() * 0.6, segments: 12 }, this.scene);
      bush.position = new Vector3(-3.6 + i * 1.45, 0.35, 4.7 + (i % 2) * 0.35);
      bush.scaling.y = 0.7;
      bush.material = bushMat;
    }

    const trunk = this.pbr('trunk', '#2a1c12', { roughness: 1 });
    this.box('trunk', { w: 0.4, h: 3, d: 0.4 }, new Vector3(-6.5, 1.5, 6), trunk);
    const leafMat = this.pbr('leaf', '#0f2418', { roughness: 1 });
    for (let i = 0; i < 4; i++) {
      const leaf = CreateSphere('leaf' + i, { diameter: 2.2 - i * 0.35, segments: 12 }, this.scene);
      leaf.position = new Vector3(-6.5, 3.2 + i * 0.6, 6);
      leaf.material = leafMat;
    }

    const postMat = this.pbr('post', '#1c1a2a', { roughness: 0.5, metallic: 0.4 });
    this.box('lampPost', { w: 0.16, h: 4.4, d: 0.16 }, new Vector3(5.6, 2.2, 5.6), postMat);
    const lampHead = CreateSphere('lampHead', { diameter: 0.5, segments: 16 }, this.scene);
    lampHead.position = new Vector3(5.6, 4.4, 5.6);
    lampHead.material = this.emissive('lampHeadMat', hex('#a9c8ff'), 1.4);
    const street = new PointLight('street', new Vector3(5.6, 4.4, 5.6), this.scene);
    street.diffuse = hex('#a9c8ff');
    street.intensity = 18;
    street.range = 16;

    const skyMat = new StandardMaterial('skyMat', this.scene);
    skyMat.disableLighting = true;
    skyMat.emissiveTexture = this.texture(skyCanvas());
    skyMat.backFaceCulling = false;
    skyMat.fogEnabled = false;
    const sky = CreateSphere('sky', { diameter: 300, segments: 24, sideOrientation: Mesh.BACKSIDE }, this.scene);
    sky.material = skyMat;
    this.glow.addExcludedMesh(sky);
  }

  private buildInterior(): void {
    const wallMat = this.pbr('wall', '#ffffff', { roughness: 0.95 });
    wallMat.albedoTexture = this.texture(wallCanvas(), 3, 1.5);

    const floorMat = this.pbr('floor', '#ffffff', { roughness: 0.7 });
    floorMat.albedoTexture = this.texture(planksCanvas(), 2, 2);

    const floor = CreateGround('floor', { width: 8.2, height: 8, subdivisions: 2 }, this.scene);
    floor.material = floorMat;
    floor.position = new Vector3(0, 0, -0.1);
    const ceiling = CreateGround('ceiling', { width: 8.2, height: 8, subdivisions: 1 }, this.scene);
    ceiling.material = wallMat;
    ceiling.position = new Vector3(0, 2.7, -0.1);
    ceiling.rotation.x = Math.PI;

    const baseboard = this.pbr('baseboard', '#0e0d16', { roughness: 0.6 });
    this.box('baseBack', { w: 8.2, h: 0.16, d: 0.05 }, new Vector3(0, 0.08, -4.06), baseboard);
    this.box('baseLeft', { w: 0.05, h: 0.16, d: 8 }, new Vector3(-4.06, 0.08, -0.1), baseboard);
    this.box('baseRight', { w: 0.05, h: 0.16, d: 8 }, new Vector3(4.06, 0.08, -0.1), baseboard);

    const backWall = this.box('backWall', { w: 8.4, h: 2.8, d: 0.12 }, new Vector3(0, 1.4, -4.11), wallMat);
    const leftWall = this.box('leftWall', { w: 0.12, h: 2.8, d: 8.2 }, new Vector3(-4.16, 1.4, -0.1), wallMat);
    const rightWall = this.box('rightWall', { w: 0.12, h: 2.8, d: 8.2 }, new Vector3(4.16, 1.4, -0.1), wallMat);
    const frontWallL = this.box('frontWallL', { w: 3.38, h: 2.8, d: 0.12 }, new Vector3(-2.35, 1.4, 3.9), wallMat);
    const frontWallR = this.box('frontWallR', { w: 3.38, h: 2.8, d: 0.12 }, new Vector3(2.35, 1.4, 3.9), wallMat);

    const rug = this.slab('rug', 3.4, 2.6, 0.03, 0.12, new Vector3(0, 0.02, -0.4), this.pbr('rugMat', '#ffffff', { roughness: 1 }));
    (rug.material as PBRMaterial).albedoTexture = this.texture(rugCanvas());

    this.buildDesk();
    this.buildShelf();
    this.buildTv();
    this.buildDecor();
  }

  private buildDesk(): void {
    const wood = this.pbr('deskWood', '#ffffff', { roughness: 0.5 });
    wood.albedoTexture = this.texture(woodCanvas(), 1.5, 1);
    const metal = this.pbr('deskMetal', '#26242f', { roughness: 0.35, metallic: 0.75 });
    const deskPos = new Vector3(0, 0.74, -3.1);

    const top = this.slab('deskTop', 2.8, 1.05, 0.07, 0.05, deskPos, wood);
    const legHeight = 0.71;
    [
      new Vector3(-1.28, legHeight / 2, -3.5),
      new Vector3(1.28, legHeight / 2, -3.5),
      new Vector3(-1.28, legHeight / 2, -2.7),
      new Vector3(1.28, legHeight / 2, -2.7),
    ].forEach((p, i) => {
      const leg = CreateCylinder('deskLeg' + i, { height: legHeight, diameter: 0.06, tessellation: 14 }, this.scene);
      leg.position.copyFrom(p);
      leg.material = metal;
    });

    const monitorStand = CreateCylinder('monStand', { height: 0.3, diameter: 0.32, tessellation: 16 }, this.scene);
    monitorStand.position = new Vector3(0, 0.92, -3.4);
    monitorStand.material = metal;
    const monitorBase = this.slab('monBase', 0.5, 0.3, 0.03, 0.06, new Vector3(0, 0.79, -3.4), metal);

    const screenMat = new PBRMaterial('screenMat', this.scene);
    screenMat.albedoColor = Color3.Black();
    screenMat.emissiveTexture = this.texture(screenCanvas());
    screenMat.emissiveColor = Color3.White();
    screenMat.emissiveIntensity = 1.5;
    screenMat.metallic = 0;
    screenMat.roughness = 1;
    screenMat.maxSimultaneousLights = 10;

    const bezel = this.pbr('bezel', '#0a0a12', { roughness: 0.4, metallic: 0.3 });
    this.box('monitor', { w: 1.7, h: 1.0, d: 0.06 }, new Vector3(0, 1.42, -3.42), bezel);
    this.box('monitorScreen', { w: 1.56, h: 0.86, d: 0.02 }, new Vector3(0, 1.42, -3.37), screenMat);

    const kb = this.slab('keyboard', 1.0, 0.36, 0.04, 0.03, new Vector3(0, 0.79, -3.0), this.pbr('kb', '#1a1a24', { roughness: 0.6 }));
    void kb;
    this.slab('kbTop', 0.92, 0.28, 0.02, 0.02, new Vector3(0, 0.815, -3.0), this.pbr('kbTop', '#242433', { roughness: 0.5 }));

    const mouse = CreateSphere('mouse', { diameter: 0.13, segments: 16 }, this.scene);
    mouse.scaling = new Vector3(1, 0.7, 1.4);
    mouse.position = new Vector3(0.8, 0.8, -2.95);
    mouse.material = this.pbr('mouseMat', '#1c1c28', { roughness: 0.4 });

    const mug = CreateCylinder('mug', { height: 0.14, diameterTop: 0.12, diameterBottom: 0.1, tessellation: 20 }, this.scene);
    mug.position = new Vector3(-0.75, 0.82, -3.15);
    mug.material = this.pbr('mugMat', '#c95a3c', { roughness: 0.5 });

    const lampArm = CreateCylinder('lampArm', { height: 0.5, diameter: 0.04, tessellation: 12 }, this.scene);
    lampArm.position = new Vector3(-1.15, 1.0, -3.45);
    lampArm.rotation.z = -0.5;
    lampArm.material = metal;
    const lampHead = CreateCylinder('lampHead', { height: 0.16, diameterTop: 0.12, diameterBottom: 0.26, tessellation: 18 }, this.scene);
    lampHead.position = new Vector3(-0.98, 1.22, -3.45);
    lampHead.rotation.z = -0.9;
    lampHead.material = metal;
    const lampBulb = CreateSphere('lampBulb', { diameter: 0.12, segments: 12 }, this.scene);
    lampBulb.position = new Vector3(-0.9, 1.18, -3.45);
    lampBulb.material = this.emissive('lampBulbMat', hex('#ffd9a0'), 1.6);

    const lampLight = new SpotLight('lamp', new Vector3(-0.95, 1.2, -3.45), new Vector3(0.5, -1, 0.35), 0.9, 12, this.scene);
    lampLight.diffuse = hex('#ffc88a');
    lampLight.intensity = 6;
    lampLight.position = new Vector3(-0.95, 1.2, -3.45);

    const postitColors = ['#ffd166', '#ef476f', '#06d6a0'];

    const headsetBand = CreateTorus('hsBand', { diameter: 0.34, thickness: 0.05, tessellation: 24 }, this.scene);
    headsetBand.position = new Vector3(0, 1.0, -3.35);
    headsetBand.rotation.x = Math.PI / 2.2;
    headsetBand.material = this.pbr('hsMat', '#141420', { roughness: 0.6 });
    [-0.17, 0.17].forEach((dx, i) => {
      const cup = CreateCylinder('hsCup' + i, { height: 0.08, diameter: 0.24, tessellation: 18 }, this.scene);
      cup.rotation.z = Math.PI / 2;
      cup.position = new Vector3(dx, 0.92, -3.35);
      cup.material = this.pbr('hsCupMat', '#1c1c2a', { roughness: 0.5 });
    });

    postitColors.forEach((c, i) => {
      const note = this.slab('postit' + i, 0.12, 0.12, 0.005, 0.01, new Vector3(1.15, 0.78, -3.3 + i * 0.12), this.pbr('postitMat' + i, c, { roughness: 1 }));
      note.rotation.y = 0.2;
    });

    const deskHotspot: Mesh[] = [top, monitorBase, monitorStand];
    deskHotspot.forEach((m) => {
      m.metadata = { hotspotId: 'desk' as HotspotId };
    });
    this.interiorPickable.set('desk', deskHotspot);
    this.anchors.set('desk', new Vector3(0, 1.15, -3.2));
  }

  private buildShelf(): void {
    const wood = this.pbr('shelfWood', '#ffffff', { roughness: 0.55 });
    wood.albedoTexture = this.texture(woodCanvas(), 1, 1);
    const x = -3.9;
    const shelf = new TransformNode('shelf', this.scene);
    const pickables: Mesh[] = [];

    [0.4, 1.05, 1.7, 2.35].forEach((y, i) => {
      const board = this.slab('shelfBoard' + i, 2.2, 0.5, 0.06, 0.03, new Vector3(x, y, -1.4), wood);
      board.rotation.y = Math.PI / 2;
      board.bakeCurrentTransformIntoVertices();
      board.parent = shelf;
      pickables.push(board);
    });
    this.box('shelfBack', { w: 0.08, h: 2.5, d: 2.3 }, new Vector3(x - 0.2, 1.35, -1.4), this.pbr('shelfBackMat', '#241a30', { roughness: 0.8 })).parent = shelf;

    const bookColors = ['#e63946', '#457b9d', '#2a9d8f', '#f4a261', '#9b5de5', '#ff006e', '#3a86ff'];
    for (let shelfIdx = 0; shelfIdx < 4; shelfIdx++) {
      let offset = -0.85;
      while (offset < 0.85) {
        const w = 0.08 + Math.random() * 0.1;
        const h = 0.28 + Math.random() * 0.14;
        const book = this.box(
          `book-${shelfIdx}-${offset.toFixed(2)}`,
          { w: 0.42, h, d: w },
          new Vector3(x, [0.4, 1.05, 1.7, 2.35][shelfIdx] + h / 2 + 0.03, -1.4 + offset + w / 2),
          this.pbr('book' + shelfIdx + offset.toFixed(2), bookColors[(shelfIdx * 3 + Math.floor(offset * 10)) % bookColors.length], { roughness: 0.85 }),
        );
        pickables.push(book);
        offset += w + 0.02;
      }
    }

    const trophyStem = CreateCylinder('trophyStem', { height: 0.16, diameter: 0.05, tessellation: 12 }, this.scene);
    trophyStem.position = new Vector3(x, 1.78, -0.55);
    trophyStem.material = this.emissive('goldMat', hex('#ffcf5c'), 0.8);
    const trophyCup = CreateCylinder('trophyCup', { height: 0.18, diameterTop: 0.18, diameterBottom: 0.08, tessellation: 16 }, this.scene);
    trophyCup.position = new Vector3(x, 1.93, -0.55);
    trophyCup.material = this.emissive('goldMat2', hex('#ffcf5c'), 0.8);

    const plantPot = CreateCylinder('plantPot', { height: 0.24, diameterTop: 0.22, diameterBottom: 0.16, tessellation: 18 }, this.scene);
    plantPot.position = new Vector3(x, 2.5, -2.2);
    plantPot.material = this.pbr('potMat', '#8a5a44', { roughness: 0.9 });
    for (let i = 0; i < 5; i++) {
      const leaf = CreateSphere('sLeaf' + i, { diameter: 0.12 + Math.random() * 0.1, segments: 8 }, this.scene);
      leaf.position = new Vector3(x, 2.66 + i * 0.07, -2.2 + (Math.random() - 0.5) * 0.2);
      leaf.scaling.y = 1.6;
      leaf.material = this.pbr('sLeafMat' + i, '#2f7d4f', { roughness: 1 });
    }

    pickables.forEach((m) => {
      m.metadata = { hotspotId: 'shelf' as HotspotId };
    });
    this.interiorPickable.set('shelf', pickables);
    this.anchors.set('shelf', new Vector3(x, 1.35, -1.4));
  }

  private buildTv(): void {
    const x = 3.9;
    const matte = this.pbr('tvMatte', '#12121c', { roughness: 0.4, metallic: 0.3 });
    const pickables: Mesh[] = [];

    const stand = this.slab('tvStand', 2.0, 0.5, 0.06, 0.03, new Vector3(x, 0.5, -1.2), matte);
    stand.rotation.y = Math.PI / 2;
    stand.bakeCurrentTransformIntoVertices();
    pickables.push(stand);
    [0.85, 1.75].forEach((y, i) => {
      const board = this.slab('tvBoard' + i, 2.0, 0.5, 0.05, 0.03, new Vector3(x, y, -1.2), matte);
      board.rotation.y = Math.PI / 2;
      board.bakeCurrentTransformIntoVertices();
      pickables.push(board);
    });

    const tvScreen = new PBRMaterial('tvScreen', this.scene);
    tvScreen.albedoColor = Color3.Black();
    tvScreen.emissiveColor = NEON_CYAN;
    tvScreen.emissiveIntensity = 1.1;
    tvScreen.metallic = 0;
    tvScreen.roughness = 1;
    tvScreen.maxSimultaneousLights = 10;

    const tvFrame = this.box('tvFrame', { w: 0.06, h: 1.05, d: 1.75 }, new Vector3(x - 0.05, 1.45, -1.2), matte);
    const tvPanel = this.box('tvPanel', { w: 0.02, h: 0.9, d: 1.6 }, new Vector3(x - 0.09, 1.45, -1.2), tvScreen);
    pickables.push(tvFrame, tvPanel);

    const consoleBody = this.slab('console', 0.9, 0.5, 0.06, 0.03, new Vector3(x, 0.85, -1.9), this.pbr('consoleMat', '#1a1626', { roughness: 0.4, metallic: 0.4 }));
    pickables.push(consoleBody);
    const consoleGlow = this.box('consoleGlow', { w: 0.02, h: 0.08, d: 0.6 }, new Vector3(x - 0.05, 0.85, -1.9), this.emissive('consoleGlowMat', NEON_PINK, 1.4));
    pickables.push(consoleGlow);

    ['#ff006e', '#3a86ff', '#06d6a0'].forEach((c, i) => {
      const cartridge = this.box('cart' + i, { w: 0.28, h: 0.32, d: 0.05 }, new Vector3(x - 0.03, 1.9 + i * 0.04, -1.7 + i * 0.35), this.pbr('cartMat' + i, c, { roughness: 0.6 }));
      cartridge.rotation.z = 0.06 * (i - 1);
      pickables.push(cartridge);
    });

    pickables.forEach((m) => {
      m.metadata = { hotspotId: 'tv' as HotspotId };
    });
    this.interiorPickable.set('tv', pickables);
    this.anchors.set('tv', new Vector3(x, 1.45, -1.2));
  }

  private buildDecor(): void {
    const posterA = posterCanvas(['<>', 'CÓDIGO', '& CAFÉ'], '#1a1030', '#39e0ff');
    const posterB = posterCanvas(['1UP', 'RETRO', 'CLUB'], '#2a0f24', '#ff2fb0');
    const backPoster = this.slab('posterA', 0.62, 0.02, 0.82, 0.01, new Vector3(-2.4, 1.9, -3.98), this.pbr('posterAMat', '#ffffff', { roughness: 0.9 }));
    (backPoster.material as PBRMaterial).albedoTexture = this.texture(posterA);
    const sidePoster = this.slab('posterB', 0.62, 0.02, 0.82, 0.01, new Vector3(4.05, 1.85, 0.4), this.pbr('posterBMat', '#ffffff', { roughness: 0.9 }));
    (sidePoster.material as PBRMaterial).albedoTexture = this.texture(posterB);
    sidePoster.rotation.y = Math.PI / 2;

    const ring = CreateTorus('neonRing', { diameter: 1.5, thickness: 0.045, tessellation: 48 }, this.scene);
    ring.position = new Vector3(2.1, 2.1, -3.9);
    ring.rotation.x = Math.PI / 2;
    ring.material = this.emissive('neonRingMat', NEON_PURPLE, 1.8);

    const ledStrip = this.box('ledStrip', { w: 5.2, h: 0.04, d: 0.03 }, new Vector3(0, 2.55, -3.9), this.emissive('ledMat', NEON_PINK, 1.3));
    ledStrip.scaling.x = 1;

    const ledLight = new PointLight('led', new Vector3(0, 2.4, -3.4), this.scene);
    ledLight.diffuse = NEON_PINK;
    ledLight.intensity = 5;
    ledLight.range = 8;

    const neonLight = new PointLight('neonPt', new Vector3(2.1, 2.1, -3.3), this.scene);
    neonLight.diffuse = NEON_PURPLE;
    neonLight.intensity = 6;
    neonLight.range = 8;

    const fairy = new PointLight('fairy', new Vector3(-3.4, 2.3, 0.6), this.scene);
    fairy.diffuse = hex('#ffd6a0');
    fairy.intensity = 4;
    fairy.range = 6;
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const bulb = CreateSphere('fairyBulb' + i, { diameter: 0.05, segments: 8 }, this.scene);
      bulb.position = new Vector3(-3.9, 2.45 - Math.sin(t * Math.PI) * 0.35, -2.2 + t * 5.4);
      bulb.material = this.emissive('fairyMat' + (i % 2), i % 2 ? NEON_CYAN : hex('#ffd6a0'), 1.5);
    }

    const chairSeat = this.slab('chairSeat', 0.6, 0.6, 0.12, 0.1, new Vector3(0, 0.48, -2.2), this.pbr('chairMat', '#140f1f', { roughness: 0.5 }));
    const chairBack = this.box('chairBack', { w: 0.6, h: 0.9, d: 0.12 }, new Vector3(0, 0.95, -2.45), this.pbr('chairBackMat', '#1a1226', { roughness: 0.5 }));
    chairBack.rotation.x = -0.12;
    const chairPole = CreateCylinder('chairPole', { height: 0.42, diameter: 0.07, tessellation: 12 }, this.scene);
    chairPole.position = new Vector3(0, 0.22, -2.2);
    chairPole.material = this.pbr('chairMetal', '#26242f', { roughness: 0.4, metallic: 0.7 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const arm = CreateBox('chairArm' + i, { width: 0.4, height: 0.03, depth: 0.05 }, this.scene);
      arm.position = new Vector3(Math.cos(a) * 0.2, 0.06, -2.2 + Math.sin(a) * 0.2);
      arm.rotation.y = -a;
      arm.material = chairPole.material;
      const wheel = CreateSphere('wheel' + i, { diameter: 0.07, segments: 8 }, this.scene);
      wheel.position = new Vector3(Math.cos(a) * 0.4, 0.03, -2.2 + Math.sin(a) * 0.4);
      wheel.material = chairPole.material;
    }
  }

  private buildLights(): void {
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.32;
    hemi.diffuse = hex('#8899ff');
    hemi.groundColor = hex('#2a1240');

    const moon = new DirectionalLight('moon', new Vector3(-0.45, -1, -0.55), this.scene);
    moon.position = new Vector3(9, 15, 8);
    moon.intensity = 0.85;
    moon.diffuse = hex('#bcd0ff');

    const shadow = new ShadowGenerator(2048, moon);
    shadow.useBlurExponentialShadowMap = true;
    shadow.blurKernel = 24;
    shadow.darkness = 0.55;

    this.scene.meshes.forEach((mesh) => {
      if (mesh.name !== 'sky' && !mesh.name.startsWith('fairy')) {
        mesh.receiveShadows = true;
      }
      if (['sky', 'ground', 'floor', 'ceiling'].includes(mesh.name) || mesh.name.startsWith('fairy')) {
        return;
      }
      if (mesh.getTotalVertices() > 0) {
        shadow.addShadowCaster(mesh);
      }
    });

    const ceil = new PointLight('ceil', new Vector3(0, 2.5, -1), this.scene);
    ceil.diffuse = hex('#ffd9b0');
    ceil.intensity = 6;
    ceil.range = 9;

    const ceilBulb = CreateSphere('ceilBulb', { diameter: 0.18, segments: 12 }, this.scene);
    ceilBulb.position = new Vector3(0, 2.55, -1);
    ceilBulb.material = this.emissive('ceilBulbMat', hex('#fff0d0'), 1.2);
  }

  private attachEvents(): void {
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
  }

  private detachEvents(): void {
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const id = this.pickAt(event);
    if (id !== this.hoveredId) {
      this.clearHighlight();
      this.hoveredId = id;
      if (id) {
        this.applyHighlight(id);
      }
    }
    if (id) {
      const rect = this.canvas.getBoundingClientRect();
      this.callbacks.onHover?.({ id, x: event.clientX - rect.left, y: event.clientY - rect.top });
    } else {
      this.callbacks.onHover?.(null);
    }
  };

  private readonly onPointerLeave = (): void => {
    this.clearHighlight();
    this.hoveredId = null;
    this.callbacks.onHover?.(null);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const id = this.pickAt(event);
    if (id === 'door') {
      this.enterHouse();
    } else if (id) {
      this.callbacks.onSelect?.(id);
    }
  };

  private pickAt(event: PointerEvent): HotspotId | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const pick = this.scene.pick(x, y, (mesh) => {
      const meta = mesh.metadata as { hotspotId?: HotspotId } | null;
      const id = meta?.hotspotId;
      if (!id) {
        return false;
      }
      return this.isPickable(id);
    });
    if (!pick?.hit || !pick.pickedMesh) {
      return null;
    }
    const meta = pick.pickedMesh.metadata as { hotspotId?: HotspotId } | null;
    return meta?.hotspotId ?? null;
  }

  private isPickable(id: HotspotId): boolean {
    if (this.phase === 'intro' || this.phase === 'entering') {
      return id === 'door';
    }
    return id !== 'door';
  }

  private applyHighlight(id: HotspotId): void {
    this.meshesFor(id).forEach((mesh) => {
      mesh.renderOutline = true;
      mesh.outlineColor = ACCENT;
      mesh.outlineWidth = 0.02;
    });
    this.canvas.style.cursor = 'pointer';
  }

  private clearHighlight(): void {
    if (!this.hoveredId) {
      return;
    }
    this.meshesFor(this.hoveredId).forEach((mesh) => {
      mesh.renderOutline = false;
    });
    this.canvas.style.cursor = '';
  }

  private meshesFor(id: HotspotId): Mesh[] {
    if (id === 'door') {
      return this.doorPickable;
    }
    return this.interiorPickable.get(id) ?? [];
  }

  private enterHouse(): void {
    if (this.phase === 'entering') {
      return;
    }
    this.clearHighlight();
    this.hoveredId = null;
    this.callbacks.onHover?.(null);
    this.phase = 'entering';
    this.vhsValue = 1;
    this.doorTween = 0;
    this.callbacks.onEnter?.();
    this.callbacks.onPhase?.('entering');
    this.startTransition(IDLE, 2.7);
    window.setTimeout(() => {
      if (this.disposed) {
        return;
      }
      this.vhsValue = 0.35;
      this.phase = 'idle';
      this.callbacks.onPhase?.('idle');
    }, 2400);
  }

  private startTransition(to: Pose, duration: number): void {
    this.transition = {
      from: { position: this.smoothPosition.clone(), target: this.smoothTarget.clone() },
      to,
      elapsed: 0,
      duration,
    };
    this.goal = to;
  }
}

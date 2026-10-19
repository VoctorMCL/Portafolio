import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Matrix, Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
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
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { ExtrudeShape } from '@babylonjs/core/Meshes/Builders/shapeBuilder';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import '@babylonjs/core/Culling/ray';
import { VHS_SHADER_NAME } from './vhs-post';
import {
  CONSOLE_BOOT,
  CONSOLE_INPUT_MAX,
  CONSOLE_PROMPT,
  CONSOLE_TERM,
  runConsole,
} from './console-engine';
import type { ConsoleContext, ConsoleLine } from './console-engine';
import type { DiscProject } from '../data/github';
import {
  discCanvas,
  discScreenCanvas,
  doormatCanvas,
  heightToNormal,
  planksCanvas,
  posterCanvas,
  rugCanvas,
  screenCanvas,
  sidingCanvas,
  logoPosterCanvas,
  skyCanvas,
  wallCanvas,
  woodCanvas,
  cachedSkillLogos,
} from './textures';
import type { SkillLogo } from './textures';

export type HotspotId = 'door' | 'shelf' | 'tv' | 'desk' | 'terminal';
export type InteriorId = Exclude<HotspotId, 'door' | 'terminal'>;
export type PanelId = Exclude<InteriorId, 'tv'>;
export type ScenePhase = 'intro' | 'entering' | 'idle' | 'focus';
export type ViewId = 'general' | 'tv' | 'desk' | 'shelf';
export type HoverTargetId = HotspotId | 'disc';

export interface HoverInfo {
  id: HoverTargetId;
  discName?: string;
  x: number;
  y: number;
}

type PickTarget = { kind: 'hotspot'; id: HotspotId } | { kind: 'disc'; index: number };

export interface RoomSceneCallbacks {
  onHover?: (info: HoverInfo | null) => void;
  onSelect?: (id: PanelId) => void;
  onDiscSelect?: (project: DiscProject) => void;
  onPhase?: (phase: ScenePhase) => void;
  onConsole?: (open: boolean) => void;
  onConsoleOutput?: () => void;
  onMedia?: (open: boolean) => void;
}

interface Pose {
  position: Vector3;
  target: Vector3;
}

const INTRO: Pose = {
  position: new Vector3(0, 1.55, 8.28),
  target: new Vector3(0, 1.42, 4.6),
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
    position: new Vector3(0.85, 1.55, -1.5),
    target: new Vector3(4.0, 1.62, -1.5),
  },
  desk: {
    position: new Vector3(0, 1.2, -0.4),
    target: new Vector3(0, 1.05, -3.4),
  },
};

const SCREEN_POSE: Pose = {
  position: new Vector3(2.35, 1.14, -1.5),
  target: new Vector3(3.46, 1.05, -1.55),
};

const MEDIA_WALL_X = 4.0;
const MAX_DISCS = 24;
const RACK_COLS = 6;
const RACK_ROWS = 4;
const RACK_COL_GAP = 0.38;
const RACK_ROW_GAP = 0.3;
const RACK_TOP_Y = 2.42;
const DISC_RADIUS = 0.14;
const DVD_SLOT = new Vector3(3.52, 0.85, -0.75);

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

type Point3 = [number, number, number];

function chamferBox(name: string, w: number, h: number, d: number, scene: Scene): Mesh {
  const hx = w / 2;
  const hy = h / 2;
  const hz = d / 2;
  const c = Math.min(0.025, hx, hy, hz) * 0.35;
  const ex = hx - c;
  const ey = hy - c;
  const ez = hz - c;
  const extents: Point3 = [hx, hy, hz];
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const sub = (a: Point3, b: Point3): Point3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a: Point3, b: Point3): Point3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const dot = (a: Point3, b: Point3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  const addTri = (a: Point3, b0: Point3, c0: Point3, uvAxes: [number, number]): void => {
    let b = b0;
    let c = c0;
    const centroid: Point3 = [
      (a[0] + b0[0] + c0[0]) / 3,
      (a[1] + b0[1] + c0[1]) / 3,
      (a[2] + b0[2] + c0[2]) / 3,
    ];
    if (dot(cross(sub(b0, a), sub(c0, a)), centroid) < 0) {
      b = c0;
      c = b0;
    }
    const base = positions.length / 3;
    for (const p of [a, b, c]) {
      positions.push(p[0], p[1], p[2]);
      uvs.push((p[uvAxes[0]] / extents[uvAxes[0]] + 1) / 2, (p[uvAxes[1]] / extents[uvAxes[1]] + 1) / 2);
    }
    indices.push(base, base + 1, base + 2);
  };

  const addQuad = (a: Point3, b: Point3, c: Point3, d: Point3, uvAxes: [number, number]): void => {
    addTri(a, b, c, uvAxes);
    addTri(a, c, d, uvAxes);
  };

  for (const sx of [-1, 1]) {
    addQuad(
      [sx * hx, ey, -ez],
      [sx * hx, ey, ez],
      [sx * hx, -ey, ez],
      [sx * hx, -ey, -ez],
      [1, 2],
    );
  }
  for (const sy of [-1, 1]) {
    addQuad(
      [ex, sy * hy, -ez],
      [ex, sy * hy, ez],
      [-ex, sy * hy, ez],
      [-ex, sy * hy, -ez],
      [0, 2],
    );
  }
  for (const sz of [-1, 1]) {
    addQuad(
      [-ex, ey, sz * hz],
      [ex, ey, sz * hz],
      [ex, -ey, sz * hz],
      [-ex, -ey, sz * hz],
      [0, 1],
    );
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      addQuad(
        [sx * hx, sy * ey, -ez],
        [sx * hx, sy * ey, ez],
        [sx * ex, sy * hy, ez],
        [sx * ex, sy * hy, -ez],
        [2, 0],
      );
    }
  }
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addQuad(
        [-ex, sy * hy, sz * ez],
        [ex, sy * hy, sz * ez],
        [ex, sy * ey, sz * hz],
        [-ex, sy * ey, sz * hz],
        [0, 2],
      );
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addQuad(
        [sx * hx, -ey, sz * ez],
        [sx * hx, ey, sz * ez],
        [sx * ex, ey, sz * hz],
        [sx * ex, -ey, sz * hz],
        [1, 2],
      );
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        addTri([sx * hx, sy * ey, sz * ez], [sx * ex, sy * hy, sz * ez], [sx * ex, sy * ey, sz * hz], [0, 1]);
      }
    }
  }

  const mesh = new Mesh(name, scene);
  const vd = new VertexData();
  vd.positions = positions;
  vd.indices = indices;
  vd.uvs = uvs;
  VertexData.ComputeNormals(positions, indices, (vd.normals = []));
  vd.applyToMesh(mesh);
  return mesh;
}

export class RoomScene {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: FreeCamera;

  private readonly doorPickable: Mesh[] = [];
  private readonly interiorPickable = new Map<InteriorId, Mesh[]>();

  private readonly smoothPosition = new Vector3();
  private readonly smoothTarget = new Vector3();

  private readonly glow: GlowLayer;
  private readonly pipeline: DefaultRenderingPipeline;
  private readonly vhs: PostProcess;
  private shadow?: ShadowGenerator;
  private ssao?: SSAO2RenderingPipeline;
  private lowQuality = false;
  private fpsFrames = 0;
  private fpsTime = 0;
  private slowWindows = 0;

  private transition?: { from: Pose; to: Pose; elapsed: number; duration: number };
  private doorPivot?: TransformNode;
  private doorTween?: number;
  private elevatorLeft?: Mesh;
  private elevatorRight?: Mesh;
  private elevatorT = 0;
  private elevatorOpening = false;
  private chairRoot?: TransformNode;
  private chairT = 0;
  private static readonly CHAIR_HOME = new Vector3(0, 0, -2.2);
  private static readonly CHAIR_PARK = new Vector3(1.85, 0, -2.3);
  private static readonly CHAIR_PARK_YAW = -1;
  private phase: ScenePhase = 'intro';
  private goal: Pose = INTRO;
  private hoveredId: HotspotId | null = null;
  private hoveredDisc: number | null = null;
  private vhsValue = 1;
  private elapsed = 0;
  private texCounter = 0;
  private disposed = false;
  private paused = false;
  private pickPending: PointerEvent | null = null;
  private pickScheduled = false;
  private tapStart: { x: number; y: number } | null = null;
  private viewScale = 1;
  private readonly viewOffset = new Vector3();
  private readonly coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  private readonly tone = this.coarsePointer
    ? { exposure: 2.3, vhsVignette: 0.02, ipVignette: 0.4, hemi: 1.05, moon: 1.6, fill: 1.0, shadowDarkness: 0.22, env: 1.35, contrast: 1.16, lift: 0.05 }
    : { exposure: 1.45, vhsVignette: 0.14, ipVignette: 1.6, hemi: 0.46, moon: 1.05, fill: 0.44, shadowDarkness: 0.42, env: 0.8, contrast: 1.28, lift: 0.03 };

  private discs: Mesh[] = [];
  private discHomes: Vector3[] = [];
  private discProjects: DiscProject[] = [];
  private discTweens: Array<{ mesh: Mesh; from: Vector3; to: Vector3; elapsed: number; duration: number; hideAtEnd: boolean }> = [];
  private mediaOpen = false;
  private posterPool?: SkillLogo[];
  private loadedDisc: number | null = null;
  private tvScreenMat?: PBRMaterial;
  private tvScreenTexture?: DynamicTexture;

  private termScreenMat?: PBRMaterial;
  private outScreenMat?: PBRMaterial;
  private termCanvas = document.createElement('canvas');
  private outCanvas = document.createElement('canvas');
  private termTexture?: DynamicTexture;
  private outTexture?: DynamicTexture;
  private consoleOpen = false;
  private consoleInput = '';
  private consoleCursor = true;
  private lastCursor = 0;
  private consoleOut: ConsoleLine[] = [];
  private consoleEcho: string[] = [];
  private consoleHistory: string[] = [];
  private consoleHistIndex = -1;
  private consoleCtx?: ConsoleContext;
  private readonly consoleKeyHandler = (ev: KeyboardEvent): void => {
    this.handleConsoleKey(ev);
  };
  private consoleKeysAttached = false;
  private keyboardEnabled = true;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: RoomSceneCallbacks = {},
  ) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false }, false);
    const dpr = window.devicePixelRatio || 1;
    this.engine.setHardwareScalingLevel(1 / Math.min(dpr, this.coarsePointer ? 1.25 : 2));
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.02, 0.01, 0.05, 1);
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogColor = hex('#0b0720');
    this.scene.fogDensity = 0.014;

    this.camera = new FreeCamera('pov', INTRO.position.clone(), this.scene);
    this.camera.fov = RoomScene.BASE_FOV;
    this.camera.minZ = 0.08;
    this.camera.maxZ = 320;
    this.smoothPosition.copyFrom(INTRO.position);
    this.smoothTarget.copyFrom(INTRO.target);
    this.camera.position.copyFrom(this.smoothPosition);
    this.camera.setTarget(this.smoothTarget);

    this.glow = new GlowLayer('glow', this.scene, {
      blurKernelSize: this.coarsePointer ? 16 : 32,
      mainTextureRatio: this.coarsePointer ? 0.25 : 0.5,
    });
    this.glow.intensity = 0.35;

    this.buildEnvironment();
    this.buildExterior();
    this.buildInterior();
    this.buildHallway();
    this.buildLights();

    if (!this.coarsePointer) {
      try {
        if (SSAO2RenderingPipeline.IsSupported) {
          const ssao = new SSAO2RenderingPipeline('ssao2', this.scene, { ssaoRatio: 0.5, blurRatio: 1 }, [this.camera]);
          ssao.radius = 0.8;
          ssao.totalStrength = 0.9;
          ssao.maxZ = 25;
          ssao.bilateralSoften = 0.5;
          this.ssao = ssao;
        }
      } catch (error) {
        console.warn('SSAO no disponible:', error);
      }
    }

    this.pipeline = new DefaultRenderingPipeline('pipe', true, this.scene, [this.camera]);
    this.pipeline.fxaaEnabled = true;
    this.pipeline.samples = this.coarsePointer ? 1 : 4;
    this.pipeline.bloomEnabled = true;
    this.pipeline.bloomThreshold = 0.72;
    this.pipeline.bloomWeight = 0.09;
    this.pipeline.bloomKernel = this.coarsePointer ? 12 : 24;
    this.pipeline.bloomScale = 1.0;
    this.pipeline.sharpenEnabled = !this.coarsePointer;
    this.pipeline.sharpen.edgeAmount = 0.22;
    this.pipeline.sharpen.colorAmount = 1;
    this.pipeline.imageProcessing.toneMappingEnabled = true;
    this.pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.pipeline.imageProcessing.contrast = this.tone.contrast;
    this.pipeline.imageProcessing.exposure = this.tone.exposure;
    this.pipeline.imageProcessing.ditheringEnabled = true;
    this.pipeline.imageProcessing.ditheringIntensity = 0.04;
    this.pipeline.imageProcessing.vignetteEnabled = true;
    this.pipeline.imageProcessing.vignetteWeight = this.tone.ipVignette;
    this.pipeline.imageProcessing.vignetteColor = new Color4(0.02, 0.0, 0.07, 0);
    this.pipeline.grainEnabled = true;
    this.pipeline.grain.intensity = this.coarsePointer ? 3 : 5;
    this.pipeline.grain.animated = !this.coarsePointer;
    this.pipeline.chromaticAberrationEnabled = true;
    this.pipeline.chromaticAberration.aberrationAmount = 12;
    this.pipeline.chromaticAberration.radialIntensity = 0.4;

    this.vhs = new PostProcess(
      'vhs',
      VHS_SHADER_NAME,
      ['uTime', 'uVhs', 'uVignette', 'uResolution', 'uLift'],
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
      effect.setFloat('uVignette', this.tone.vhsVignette);
      effect.setFloat('uLift', this.tone.lift);
      effect.setVector2('uResolution', new Vector2(this.engine.getRenderWidth(), this.engine.getRenderHeight()));
    };

    this.attachEvents();
    this.updateViewport();
    this.freezeStaticMatrices();
    this.engine.runRenderLoop(() => this.render());
  }

  private static readonly BASE_FOV = (52 * Math.PI) / 180;
  private static readonly MAX_FOV = (78 * Math.PI) / 180;

  private updateViewport(): void {
    this.engine.resize();
    const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
    this.camera.fov =
      aspect >= 1
        ? RoomScene.BASE_FOV
        : Math.min(RoomScene.MAX_FOV, 2 * Math.atan(Math.tan(RoomScene.BASE_FOV / 2) / aspect));

    const width = window.innerWidth || this.engine.getRenderWidth();
    const height = Math.max(1, window.innerHeight || this.engine.getRenderHeight());
    const cssAspect = width / height;
    this.viewScale =
      cssAspect >= 1.1 ? 1 : Math.min(1.34, 1 + (1.1 - cssAspect) * (cssAspect < 0.75 ? 0.62 : 0.4));
  }

  pause(): void {
    if (this.paused) {
      return;
    }
    this.paused = true;
    this.engine.stopRenderLoop();
  }

  resume(): void {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    this.engine.runRenderLoop(() => this.render());
  }

  setPhase(phase: ScenePhase): void {
    if (phase === 'focus') {
      return;
    }
    this.exitConsole();
    this.resetMedia();
    this.phase = phase;
    this.goal = phase === 'intro' ? INTRO : IDLE;
    this.callbacks.onPhase?.(phase);
  }

  focus(id: InteriorId): void {
    this.exitConsole();
    this.resetMedia();
    this.phase = 'focus';
    this.goal = FOCUS[id];
    this.callbacks.onPhase?.('focus');
  }

  setView(view: ViewId): void {
    if (view === 'general') {
      this.returnToIdle();
      return;
    }
    if (view === 'tv') {
      this.openDiscRack();
      return;
    }
    this.focus(view);
  }

  returnToIdle(): void {
    this.exitConsole();
    this.resetMedia();
    this.phase = 'idle';
    this.goal = IDLE;
    this.callbacks.onPhase?.('idle');
  }

  setProjects(projects: DiscProject[]): void {
    this.discProjects = projects.slice(0, MAX_DISCS);
    this.buildDiscMeshes();
  }

  private attachConsoleKeys(): void {
    if (this.consoleKeysAttached || !this.keyboardEnabled) {
      return;
    }
    document.addEventListener('keydown', this.consoleKeyHandler, true);
    this.consoleKeysAttached = true;
  }

  private detachConsoleKeys(): void {
    if (!this.consoleKeysAttached) {
      return;
    }
    document.removeEventListener('keydown', this.consoleKeyHandler, true);
    this.consoleKeysAttached = false;
  }

  setKeyboardEnabled(enabled: boolean): void {
    if (this.keyboardEnabled === enabled) {
      return;
    }
    this.keyboardEnabled = enabled;
    if (!enabled) {
      this.detachConsoleKeys();
    } else if (this.consoleOpen) {
      this.attachConsoleKeys();
    }
  }

  ejectDisc(): void {
    if (this.loadedDisc === null) {
      for (let i = 0; i < this.discs.length; i++) {
        const mesh = this.discs[i];
        mesh.position.copyFrom(this.discHomes[i]);
        mesh.setEnabled(true);
      }
      this.discTweens = [];
      this.setMediaOpen(false);
      this.setScreen(null);
      return;
    }
    const index = this.loadedDisc;
    const mesh = this.discs[index];
    this.loadedDisc = null;
    this.setScreen(null);
    if (mesh) {
      mesh.setEnabled(true);
      this.discTweens = this.discTweens.filter((t) => t.mesh !== mesh);
      this.discTweens.push({ mesh, from: mesh.position.clone(), to: this.discHomes[index].clone(), elapsed: 0, duration: 0.5, hideAtEnd: false });
    }
    if (this.mediaOpen) {
      this.startTransition(FOCUS.tv, 0.7);
    }
  }

  private openDiscRack(): void {
    this.exitConsole();
    this.resetMedia();
    this.phase = 'focus';
    this.goal = FOCUS.tv;
    this.setMediaOpen(true);
    this.callbacks.onPhase?.('focus');
  }

  private setMediaOpen(open: boolean): void {
    if (this.mediaOpen === open) {
      return;
    }
    this.mediaOpen = open;
    this.callbacks.onMedia?.(open);
  }

  private resetMedia(): void {
    for (let i = 0; i < this.discs.length; i++) {
      this.discs[i].position.copyFrom(this.discHomes[i]);
      this.discs[i].setEnabled(true);
    }
    if (this.loadedDisc !== null) {
      this.setScreen(null);
    }
    this.loadedDisc = null;
    this.setMediaOpen(false);
    this.discTweens = [];
  }

  private buildDiscMeshes(): void {
    this.discTweens = [];
    this.loadedDisc = null;
    this.hoveredDisc = null;
    for (const mesh of this.discs) {
      mesh.material?.dispose(true, true);
      mesh.dispose();
    }
    this.discs = [];
    this.discHomes = [];

    this.discProjects.forEach((project, index) => {
      const home = this.discSlotPosition(index);
      const mesh = CreateCylinder(
        `disc-${index}`,
        { height: 0.022, diameter: DISC_RADIUS * 2, tessellation: 64 },
        this.scene,
      );
      mesh.rotation.z = Math.PI / 2;
      mesh.bakeCurrentTransformIntoVertices();
      mesh.position.copyFrom(home);

      const mat = new PBRMaterial(`discMat-${index}`, this.scene);
      mat.albedoColor = Color3.Black();
      mat.emissiveColor = Color3.White();
      mat.emissiveIntensity = 0.42;
      mat.metallic = 0.72;
      mat.roughness = 0.34;
      mat.maxSimultaneousLights = 6;
      const tex = this.texture(discCanvas(project.title, project.accent));
      mat.albedoTexture = tex;
      mat.emissiveTexture = tex;
      mesh.material = mat;
      mesh.metadata = { discIndex: index };

      this.discs.push(mesh);
      this.discHomes.push(home.clone());
    });
  }

  private discSlotPosition(index: number): Vector3 {
    const col = index % RACK_COLS;
    const row = Math.floor(index / RACK_COLS) % RACK_ROWS;
    const z = -1.5 + (col - (RACK_COLS - 1) / 2) * RACK_COL_GAP;
    const y = RACK_TOP_Y - row * RACK_ROW_GAP;
    return new Vector3(MEDIA_WALL_X, y, z);
  }

  private updateDisc(dt: number): void {
    if (this.discTweens.length === 0) {
      return;
    }
    for (let i = this.discTweens.length - 1; i >= 0; i--) {
      const tween = this.discTweens[i];
      tween.elapsed += dt;
      const t = Math.min(1, tween.elapsed / tween.duration);
      Vector3.LerpToRef(tween.from, tween.to, easeInOutCubic(t), tween.mesh.position);
      if (t >= 1) {
        tween.mesh.setEnabled(!tween.hideAtEnd);
        this.discTweens.splice(i, 1);
      }
    }
  }

  private insertDisc(index: number): void {
    this.exitConsole();
    const project = this.discProjects[index];
    if (!project) {
      return;
    }
    const mesh = this.discs[index];
    if (!mesh) {
      return;
    }
    if (this.loadedDisc !== null && this.loadedDisc !== index) {
      const prevIndex = this.loadedDisc;
      const prevMesh = this.discs[prevIndex];
      if (prevMesh) {
        prevMesh.setEnabled(true);
        this.discTweens = this.discTweens.filter((t) => t.mesh !== prevMesh);
        this.discTweens.push({ mesh: prevMesh, from: prevMesh.position.clone(), to: this.discHomes[prevIndex].clone(), elapsed: 0, duration: 0.5, hideAtEnd: false });
      }
    }
    this.discTweens = this.discTweens.filter((t) => t.mesh !== mesh);
    mesh.setEnabled(true);
    mesh.position.copyFrom(this.discHomes[index]);
    this.discTweens.push({ mesh, from: this.discHomes[index].clone(), to: DVD_SLOT.clone(), elapsed: 0, duration: 0.6, hideAtEnd: true });
    this.loadedDisc = index;
    this.setMediaOpen(true);
    this.clearHighlights();
    this.callbacks.onHover?.(null);
    this.setScreen(discScreenCanvas(project));
    this.startTransition(SCREEN_POSE, 0.9);
    this.callbacks.onDiscSelect?.(project);
  }

  private setScreen(canvas: HTMLCanvasElement | null): void {
    if (!this.tvScreenMat) {
      return;
    }
    this.tvScreenTexture?.dispose();
    this.tvScreenTexture = this.texture(canvas ?? screenCanvas(), 1, 1, false, true, false);
    this.tvScreenMat.emissiveTexture = this.tvScreenTexture;
  }

  dispose(): void {
    this.disposed = true;
    this.detachEvents();
    this.detachConsoleKeys();
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

    if (this.consoleOpen && this.elapsed - this.lastCursor > 0.6) {
      this.lastCursor = this.elapsed;
      this.consoleCursor = !this.consoleCursor;
      this.updateTermScreen();
    }

    this.updateDoor(dt);
    this.updateElevator(dt);
    this.updateDisc(dt);
    this.updateChair(dt);
    this.updateCamera(dt);
    this.sampleFps(dt);

    this.scene.render();
  }

  private sampleFps(dt: number): void {
    if (this.lowQuality) {
      return;
    }
    this.fpsFrames += 1;
    this.fpsTime += dt;
    if (this.fpsTime < 1.5) {
      return;
    }
    const fps = this.fpsFrames / this.fpsTime;
    this.fpsFrames = 0;
    this.fpsTime = 0;
    if (this.elapsed < 3) {
      return;
    }
    if (fps >= 45) {
      this.slowWindows = 0;
      return;
    }
    this.slowWindows += 1;
    if (this.slowWindows >= 2) {
      this.applyLowQuality();
    }
  }

  private freezeStaticMatrices(): void {
    const animated = new Set<TransformNode | Mesh>();
    if (this.doorPivot) {
      animated.add(this.doorPivot);
    }
    if (this.elevatorLeft) {
      animated.add(this.elevatorLeft);
    }
    if (this.elevatorRight) {
      animated.add(this.elevatorRight);
    }
    if (this.chairRoot) {
      animated.add(this.chairRoot);
    }
    this.discs.forEach((disc) => animated.add(disc));
    for (const mesh of this.scene.meshes) {
      let node: TransformNode | null = mesh;
      let isAnimated = false;
      while (node) {
        if (animated.has(node)) {
          isAnimated = true;
          break;
        }
        node = node.parent as TransformNode | null;
      }
      if (isAnimated) {
        continue;
      }
      mesh.freezeWorldMatrix();
      mesh.doNotSyncBoundingInfo = true;
    }
  }

  private applyLowQuality(): void {
    if (this.lowQuality) {
      return;
    }
    this.lowQuality = true;
    if (this.ssao) {
      this.ssao.dispose();
      this.ssao = undefined;
    }
    this.pipeline.samples = 1;
    this.pipeline.sharpenEnabled = false;
    this.pipeline.bloomKernel = 8;
    this.pipeline.bloomWeight = 0.06;
    this.pipeline.grain.animated = false;
    this.pipeline.grain.intensity = 3;
    this.glow.blurKernelSize = 12;
    if (this.shadow) {
      this.shadow.mapSize = 512;
      this.shadow.blurKernel = 8;
      const map = this.shadow.getShadowMap();
      if (map) {
        map.refreshRate = 30;
      }
    }
    const dpr = window.devicePixelRatio || 1;
    this.engine.setHardwareScalingLevel(1 / Math.min(dpr, this.coarsePointer ? 1 : 1.3));
    this.freezeStaticMatrices();
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
    this.smoothPosition.subtractToRef(this.smoothTarget, this.viewOffset).scaleInPlace(this.viewScale);
    this.camera.position.copyFrom(this.smoothTarget).addInPlace(this.viewOffset);
    this.camera.position.y += bob;
    this.camera.setTarget(this.smoothTarget);
  }

  private updateDoor(dt: number): void {
    if (!this.doorPivot || this.doorTween === undefined) {
      return;
    }
    const target = Math.PI * 0.62;
    this.doorTween = Math.min(1, this.doorTween + dt / 1.5);
    this.doorPivot.rotation.y = easeInOutCubic(this.doorTween) * target;
  }

  private updateElevator(dt: number): void {
    if (!this.elevatorLeft || !this.elevatorRight || !this.elevatorOpening) {
      return;
    }
    this.elevatorT = Math.min(1, this.elevatorT + dt / 1.0);
    const offset = 0.53 + this.elevatorT * 1.06;
    this.elevatorLeft.position.x = -offset;
    this.elevatorRight.position.x = offset;
  }

  private updateChair(dt: number): void {
    if (!this.chairRoot) {
      return;
    }
    const target = this.goal === FOCUS.desk ? 1 : 0;
    const step = dt / 0.9;
    this.chairT = target === 1 ? Math.min(1, this.chairT + step) : Math.max(0, this.chairT - step);
    const e = easeInOutCubic(this.chairT);
    Vector3.LerpToRef(RoomScene.CHAIR_HOME, RoomScene.CHAIR_PARK, e, this.chairRoot.position);
    this.chairRoot.rotation.y = RoomScene.CHAIR_PARK_YAW * e;
  }

  private texture(
    canvas: HTMLCanvasElement,
    uScale = 1,
    vScale = 1,
    linear = false,
    flipU = false,
    flipV = false,
  ): DynamicTexture {
    const dt = new DynamicTexture(`tex-${this.texCounter++}`, { width: canvas.width, height: canvas.height }, this.scene, true);
    dt.getContext().drawImage(canvas, 0, 0);
    dt.update();
    dt.uScale = flipU ? -uScale : uScale;
    dt.vScale = flipV ? -vScale : vScale;
    if (flipU) dt.uOffset = 1;
    if (flipV) dt.vOffset = 1;
    dt.wrapU = Texture.WRAP_ADDRESSMODE;
    dt.wrapV = Texture.WRAP_ADDRESSMODE;
    dt.anisotropicFilteringLevel = this.coarsePointer ? 4 : 16;
    if (linear) {
      dt.gammaSpace = false;
    }
    return dt;
  }

  private posterPoolShuffled(): SkillLogo[] {
    if (!this.posterPool) {
      const a = [...cachedSkillLogos()];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      this.posterPool = a;
    }
    return this.posterPool;
  }

  private posterTexture(skill: SkillLogo): DynamicTexture {
    let dt: DynamicTexture | undefined;
    const canvas = logoPosterCanvas(skill, () => {
      if (!dt) return;
      dt.getContext().drawImage(canvas, 0, 0);
      dt.update();
    });
    dt = this.texture(canvas);
    return dt;
  }

  private addPoster(name: string, skill: SkillLogo, w: number, h: number, pos: Vector3, rotY: number): void {
    const plane = CreatePlane(name, { width: w, height: h }, this.scene);
    plane.position.copyFrom(pos);
    plane.rotation.y = rotY;
    plane.metadata = { skill: skill.slug, label: skill.label };
    const mat = new PBRMaterial(`${name}Mat`, this.scene);
    mat.albedoColor = Color3.Black();
    mat.emissiveColor = Color3.White();
    mat.emissiveIntensity = 0.55;
    mat.emissiveTexture = this.posterTexture(skill);
    mat.metallic = 0;
    mat.roughness = 1;
    mat.backFaceCulling = true;
    mat.maxSimultaneousLights = 6;
    plane.material = mat;
  }

  private bump(mat: PBRMaterial, source: HTMLCanvasElement, uScale = 1, vScale = 1, strength = 2): void {
    mat.bumpTexture = this.texture(heightToNormal(source, strength), uScale, vScale, true);
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
    mat.maxSimultaneousLights = 6;
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
    mat.maxSimultaneousLights = 6;
    return mat;
  }

  private box(name: string, size: { w: number; h: number; d: number }, pos: Vector3, mat: PBRMaterial): Mesh {
    const mesh = chamferBox(name, size.w, size.h, size.d, this.scene);
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
      this.scene.environmentIntensity = this.tone.env;
    } catch (error) {
      console.warn('Sin environment map:', error);
    }
  }

  private buildExterior(): void {
    const sidingSrc = sidingCanvas();
    const siding = this.pbr('siding', '#ffffff', { roughness: 0.85 });
    siding.albedoTexture = this.texture(sidingSrc, 3, 2);
    this.bump(siding, sidingSrc, 3, 2, 2.5);

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

    const skyMat = new StandardMaterial('skyMat', this.scene);
    skyMat.disableLighting = true;
    skyMat.emissiveTexture = this.texture(skyCanvas());
    skyMat.backFaceCulling = false;
    skyMat.fogEnabled = false;
    const sky = CreateSphere('sky', { diameter: 300, segments: 12, sideOrientation: Mesh.BACKSIDE }, this.scene);
    sky.material = skyMat;
    this.glow.addExcludedMesh(sky);
  }

  private buildInterior(): void {
    const wallSrc = wallCanvas();
    const wallMat = this.pbr('wall', '#ffffff', { roughness: 0.95 });
    wallMat.albedoTexture = this.texture(wallSrc, 3, 1.5);
    this.bump(wallMat, wallSrc, 3, 1.5, 1.5);

    const floorSrc = planksCanvas();
    const floorMat = this.pbr('floor', '#ffffff', { roughness: 0.55 });
    floorMat.albedoTexture = this.texture(floorSrc, 2, 2);
    this.bump(floorMat, floorSrc, 2, 2, 3);

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

  private buildHallway(): void {
    const hallWallSrc = wallCanvas();
    const hallWall = this.pbr('hallWall', '#ffffff', { roughness: 0.95 });
    hallWall.albedoTexture = this.texture(hallWallSrc, 2, 1);
    this.bump(hallWall, hallWallSrc, 2, 1, 1.5);

    const hallFloorSrc = planksCanvas();
    const hallFloorMat = this.pbr('hallFloorMat', '#ffffff', { roughness: 0.55 });
    hallFloorMat.albedoTexture = this.texture(hallFloorSrc, 1, 2);
    this.bump(hallFloorMat, hallFloorSrc, 1, 2, 3);

    const hallFloor = CreateGround('hallFloor', { width: 2.44, height: 4.76, subdivisions: 2 }, this.scene);
    hallFloor.material = hallFloorMat;
    hallFloor.position = new Vector3(0, 0.002, 6.28);

    const hallCeil = CreateGround('hallCeil', { width: 2.44, height: 4.76, subdivisions: 1 }, this.scene);
    hallCeil.material = hallWall;
    hallCeil.position = new Vector3(0, 2.7, 6.28);
    hallCeil.rotation.x = Math.PI;

    this.box('hallWallL', { w: 0.12, h: 2.7, d: 4.76 }, new Vector3(-1.11, 1.35, 6.28), hallWall);
    this.box('hallWallR', { w: 0.12, h: 2.7, d: 4.76 }, new Vector3(1.11, 1.35, 6.28), hallWall);
    this.box('hallEnd', { w: 2.44, h: 2.7, d: 0.12 }, new Vector3(0, 1.35, 8.66), hallWall);

    const hallBase = this.pbr('hallBase', '#0e0d16', { roughness: 0.6 });
    this.box('hallBaseL', { w: 0.05, h: 0.16, d: 4.7 }, new Vector3(-1.06, 0.08, 6.25), hallBase);
    this.box('hallBaseR', { w: 0.05, h: 0.16, d: 4.7 }, new Vector3(1.06, 0.08, 6.25), hallBase);

    this.box('hallCoverL', { w: 0.39, h: 2.7, d: 0.06 }, new Vector3(-0.855, 1.35, 4.03), hallWall);
    this.box('hallCoverR', { w: 0.39, h: 2.7, d: 0.06 }, new Vector3(0.855, 1.35, 4.03), hallWall);
    this.box('hallCoverT', { w: 2.1, h: 0.4, d: 0.06 }, new Vector3(0, 2.5, 4.03), hallWall);

    const doormat = this.slab('doormat', 1.3, 0.7, 0.03, 0.05, new Vector3(0, 0.02, 4.45), this.pbr('doormatMat', '#ffffff', { roughness: 1 }));
    (doormat.material as PBRMaterial).albedoTexture = this.texture(doormatCanvas());

    const runner = this.slab('hallRunner', 0.9, 2.4, 0.02, 0.06, new Vector3(0, 0.013, 6.15), this.pbr('hallRunnerMat', '#ffffff', { roughness: 1 }));
    (runner.material as PBRMaterial).albedoTexture = this.texture(rugCanvas());

    const hallSkills = this.posterPoolShuffled().slice(0, 4);
    const hallPosters: { skill: SkillLogo; w: number; h: number; pos: Vector3; rotY: number }[] = [
      { skill: hallSkills[0], w: 0.4, h: 0.56, pos: new Vector3(-1.04, 1.5, 5.3), rotY: -Math.PI / 2 },
      { skill: hallSkills[1], w: 0.4, h: 0.56, pos: new Vector3(-1.04, 1.55, 6.2), rotY: -Math.PI / 2 },
      { skill: hallSkills[2], w: 0.42, h: 0.58, pos: new Vector3(1.04, 1.5, 5.9), rotY: Math.PI / 2 },
      { skill: hallSkills[3], w: 0.4, h: 0.56, pos: new Vector3(1.04, 1.52, 6.9), rotY: Math.PI / 2 },
    ];
    hallPosters.forEach((p, i) => {
      this.addPoster(`hallPoster${i}`, p.skill, p.w, p.h, p.pos, p.rotY);
    });

    const plate = this.box('hallPlate', { w: 0.14, h: 0.18, d: 0.04 }, new Vector3(0.9, 1.6, 4.09), this.pbr('hallPlateMat', '#161428', { roughness: 0.4, metallic: 0.4 }));
    void plate;

    [5.3, 6.7].forEach((z, i) => {
      const fixture = CreateCylinder('hallLamp' + i, { height: 0.04, diameter: 0.24, tessellation: 20 }, this.scene);
      fixture.position = new Vector3(0, 2.67, z);
      fixture.material = this.emissive('hallLampMat' + i, hex('#ffd9a0'), 1.4);
      const light = new PointLight('hallPt' + i, new Vector3(0, 2.45, z), this.scene);
      light.diffuse = hex('#ffc9a0');
      light.intensity = 5;
      light.range = 6;
    });

    const metal = this.pbr('elevMetal', '#9aa2ae', { roughness: 0.32, metallic: 0.9 });
    const metalDark = this.pbr('elevMetalDark', '#5a606c', { roughness: 0.4, metallic: 0.8 });

    this.box('elevBack', { w: 2.1, h: 2.62, d: 0.05 }, new Vector3(0, 1.31, 8.57), metal);
    this.box('elevSideL', { w: 0.04, h: 2.56, d: 1.05 }, new Vector3(-1.03, 1.28, 8.02), metal);
    this.box('elevSideR', { w: 0.04, h: 2.56, d: 1.05 }, new Vector3(1.03, 1.28, 8.02), metal);
    this.box('elevCeil', { w: 2.1, h: 0.04, d: 1.1 }, new Vector3(0, 2.66, 8.05), metal);
    this.box('elevFloor', { w: 2.1, h: 0.02, d: 1.1 }, new Vector3(0, 0.012, 8.05), metalDark);
    this.box('elevThreshold', { w: 2.1, h: 0.024, d: 0.1 }, new Vector3(0, 0.012, 7.5), metal);
    this.box('elevHeader', { w: 2.1, h: 0.42, d: 0.14 }, new Vector3(0, 2.49, 7.5), metalDark);

    const elevLightPanel = this.box('elevLightPanel', { w: 0.8, h: 0.02, d: 0.5 }, new Vector3(0, 2.62, 8.05), this.emissive('elevLightPanelMat', hex('#dfe8ff'), 1.3));
    void elevLightPanel;
    const cabinLight = new PointLight('elevLight', new Vector3(0, 2.4, 8.0), this.scene);
    cabinLight.diffuse = hex('#dfe8ff');
    cabinLight.intensity = 3.5;
    cabinLight.range = 4.5;

    const elevDoorMat = this.pbr('elevDoorMat', '#aab0bc', { roughness: 0.28, metallic: 0.95 });
    const left = this.box('elevDoorL', { w: 1.06, h: 2.3, d: 0.06 }, new Vector3(0, 1.15, 7.48), elevDoorMat);
    const right = this.box('elevDoorR', { w: 1.06, h: 2.3, d: 0.06 }, new Vector3(0, 1.15, 7.48), elevDoorMat);
    this.elevatorLeft = left;
    this.elevatorRight = right;
    left.position.x = -(0.53 + this.elevatorT * 1.06);
    right.position.x = 0.53 + this.elevatorT * 1.06;

    const stripMat = this.emissive('elevStripMat', NEON_CYAN, 1.2);
    const stripL = this.box('elevStripL', { w: 0.86, h: 0.02, d: 0.012 }, new Vector3(0, 0.7, 0.037), stripMat);
    stripL.parent = left;
    const stripR = this.box('elevStripR', { w: 0.86, h: 0.02, d: 0.012 }, new Vector3(0, 0.7, 0.037), stripMat);
    stripR.parent = right;

    left.metadata = { hotspotId: 'door' as HotspotId };
    right.metadata = { hotspotId: 'door' as HotspotId };
    this.doorPickable.push(left, right);

    const callPanel = this.box('elevCall', { w: 0.05, h: 0.42, d: 0.16 }, new Vector3(1.02, 1.2, 6.9), metalDark);
    callPanel.metadata = { hotspotId: 'door' as HotspotId };
    this.doorPickable.push(callPanel);
    [1.32, 1.2, 1.08].forEach((y, i) => {
      const btn = CreateCylinder('elevBtn' + i, { height: 0.02, diameter: 0.05, tessellation: 16 }, this.scene);
      btn.rotation.z = Math.PI / 2;
      btn.position = new Vector3(0.99, y, 6.9);
      btn.material = this.emissive('elevBtnMat' + i, i === 0 ? NEON_PINK : hex('#cfe0ff'), 1.2);
      btn.metadata = { hotspotId: 'door' as HotspotId };
      this.doorPickable.push(btn);
    });
  }

  private initConsole(): void {
    this.termCanvas.width = 512;
    this.termCanvas.height = 320;
    this.outCanvas.width = 512;
    this.outCanvas.height = 320;
    this.consoleOut = CONSOLE_BOOT.slice();
    this.consoleEcho = [];
    this.consoleInput = '';
    this.consoleCursor = true;
    this.lastCursor = 0;
    this.consoleHistory = [];
    this.consoleHistIndex = -1;
    this.updateTermScreen();
    this.updateOutScreen();
    this.notifyConsole();
  }

  private buildDesk(): void {
    const deskSrc = woodCanvas();
    const wood = this.pbr('deskWood', '#ffffff', { roughness: 0.45 });
    wood.albedoTexture = this.texture(deskSrc, 1.5, 1);
    this.bump(wood, deskSrc, 1.5, 1, 3.5);
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

    const monitorStand = CreateCylinder('monStand', { height: 0.3, diameter: 0.36, tessellation: 16 }, this.scene);
    monitorStand.position = new Vector3(0, 0.92, -3.38);
    monitorStand.material = metal;
    const monitorBase = this.slab('monBase', 0.58, 0.32, 0.03, 0.06, new Vector3(0, 0.79, -3.38), metal);

    const bezel = this.pbr('bezel', '#0a0a12', { roughness: 0.4, metallic: 0.3 });

    const termScreenMat = new PBRMaterial('termScreenMat', this.scene);
    this.termScreenMat = termScreenMat;
    termScreenMat.albedoColor = Color3.Black();
    termScreenMat.emissiveColor = Color3.White();
    termScreenMat.emissiveIntensity = 1.55;
    termScreenMat.metallic = 0;
    termScreenMat.roughness = 1;
    termScreenMat.maxSimultaneousLights = 6;
    termScreenMat.clearCoat.isEnabled = true;
    termScreenMat.clearCoat.intensity = 0.8;
    termScreenMat.clearCoat.roughness = 0.12;

    const outScreenMat = new PBRMaterial('outScreenMat', this.scene);
    this.outScreenMat = outScreenMat;
    outScreenMat.albedoColor = Color3.Black();
    outScreenMat.emissiveColor = Color3.White();
    outScreenMat.emissiveIntensity = 1.45;
    outScreenMat.metallic = 0;
    outScreenMat.roughness = 1;
    outScreenMat.maxSimultaneousLights = 6;
    outScreenMat.clearCoat.isEnabled = true;
    outScreenMat.clearCoat.intensity = 0.8;
    outScreenMat.clearCoat.roughness = 0.12;

    const buildOutputCanvas = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 320;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#020a14';
      ctx.fillRect(0, 0, 512, 320);
      ctx.fillStyle = 'rgba(40,160,255,0.08)';
      for (let y = 0; y < 320; y += 4) ctx.fillRect(0, y, 512, 1);
      ctx.font = '16px monospace';
      const lines = [
        '> build --mode=prod',
        '  [config] loaded angular.json',
        '  [build] compiling application...',
        '  [bundle] assets inlined',
        '  [done] dist/Portafolio/browser',
        '> npm run start',
        '  ready on http://localhost:4200',
        '> _',
      ];
      lines.forEach((l, i) => {
        ctx.fillStyle = i < 5 ? '#6cd0ff' : i === 5 ? '#c8e6ff' : i === 6 ? '#9ef0ff' : '#ff6bd0';
        ctx.fillText(l, 18, 40 + i * 28);
      });
      return canvas;
    })();
    this.outCanvas = buildOutputCanvas;
    this.outTexture = this.texture(this.outCanvas, 1, 1, false, true, false);
    outScreenMat.emissiveTexture = this.outTexture;

    this.termCanvas = screenCanvas();
    this.termTexture = this.texture(this.termCanvas, 1, 1, false, true, false);
    termScreenMat.emissiveTexture = this.termTexture;
    this.initConsole();

    // Cámara mirando hacia -Z: el lado izquierdo de la imagen es +X.
    // El monitor de la izquierda (según el espectador) lleva la consola.
    const monitorBodyL = this.box('monitorL', { w: 1.1, h: 0.95, d: 0.06 }, new Vector3(0.68, 1.42, -3.42), bezel);
    const monitorScreenL = this.box('monitorScreenL', { w: 0.98, h: 0.8, d: 0.02 }, new Vector3(0.68, 1.42, -3.37), termScreenMat);
    monitorScreenL.metadata = { hotspotId: 'terminal' as HotspotId };
    const monitorBodyR = this.box('monitorR', { w: 1.1, h: 0.95, d: 0.06 }, new Vector3(-0.68, 1.42, -3.42), bezel);
    const monitorScreenR = this.box('monitorScreenR', { w: 0.98, h: 0.8, d: 0.02 }, new Vector3(-0.68, 1.42, -3.37), outScreenMat);

    const kb = this.slab('keyboard', 1.0, 0.36, 0.04, 0.03, new Vector3(0, 0.79, -3.0), this.pbr('kb', '#1a1a24', { roughness: 0.6 }));
    const kbTop = this.slab('kbTop', 0.92, 0.28, 0.02, 0.02, new Vector3(0, 0.815, -3.0), this.pbr('kbTop', '#242433', { roughness: 0.5 }));
    const keyMat = this.pbr('kbKeyMat', '#33364a', { roughness: 0.45 });
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 12; c++) {
        this.slab(`key-${r}-${c}`, 0.055, 0.058, 0.014, 0.008, new Vector3(-0.4 + c * 0.073, 0.828, -3.12 + r * 0.058), this.pbr('kbKey2', '#2b2d3c', { roughness: 0.5 }));
      }
    }
    void kb;

    const mouse = CreateSphere('mouse', { diameter: 0.13, segments: 16 }, this.scene);
    mouse.scaling = new Vector3(1, 0.7, 1.4);
    mouse.position = new Vector3(0.8, 0.8, -2.95);
    mouse.material = this.pbr('mouseMat', '#1c1c28', { roughness: 0.4 });

    const mug = CreateCylinder('mug', { height: 0.14, diameterTop: 0.12, diameterBottom: 0.1, tessellation: 20 }, this.scene);
    mug.position = new Vector3(-0.75, 0.82, -3.15);
    mug.material = this.pbr('mugMat', '#c95a3c', { roughness: 0.5 });
    const mugInner = CreateCylinder('mugInner', { height: 0.02, diameter: 0.1, tessellation: 20 }, this.scene);
    mugInner.position = new Vector3(-0.75, 0.895, -3.15);
    mugInner.material = this.pbr('mugCoffee', '#3a1f14', { roughness: 0.35 });

    const succulentPot = CreateCylinder('succulentPot', { height: 0.1, diameterTop: 0.11, diameterBottom: 0.08, tessellation: 16 }, this.scene);
    succulentPot.position = new Vector3(1.15, 0.79, -2.75);
    succulentPot.material = this.pbr('succulentPotMat', '#b96a4b', { roughness: 0.8 });
    const succulentLeaves: Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leaf = CreateSphere('succulentLeaf' + i, { diameter: 0.07, segments: 10 }, this.scene);
      leaf.scaling = new Vector3(1, 0.5, 1.6);
      leaf.position = new Vector3(1.15 + Math.cos(a) * 0.04, 0.87, -2.75 + Math.sin(a) * 0.04);
      leaf.rotation.y = a;
      leaf.material = this.pbr('succulentMat', '#3f9d6a', { roughness: 0.9 });
      succulentLeaves.push(leaf);
    }

    const phone = this.box('phone', { w: 0.09, h: 0.16, d: 0.012 }, new Vector3(0.52, 0.85, -3.05), this.pbr('phoneMat', '#0c0c14', { roughness: 0.25, metallic: 0.3 }));
    phone.rotation.x = -0.18;
    phone.rotation.y = 0.5;
    const phoneGlow = this.box('phoneGlow', { w: 0.076, h: 0.14, d: 0.002 }, new Vector3(0.52, 0.85, -3.05), this.emissive('phoneGlowMat', NEON_CYAN, 0.7));
    phoneGlow.rotation.copyFrom(phone.rotation);
    phoneGlow.position.addInPlace(new Vector3(0, 0, 0.008));

    const cable = CreateTorus('cable', { diameter: 0.14, thickness: 0.006, tessellation: 32 }, this.scene);
    cable.position = new Vector3(1.32, 0.79, -3.1);
    cable.rotation.x = Math.PI / 2.2;
    cable.material = this.pbr('cableMat', '#0a0a10', { roughness: 0.7 });

    const bookStack: Mesh[] = [];
    [
      { c: '#457b9d', y: 0.795, w: 0.28, d: 0.2 },
      { c: '#e63946', y: 0.815, w: 0.26, d: 0.19 },
      { c: '#2a9d8f', y: 0.833, w: 0.24, d: 0.18 },
    ].forEach((b, i) => {
      const nb = this.box('deskBook' + i, { w: b.w, h: 0.02, d: b.d }, new Vector3(-0.45, b.y, -2.8), this.pbr('deskBookMat' + i, b.c, { roughness: 0.7 }));
      nb.rotation.y = (i - 1) * 0.12;
      bookStack.push(nb);
    });

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
    const postits: Mesh[] = [];

    const headsetBand = CreateTorus('hsBand', { diameter: 0.34, thickness: 0.05, tessellation: 24 }, this.scene);
    headsetBand.position = new Vector3(0, 1.0, -3.35);
    headsetBand.rotation.x = Math.PI / 2.2;
    headsetBand.material = this.pbr('hsMat', '#141420', { roughness: 0.6 });
    const cups: Mesh[] = [];
    [-0.17, 0.17].forEach((dx, i) => {
      const cup = CreateCylinder('hsCup' + i, { height: 0.08, diameter: 0.24, tessellation: 18 }, this.scene);
      cup.rotation.z = Math.PI / 2;
      cup.position = new Vector3(dx, 0.92, -3.35);
      cup.material = this.pbr('hsCupMat', '#1c1c2a', { roughness: 0.5 });
      cups.push(cup);
    });

    postitColors.forEach((c, i) => {
      const note = this.slab('postit' + i, 0.12, 0.12, 0.005, 0.01, new Vector3(1.15, 0.78, -3.3 + i * 0.12), this.pbr('postitMat' + i, c, { roughness: 1 }));
      note.rotation.y = 0.2;
      postits.push(note);
    });

    const papers = this.slab('papers', 0.34, 0.24, 0.012, 0.012, new Vector3(0.72, 0.781, -2.95), this.pbr('papersMat', '#e8e4d8', { roughness: 0.92 }));
    papers.rotation.y = 0.35;
    const papers2 = this.slab('papers2', 0.34, 0.24, 0.012, 0.012, new Vector3(0.7, 0.791, -2.97), this.pbr('papers2Mat', '#d9d3c3', { roughness: 0.92 }));
    papers2.rotation.y = 0.12;

    const penColors = ['#2b6fff', '#ff5c8a'];
    const pens: Mesh[] = [];
    [-0.03, 0.02].forEach((dx, i) => {
      const pen = CreateCylinder('pen' + i, { height: 0.22, diameter: 0.014, tessellation: 10 }, this.scene);
      pen.position = new Vector3(-0.75 + dx, 0.95, -3.15 + (i ? 0.025 : -0.02));
      pen.rotation.z = 0.3 - i * 0.6;
      pen.rotation.x = i ? -0.25 : 0.2;
      pen.material = this.pbr('penMat' + i, penColors[i], { roughness: 0.35 });
      pens.push(pen);
    });

    void mugInner;

    const deskHotspot: Mesh[] = [
      top,
      monitorBase,
      monitorStand,
      monitorBodyL,
      monitorBodyR,
      monitorScreenR,
      kb,
      kbTop,
      mouse,
      mug,
      mugInner,
      succulentPot,
      ...succulentLeaves,
      phone,
      phoneGlow,
      cable,
      ...bookStack,
      lampArm,
      lampHead,
      lampBulb,
      headsetBand,
      papers,
      papers2,
      ...cups,
      ...postits,
      ...pens,
    ];
    deskHotspot.forEach((m) => {
      m.metadata = { hotspotId: 'desk' as HotspotId };
    });
    this.interiorPickable.set('desk', deskHotspot);
    this.interiorPickable.get('desk')!.push(monitorScreenL);
  }

  private buildShelf(): void {
    const shelfSrc = woodCanvas();
    const wood = this.pbr('shelfWood', '#ffffff', { roughness: 0.5 });
    wood.albedoTexture = this.texture(shelfSrc, 1, 1);
    this.bump(wood, shelfSrc, 1, 1, 3.5);
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

    const bookColors = ['#e63946', '#457b9d', '#2a9d8f', '#f4a261', '#9b5de5', '#ff006e', '#3a86ff', '#ffb703'];
    const bookMats = bookColors.map((c, i) => this.pbr('bookMat' + i, c, { roughness: 0.8 }));
    const pageMat = this.pbr('bookPages', '#efe6d0', { roughness: 0.9 });
    const shelfHeights = [0.4, 1.05, 1.7, 2.35];
    for (let shelfIdx = 0; shelfIdx < shelfHeights.length; shelfIdx++) {
      const boardY = shelfHeights[shelfIdx];
      let offset = -0.82;
      while (offset < 0.78) {
        const thickness = 0.035 + Math.random() * 0.06;
        const h = 0.26 + Math.random() * 0.16;
        const depth = 0.24 + Math.random() * 0.06;
        const colorIndex = (((shelfIdx * 3 + Math.floor(offset * 10)) % bookColors.length) + bookColors.length) % bookColors.length;
        const z = -1.4 + offset + thickness / 2;
        const book = this.box(
          `book-${shelfIdx}-${offset.toFixed(2)}`,
          { w: depth, h, d: thickness },
          new Vector3(-3.86, boardY + h / 2 + 0.03, z),
          bookMats[colorIndex],
        );
        book.rotation.z = (Math.random() - 0.5) * 0.1;
        const pages = this.box(
          `bookPages-${shelfIdx}-${offset.toFixed(2)}`,
          { w: depth * 0.92, h: 0.012, d: thickness * 0.9 },
          new Vector3(-3.86, boardY + h + 0.036, z),
          pageMat,
        );
        pages.rotation.z = book.rotation.z;
        pickables.push(book);
        offset += thickness + 0.012;
      }
    }

    const photo = posterCanvas(['DEV', 'LIFE'], '#1b1430', '#6cd0ff');
    const frame = this.slab('shelfFrame', 0.3, 0.4, 0.03, 0.01, new Vector3(-3.86, 1.35, -2.28), this.pbr('frameMat', '#ffffff', { roughness: 0.8 }));
    (frame.material as PBRMaterial).albedoTexture = this.texture(photo, 1, 1, false, true, false);
    frame.rotation.y = Math.PI / 2;
    frame.rotation.z = 0.06;

    const clock = CreateCylinder('shelfClock', { height: 0.04, diameter: 0.26, tessellation: 28 }, this.scene);
    clock.rotation.z = Math.PI / 2;
    clock.position = new Vector3(-3.88, 2.14, -2.35);
    clock.material = this.pbr('clockMat', '#161428', { roughness: 0.4, metallic: 0.4 });
    const clockFace = CreateCylinder('clockFace', { height: 0.012, diameter: 0.22, tessellation: 28 }, this.scene);
    clockFace.rotation.z = Math.PI / 2;
    clockFace.position = new Vector3(-3.855, 2.14, -2.35);
    clockFace.material = this.emissive('clockFaceMat', hex('#dfe8ff'), 0.5);

    const lyingBooks: Mesh[] = [];
    [
      { c: '#9b5de5', y: 0.44, w: 0.26, d: 0.2, x: -3.9, z: -0.5 },
      { c: '#f4a261', y: 0.46, w: 0.24, d: 0.18, x: -3.9, z: -0.5 },
    ].forEach((b, i) => {
      const lb = this.box('lyingBook' + i, { w: b.d, h: 0.02, d: b.w }, new Vector3(b.x, b.y, b.z), this.pbr('lyingBookMat' + i, b.c, { roughness: 0.85 }));
      lb.rotation.y = 0.15 * (i ? -1 : 1);
      lyingBooks.push(lb);
    });

    const shelfCandle = CreateCylinder('shelfCandle', { height: 0.18, diameterTop: 0.06, diameterBottom: 0.06, tessellation: 16 }, this.scene);
    shelfCandle.position = new Vector3(-3.86, 1.82, -2.3);
    shelfCandle.material = this.pbr('candleMat', '#e8d8b0', { roughness: 0.85 });
    const candleFlame = CreateSphere('candleFlame', { diameter: 0.05, segments: 8 }, this.scene);
    candleFlame.scaling.y = 1.6;
    candleFlame.position = new Vector3(-3.86, 1.95, -2.3);
    candleFlame.material = this.emissive('flameMat', hex('#ffb347'), 1.8);

    const globeStand = CreateCylinder('globeStand', { height: 0.06, diameter: 0.16, tessellation: 18 }, this.scene);
    globeStand.position = new Vector3(-3.86, 0.43, 0.3);
    globeStand.material = this.pbr('globeStandMat', '#3a2f1f', { roughness: 0.6 });
    const globe = CreateSphere('globe', { diameter: 0.24, segments: 24 }, this.scene);
    globe.position = new Vector3(-3.86, 0.58, 0.3);
    globe.material = this.pbr('globeMat', '#2a5d8f', { roughness: 0.5 });
    globe.rotation.z = -0.4;

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
      const leaf = CreateSphere('sLeaf' + i, { diameter: 0.12 + Math.random() * 0.1, segments: 16 }, this.scene);
      leaf.position = new Vector3(x, 2.66 + i * 0.07, -2.2 + (Math.random() - 0.5) * 0.2);
      leaf.rotation.z = (Math.random() - 0.5) * 0.6;
      leaf.scaling.y = 1.6;
      leaf.material = this.pbr('sLeafMat' + i, '#2f7d4f', { roughness: 1 });
    }

    pickables.push(
      frame,
      clock,
      clockFace,
      shelfCandle,
      candleFlame,
      globe,
      globeStand,
      trophyStem,
      trophyCup,
      plantPot,
      ...lyingBooks,
    );

    pickables.forEach((m) => {
      m.metadata = { hotspotId: 'shelf' as HotspotId };
    });
    this.interiorPickable.set('shelf', pickables);
  }

  private buildTv(): void {
    const x = 3.7;
    const tvZ = -1.7;
    const dvdZ = -0.75;

    const cabinetSrc = woodCanvas();
    const cabinetMat = this.pbr('mediaCabinet', '#ffffff', { roughness: 0.5 });
    cabinetMat.albedoTexture = this.texture(cabinetSrc, 1.5, 1);
    this.bump(cabinetMat, cabinetSrc, 1.5, 1, 3.5);
    const metal = this.pbr('tvMetal', '#26242f', { roughness: 0.3, metallic: 0.7 });
    const plastic = this.pbr('tvPlastic', '#2a2320', { roughness: 0.55, metallic: 0.05 });
    const rackMat = this.pbr('discRack', '#1a1424', { roughness: 0.6, metallic: 0.2 });

    this.slab('mediaCabinet', 0.9, 2.2, 0.7, 0.06, new Vector3(x, 0.35, -1.5), cabinetMat);
    this.box('cabinetSeam', { w: 0.02, h: 0.5, d: 0.02 }, new Vector3(3.26, 0.35, -1.5), metal);

    const tvPickables: Mesh[] = [];

    const tvBody = this.box('tvBody', { w: 0.68, h: 0.68, d: 0.9 }, new Vector3(x + 0.08, 1.03, tvZ), plastic);
    const tvBezel = this.box('tvBezel', { w: 0.052, h: 0.66, d: 0.84 }, new Vector3(3.452, 1.03, tvZ), metal);

    const screenMat = new PBRMaterial('tvScreenMat', this.scene);
    screenMat.albedoColor = Color3.Black();
    screenMat.emissiveColor = Color3.White();
    screenMat.emissiveIntensity = 1.25;
    screenMat.metallic = 0;
    screenMat.roughness = 1;
    screenMat.maxSimultaneousLights = 6;
    screenMat.clearCoat.isEnabled = true;
    screenMat.clearCoat.intensity = 1;
    screenMat.clearCoat.roughness = 0.1;
    this.tvScreenMat = screenMat;
    const screenMesh = this.box('tvScreen', { w: 0.72, h: 0.54, d: 0.022 }, new Vector3(3.435, 1.03, tvZ), screenMat);
    screenMesh.rotation.y = -Math.PI / 2;
    this.setScreen(null);

    tvPickables.push(tvBody, tvBezel, screenMesh);

    [0.86, 1.14].forEach((y, i) => {
      const knob = CreateCylinder('tvKnob' + i, { height: 0.04, diameter: 0.05, tessellation: 16 }, this.scene);
      knob.rotation.z = Math.PI / 2;
      knob.position = new Vector3(3.42, y, tvZ - 0.39);
      knob.material = metal;
      tvPickables.push(knob);
    });

    this.box('dvdBody', { w: 0.5, h: 0.1, d: 0.7 }, new Vector3(x, 0.76, dvdZ), metal);
    this.box('dvdSlot', { w: 0.02, h: 0.02, d: 0.5 }, new Vector3(3.44, 0.78, dvdZ), this.pbr('dvdSlotMat', '#05060a', { roughness: 1 }));
    this.box('dvdLed', { w: 0.01, h: 0.05, d: 0.12 }, new Vector3(3.44, 0.76, dvdZ + 0.24), this.emissive('dvdLedMat', NEON_CYAN, 1.2));

    const speakerMat = this.pbr('speakerMat', '#17141f', { roughness: 0.6 });
    [-2.35, -1.15].forEach((z, i) => {
      this.box('speaker' + i, { w: 0.18, h: 0.36, d: 0.1 }, new Vector3(3.7, 0.88, z), speakerMat);
      const ring = CreateTorus('spkRing' + i, { diameter: 0.09, thickness: 0.012, tessellation: 24 }, this.scene);
      ring.rotation.z = Math.PI / 2;
      ring.position = new Vector3(3.6, 0.88, z);
      ring.material = metal;
    });

    const rackZ = -1.5;
    this.box('discRack', { w: 0.06, h: 1.2, d: 2.4 }, new Vector3(4.12, 2.0, rackZ), rackMat);
    for (let r = 0; r <= RACK_ROWS; r++) {
      this.box('rackRow' + r, { w: 0.1, h: 0.02, d: 2.4 }, new Vector3(4.08, RACK_TOP_Y + DISC_RADIUS + 0.04 - r * RACK_ROW_GAP, rackZ), metal);
    }

    const tvLight = new PointLight('tvGlow', new Vector3(3.1, 1.4, tvZ), this.scene);
    tvLight.diffuse = NEON_CYAN;
    tvLight.intensity = 2.5;
    tvLight.range = 4.5;

    tvPickables.forEach((mesh) => {
      mesh.metadata = { hotspotId: 'tv' as HotspotId };
    });
    this.interiorPickable.set('tv', tvPickables);
  }

  private buildChair(): void {
    const root = new TransformNode('chairRoot', this.scene);
    root.position.copyFrom(RoomScene.CHAIR_HOME);
    this.chairRoot = root;

    const fabric = this.pbr('chairFabric', '#1a1526', { roughness: 0.9 });
    const accent = this.pbr('chairAccent', '#2a2040', { roughness: 0.8 });
    const darkMetal = this.pbr('chairMetal', '#26242f', { roughness: 0.35, metallic: 0.7 });
    const chrome = this.pbr('chairChrome', '#c9ccd4', { roughness: 0.22, metallic: 0.95 });
    const armPadMat = this.pbr('chairArmPad', '#15121f', { roughness: 0.75 });
    const glow = this.emissive('chairGlowMat', NEON_PURPLE, 0.9);
    const edgeGlow = this.emissive('chairEdgeMat', NEON_CYAN, 1.1);

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leg = chamferBox('chairLeg' + i, 0.46, 0.035, 0.07, this.scene);
      leg.position = new Vector3(Math.cos(a) * 0.25, 0.05, Math.sin(a) * 0.25);
      leg.rotation.y = -a;
      leg.material = darkMetal;
      leg.parent = root;

      const wheel = CreateCylinder('chairWheel' + i, { height: 0.03, diameter: 0.08, tessellation: 16 }, this.scene);
      wheel.rotation.y = -a;
      wheel.rotation.x = Math.PI / 2;
      wheel.position = new Vector3(Math.cos(a) * 0.47, 0.04, Math.sin(a) * 0.47);
      wheel.material = darkMetal;
      wheel.parent = root;
    }

    const hub = CreateCylinder('chairHub', { height: 0.05, diameter: 0.14, tessellation: 20 }, this.scene);
    hub.position = new Vector3(0, 0.05, 0);
    hub.material = darkMetal;
    hub.parent = root;

    const sleeve = CreateCylinder('chairSleeve', { height: 0.18, diameter: 0.14, tessellation: 18 }, this.scene);
    sleeve.position = new Vector3(0, 0.15, 0);
    sleeve.material = fabric;
    sleeve.parent = root;

    const piston = CreateCylinder('chairPiston', { height: 0.32, diameter: 0.062, tessellation: 16 }, this.scene);
    piston.position = new Vector3(0, 0.28, 0);
    piston.material = chrome;
    piston.parent = root;

    const mechanism = chamferBox('chairMech', 0.44, 0.05, 0.4, this.scene);
    mechanism.position = new Vector3(0, 0.4, 0);
    mechanism.material = darkMetal;
    mechanism.parent = root;

    const underglow = chamferBox('chairUnderglow', 0.6, 0.015, 0.58, this.scene);
    underglow.position = new Vector3(0, 0.422, 0);
    underglow.material = glow;
    underglow.parent = root;

    const seat = this.slab('chairSeat', 0.64, 0.62, 0.13, 0.12, new Vector3(0, 0.5, 0), fabric);
    seat.parent = root;

    const seatBase = chamferBox('chairSeatBase', 0.58, 0.03, 0.56, this.scene);
    seatBase.position = new Vector3(0, 0.445, 0);
    seatBase.material = darkMetal;
    seatBase.parent = root;

    const bracketL = chamferBox('chairBracketL', 0.06, 0.2, 0.1, this.scene);
    bracketL.position = new Vector3(-0.16, 0.56, 0.24);
    bracketL.rotation.x = 0.16;
    bracketL.material = darkMetal;
    bracketL.parent = root;
    const bracketR = chamferBox('chairBracketR', 0.06, 0.2, 0.1, this.scene);
    bracketR.position = new Vector3(0.16, 0.56, 0.24);
    bracketR.rotation.x = 0.16;
    bracketR.material = darkMetal;
    bracketR.parent = root;

    const backGroup = new TransformNode('chairBackGroup', this.scene);
    backGroup.position = new Vector3(0, 1.0, 0.3);
    backGroup.rotation.x = 0.16;
    backGroup.parent = root;

    const back = chamferBox('chairBack', 0.5, 0.78, 0.1, this.scene);
    back.material = fabric;
    back.parent = backGroup;

    [-0.26, 0.26].forEach((x, i) => {
      const bolster = chamferBox('chairBolster' + i, 0.11, 0.74, 0.16, this.scene);
      bolster.position = new Vector3(x, -0.01, -0.02);
      bolster.material = accent;
      bolster.parent = backGroup;

      const strip = chamferBox('chairBackGlow' + i, 0.02, 0.6, 0.015, this.scene);
      strip.position = new Vector3(x > 0 ? 0.245 : -0.245, 0, 0.062);
      strip.material = edgeGlow;
      strip.parent = backGroup;
    });

    const lumbar = chamferBox('chairLumbar', 0.36, 0.17, 0.09, this.scene);
    lumbar.position = new Vector3(0, -0.23, -0.085);
    lumbar.material = accent;
    lumbar.parent = backGroup;

    const headrest = chamferBox('chairHeadrest', 0.32, 0.16, 0.1, this.scene);
    headrest.position = new Vector3(0, 0.47, 0.04);
    headrest.material = accent;
    headrest.parent = backGroup;
    const headrestStrap = chamferBox('chairHeadStrap', 0.2, 0.03, 0.12, this.scene);
    headrestStrap.position = new Vector3(0, 0.38, 0.03);
    headrestStrap.material = darkMetal;
    headrestStrap.parent = backGroup;

    [-0.34, 0.34].forEach((x, i) => {
      const post = chamferBox('chairArmPost' + i, 0.055, 0.24, 0.06, this.scene);
      post.position = new Vector3(x, 0.63, 0.06);
      post.material = darkMetal;
      post.parent = root;

      const pad = chamferBox('chairArmPad' + i, 0.1, 0.045, 0.34, this.scene);
      pad.position = new Vector3(x, 0.77, 0.02);
      pad.material = armPadMat;
      pad.parent = root;
    });
  }

  private buildDecor(): void {
    const roomSkills = this.posterPoolShuffled().slice(4, 10);
    const roomPosters: { skill: SkillLogo; w: number; h: number; pos: Vector3; rotY: number }[] = [
      { skill: roomSkills[0], w: 0.6, h: 0.8, pos: new Vector3(3.35, 1.7, -4.14), rotY: Math.PI },
      { skill: roomSkills[1], w: 0.5, h: 0.7, pos: new Vector3(-2.6, 2.05, -4.14), rotY: Math.PI },
      { skill: roomSkills[2], w: 0.5, h: 0.7, pos: new Vector3(-4.14, 1.55, 0.4), rotY: -Math.PI / 2 },
      { skill: roomSkills[3], w: 0.5, h: 0.7, pos: new Vector3(-4.14, 1.55, 2.9), rotY: -Math.PI / 2 },
      { skill: roomSkills[4], w: 0.55, h: 0.75, pos: new Vector3(4.14, 1.75, 2.8), rotY: Math.PI / 2 },
      { skill: roomSkills[5], w: 0.5, h: 0.7, pos: new Vector3(4.14, 1.75, 0.2), rotY: Math.PI / 2 },
    ];
    roomPosters.forEach((p, i) => {
      this.addPoster(`roomPoster${i}`, p.skill, p.w, p.h, p.pos, p.rotY);
    });

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

    const fairyWarm = this.emissive('fairyWarmMat', hex('#ffd6a0'), 1.5);
    const fairyCool = this.emissive('fairyCoolMat', NEON_CYAN, 1.5);
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const bulb = CreateSphere('fairyBulb' + i, { diameter: 0.05, segments: 6 }, this.scene);
      bulb.position = new Vector3(-3.9, 2.45 - Math.sin(t * Math.PI) * 0.35, -2.2 + t * 5.4);
      bulb.material = i % 2 ? fairyCool : fairyWarm;
    }

    this.buildChair();

    const woodDeco = this.pbr('decoWood', '#3a2b1f', { roughness: 0.7 });

    const floorPot = CreateCylinder('floorPot', { height: 0.5, diameterTop: 0.44, diameterBottom: 0.34, tessellation: 24 }, this.scene);
    floorPot.position = new Vector3(-3.5, 0.25, -3.55);
    floorPot.material = this.pbr('floorPotMat', '#8a5a44', { roughness: 0.85 });
    const floorStem = CreateCylinder('floorStem', { height: 0.9, diameter: 0.06, tessellation: 10 }, this.scene);
    floorStem.position = new Vector3(-3.5, 0.9, -3.55);
    floorStem.material = this.pbr('floorStemMat', '#2f5228', { roughness: 0.9 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const r = 0.16 + Math.random() * 0.22;
      const leaf = CreateSphere('floorLeaf' + i, { diameter: 0.24 + Math.random() * 0.16, segments: 12 }, this.scene);
      leaf.scaling = new Vector3(0.5, 1.5, 1);
      leaf.position = new Vector3(-3.5 + Math.cos(a) * r * 0.5, 1.15 + Math.random() * 0.5, -3.55 + Math.sin(a) * r);
      leaf.rotation.z = (Math.random() - 0.5) * 0.8;
      leaf.rotation.y = a;
      leaf.material = this.pbr('floorLeafMat', '#2f7d4f', { roughness: 1 });
    }

    const bean = CreateSphere('beanbag', { diameter: 0.95, segments: 28 }, this.scene);
    bean.scaling = new Vector3(1, 0.55, 1);
    bean.position = new Vector3(2.8, 0.24, 2.1);
    bean.material = this.pbr('beanMat', '#5b2a4a', { roughness: 0.9 });
    const beanTop = CreateSphere('beanbagTop', { diameter: 0.5, segments: 20 }, this.scene);
    beanTop.scaling = new Vector3(1, 0.4, 1);
    beanTop.position = new Vector3(2.75, 0.42, 2.05);
    beanTop.material = this.pbr('beanTopMat', '#6d3357', { roughness: 0.9 });

    const guitarBody = CreateCylinder('guitarBody', { height: 0.12, diameterTop: 0.5, diameterBottom: 0.44, tessellation: 32 }, this.scene);
    guitarBody.rotation.z = Math.PI / 2;
    guitarBody.rotation.y = 0.15;
    guitarBody.position = new Vector3(-3.78, 0.85, 1.3);
    guitarBody.material = this.pbr('guitarMat', '#c9362b', { roughness: 0.35, metallic: 0.2 });
    const guitarNeck = this.box('guitarNeck', { w: 0.05, h: 1.1, d: 0.1 }, new Vector3(-3.82, 1.75, 1.3), this.pbr('guitarNeckMat', '#3a2418', { roughness: 0.6 }));
    guitarNeck.rotation.z = 0.06;
    const guitarHead = this.box('guitarHead', { w: 0.05, h: 0.22, d: 0.16 }, new Vector3(-3.79, 2.32, 1.3), this.pbr('guitarHeadMat', '#241009', { roughness: 0.5 }));
    guitarHead.rotation.z = 0.06;
    const guitarHole = CreateCylinder('guitarHole', { height: 0.14, diameter: 0.16, tessellation: 20 }, this.scene);
    guitarHole.rotation.z = Math.PI / 2;
    guitarHole.rotation.y = 0.15;
    guitarHole.position = new Vector3(-3.74, 0.9, 1.3);
    guitarHole.material = this.pbr('guitarHoleMat', '#0a0704', { roughness: 0.9 });

    const wallShelf = this.box('wallShelf', { w: 0.16, h: 0.04, d: 0.8 }, new Vector3(3.96, 2.05, 1.1), woodDeco);
    [
      { z: 0.9, c: '#c96a3c' },
      { z: 1.3, c: '#6a8f5a' },
    ].forEach((p, i) => {
      const pot = CreateCylinder('wallPot' + i, { height: 0.12, diameterTop: 0.12, diameterBottom: 0.09, tessellation: 16 }, this.scene);
      pot.position = new Vector3(3.96, 2.13, p.z);
      pot.material = this.pbr('wallPotMat' + i, p.c, { roughness: 0.8 });
      const bush = CreateSphere('wallBush' + i, { diameter: 0.16, segments: 12 }, this.scene);
      bush.scaling = new Vector3(1, 1.2, 1);
      bush.position = new Vector3(3.96, 2.25, p.z);
      bush.material = this.pbr('wallBushMat' + i, '#357d4a', { roughness: 0.9 });
    });

    const lavaBase = CreateCylinder('lavaBase', { height: 0.06, diameter: 0.16, tessellation: 20 }, this.scene);
    lavaBase.position = new Vector3(3.5, 0.72, -2.35);
    lavaBase.material = this.pbr('lavaBaseMat', '#26242f', { roughness: 0.4, metallic: 0.6 });
    const lavaBody = CreateCylinder('lavaBody', { height: 0.24, diameterTop: 0.12, diameterBottom: 0.14, tessellation: 24 }, this.scene);
    lavaBody.position = new Vector3(3.5, 0.86, -2.35);
    lavaBody.material = this.emissive('lavaMat', hex('#ff5a8a'), 0.7);

    const joystickBase = this.box('joyBase', { w: 0.3, h: 0.06, d: 0.22 }, new Vector3(3.5, 0.72, -0.9), this.pbr('joyBaseMat', '#1a1a26', { roughness: 0.5 }));
    const joystickStick = CreateCylinder('joyStick', { height: 0.16, diameter: 0.03, tessellation: 10 }, this.scene);
    joystickStick.position = new Vector3(3.44, 0.82, -0.9);
    joystickStick.material = this.pbr('joyStickMat', '#26242f', { roughness: 0.3, metallic: 0.7 });
    const joystickBall = CreateSphere('joyBall', { diameter: 0.07, segments: 14 }, this.scene);
    joystickBall.position = new Vector3(3.44, 0.91, -0.9);
    joystickBall.material = this.emissive('joyBallMat', NEON_PINK, 0.9);
    void joystickBase;

    const wallClock = CreateCylinder('wallClock', { height: 0.04, diameter: 0.3, tessellation: 28 }, this.scene);
    wallClock.rotation.x = Math.PI / 2;
    wallClock.position = new Vector3(-3.15, 2.15, -4.02);
    wallClock.material = this.pbr('wallClockMat', '#161428', { roughness: 0.4, metallic: 0.4 });
    const wallClockFace = CreateCylinder('wallClockFace', { height: 0.012, diameter: 0.26, tessellation: 28 }, this.scene);
    wallClockFace.rotation.x = Math.PI / 2;
    wallClockFace.position = new Vector3(-3.15, 2.15, -3.995);
    wallClockFace.material = this.emissive('wallClockFaceMat', hex('#cfe0ff'), 0.45);

    const fwLight = new PointLight('floorPlantLight', new Vector3(-3.5, 1.2, -3.55), this.scene);
    fwLight.diffuse = hex('#57c98a');
    fwLight.intensity = 1.6;
    fwLight.range = 3.5;
  }

  private buildLights(): void {
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = this.tone.hemi;
    hemi.diffuse = hex('#8899ff');
    hemi.groundColor = hex('#2a1240');

    const moon = new DirectionalLight('moon', new Vector3(-0.45, -1, -0.55), this.scene);
    moon.position = new Vector3(9, 15, 8);
    moon.intensity = this.tone.moon;
    moon.diffuse = hex('#bcd0ff');

    const fill = new DirectionalLight('fill', new Vector3(0.4, -0.65, -0.65), this.scene);
    fill.intensity = this.tone.fill;
    fill.diffuse = hex('#9db4ff');

    const shadow = new ShadowGenerator(this.coarsePointer ? 1024 : 2048, moon);
    shadow.useBlurExponentialShadowMap = true;
    shadow.blurKernel = this.coarsePointer ? 12 : 24;
    shadow.darkness = this.tone.shadowDarkness;
    if (shadow.getShadowMap()) {
      shadow.getShadowMap()!.refreshRate = this.coarsePointer ? 24 : 6;
    }
    this.shadow = shadow;

    this.scene.meshes.forEach((mesh) => {
      if (mesh.name !== 'sky' && !mesh.name.startsWith('fairy')) {
        mesh.receiveShadows = true;
      }
      if (['sky', 'ground', 'floor', 'ceiling', 'hallFloor', 'hallCeil'].includes(mesh.name) || mesh.name.startsWith('fairy')) {
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
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('resize', this.onResize);
  }

  private detachEvents(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('resize', this.onResize);
  }

  setConsoleContext(ctx: ConsoleContext): void {
    this.consoleCtx = ctx;
  }

  isConsoleOpen(): boolean {
    return this.consoleOpen;
  }

  submitConsole(raw: string): void {
    this.runConsoleCommand(raw);
  }

  consoleTranscript(): ConsoleLine[] {
    return [
      ...this.consoleEcho.map((text) => ({ text, color: CONSOLE_TERM.strong })),
      ...this.consoleOut,
    ];
  }

  consoleHistoryList(): string[] {
    return [...this.consoleHistory];
  }

  openConsole(): void {
    if (this.consoleOpen) {
      return;
    }
    this.consoleOpen = true;
    this.resetMedia();
    this.phase = 'focus';
    this.goal = FOCUS.desk;
    this.callbacks.onPhase?.('focus');
    this.callbacks.onConsole?.(true);
    this.consoleInput = '';
    this.consoleHistIndex = -1;
    this.consoleCursor = true;
    this.lastCursor = this.elapsed;
    this.consoleEcho = this.consoleEcho.slice(-8);
    this.attachConsoleKeys();
    this.updateTermScreen();
    this.notifyConsole();
  }

  closeConsole(): void {
    if (!this.exitConsole()) {
      return;
    }
    this.returnToIdle();
  }

  private exitConsole(): boolean {
    if (!this.consoleOpen) {
      return false;
    }
    this.consoleOpen = false;
    this.detachConsoleKeys();
    this.callbacks.onConsole?.(false);
    this.updateTermScreen();
    this.notifyConsole();
    return true;
  }

  private readonly onResize = (): void => this.updateViewport();

  private readonly onVisibility = (): void => {
    if (document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.tapStart = { x: event.clientX, y: event.clientY };
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') {
      return;
    }
    this.pickPending = event;
    if (this.pickScheduled) {
      return;
    }
    this.pickScheduled = true;
    requestAnimationFrame(() => {
      this.pickScheduled = false;
      const pending = this.pickPending;
      this.pickPending = null;
      if (pending) {
        this.updateHover(this.pickAt(pending), pending);
      }
    });
  };

  private readonly onPointerLeave = (): void => {
    this.tapStart = null;
    this.hoveredId = null;
    this.hoveredDisc = null;
    this.clearHighlights();
    this.callbacks.onHover?.(null);
  };

  private readonly onPointerCancel = (): void => {
    this.tapStart = null;
    this.pickPending = null;
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const down = this.tapStart;
    this.tapStart = null;
    const slop = event.pointerType === 'mouse' ? 12 : 32;
    if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > slop) {
      return;
    }
    const target = this.pickAt(event);
    if (!target) {
      return;
    }
    if (target.kind === 'disc') {
      this.insertDisc(target.index);
      return;
    }
    if (target.id === 'door') {
      this.enterHouse();
      return;
    }
    if (target.id === 'tv') {
      this.openDiscRack();
      return;
    }
    if (target.id === 'terminal') {
      if (this.phase === 'intro' || this.phase === 'entering') {
        return;
      }
      this.openConsole();
      return;
    }
    if (target.id === 'desk') {
      this.callbacks.onSelect?.(target.id as PanelId);
      return;
    }
    if (target.id === 'shelf') {
      this.callbacks.onSelect?.(target.id as PanelId);
      return;
    }
    this.callbacks.onSelect?.(target.id as PanelId);
  };

  private updateHover(target: PickTarget | null, event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (this.consoleOpen) {
      this.clearHighlights();
      this.callbacks.onHover?.(null);
      return;
    }

    if (target?.kind === 'hotspot') {
      if (this.hoveredDisc !== null) {
        this.clearDiscHighlight();
        this.hoveredDisc = null;
      }
      if (target.id !== this.hoveredId) {
        this.clearHotspotHighlight();
        this.hoveredId = target.id;
        this.applyHotspotHighlight(target.id);
      }
      this.callbacks.onHover?.({ id: target.id, x, y });
      return;
    }

    if (target?.kind === 'disc') {
      if (this.hoveredId !== null) {
        this.clearHotspotHighlight();
        this.hoveredId = null;
      }
      if (target.index !== this.hoveredDisc) {
        this.clearDiscHighlight();
        this.hoveredDisc = target.index;
        this.applyDiscHighlight(target.index);
      }
      this.callbacks.onHover?.({ id: 'disc', discName: this.discProjects[target.index]?.title, x, y });
      return;
    }

    this.clearHighlights();
    this.callbacks.onHover?.(null);
  }

  private pickAt(event: PointerEvent): PickTarget | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const pick = this.scene.pick(x, y, (mesh) => {
      const meta = mesh.metadata as { hotspotId?: HotspotId; discIndex?: number } | null;
      if (!meta) {
        return false;
      }
      if (typeof meta.discIndex === 'number') {
        return this.mediaOpen;
      }
      if (meta.hotspotId) {
        return this.isPickable(meta.hotspotId);
      }
      return false;
    });
    if (!pick?.hit || !pick.pickedMesh) {
      return this.pickNearestDisc(event);
    }
    const meta = pick.pickedMesh.metadata as { hotspotId?: HotspotId; discIndex?: number } | null;
    if (meta && typeof meta.discIndex === 'number') {
      return { kind: 'disc', index: meta.discIndex };
    }
    if (meta?.hotspotId) {
      return { kind: 'hotspot', id: meta.hotspotId };
    }
    return null;
  }

  private pickNearestDisc(event: PointerEvent): PickTarget | null {
    if (!this.mediaOpen || this.discs.length === 0) {
      return null;
    }
    if (event.pointerType === 'mouse' && !this.coarsePointer) {
      return null;
    }
    const rect = this.canvas.getBoundingClientRect();
    const renderWidth = this.engine.getRenderWidth();
    const renderHeight = this.engine.getRenderHeight();
    if (!rect.width || !rect.height || !renderWidth || !renderHeight) {
      return null;
    }
    const viewport = this.camera.viewport.toGlobal(renderWidth, renderHeight);
    const transform = this.scene.getTransformMatrix();
    const scaleX = rect.width / renderWidth;
    const scaleY = rect.height / renderHeight;
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    let nearest = -1;
    let nearestDistance = Infinity;
    for (let i = 0; i < this.discs.length; i++) {
      const mesh = this.discs[i];
      if (!mesh.isEnabled()) {
        continue;
      }
      const projected = Vector3.Project(mesh.getAbsolutePosition(), Matrix.IdentityReadOnly, transform, viewport);
      const distance = Math.hypot(projected.x * scaleX - px, projected.y * scaleY - py);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i;
      }
    }
    const radius = Math.min(38, Math.max(24, rect.width * 0.09));
    return nearest >= 0 && nearestDistance <= radius ? { kind: 'disc', index: nearest } : null;
  }

  private isPickable(id: HotspotId): boolean {
    if (this.phase === 'intro' || this.phase === 'entering') {
      return id === 'door';
    }
    if (this.mediaOpen) {
      return false;
    }
    return id !== 'door';
  }

  private applyHotspotHighlight(id: HotspotId): void {
    void id;
    this.canvas.style.cursor = 'pointer';
  }

  private applyDiscHighlight(index: number): void {
    void index;
    this.canvas.style.cursor = 'pointer';
  }

  private clearHotspotHighlight(): void {
    this.canvas.style.cursor = '';
  }

  private clearDiscHighlight(): void {
    this.canvas.style.cursor = '';
  }

  private clearHighlights(): void {
    this.clearHotspotHighlight();
    this.clearDiscHighlight();
    this.hoveredId = null;
    this.hoveredDisc = null;
  }

  enterHouse(): void {
    if (this.phase === 'entering') {
      return;
    }
    this.exitConsole();
    this.clearHighlights();
    this.callbacks.onHover?.(null);
    this.phase = 'entering';
    this.vhsValue = 1;
    this.doorTween = 0;
    this.elevatorOpening = true;
    this.callbacks.onPhase?.('entering');
    this.startTransition(IDLE, 3.2);
    window.setTimeout(() => {
      if (this.disposed) {
        return;
      }
      this.vhsValue = 0.35;
      this.phase = 'idle';
      this.callbacks.onPhase?.('idle');
    }, 3100);
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

  private consoleHeader(ctx: CanvasRenderingContext2D, header: string): number {
    const w = this.termCanvas.width;
    const h = this.termCanvas.height;
    const px = 18;
    const fs = 16;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#020a14';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(40, 160, 255, 0.08)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1);
    }
    ctx.font = `${fs}px monospace`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = CONSOLE_TERM.dim;
    ctx.fillText(header, px, px + fs);
    ctx.fillStyle = 'rgba(108, 208, 255, 0.22)';
    ctx.fillRect(px, px + fs + 10, w - px * 2, 1);
    return px + fs + 34;
  }

  private blit(canvas: HTMLCanvasElement, texture?: DynamicTexture): void {
    if (!texture) {
      return;
    }
    texture.getContext().drawImage(canvas, 0, 0);
    texture.update();
  }

  private clip(text: string): string {
    return text.length > 50 ? `${text.slice(0, 49)}…` : text;
  }

  private updateTermScreen(): void {
    const canvas = this.termCanvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const y0 = this.consoleHeader(ctx, 'consola · portafolio-3d');
    const lh = 26;
    const px = 18;
    const maxLines = Math.max(1, Math.floor((canvas.height - 16 - y0) / lh) + 1);
    const lines = [...this.consoleEcho, CONSOLE_PROMPT + this.consoleInput].slice(-maxLines);
    for (let i = 0; i < lines.length - 1; i++) {
      ctx.fillStyle = CONSOLE_TERM.dim;
      ctx.fillText(this.clip(lines[i]), px, y0 + i * lh);
    }
    const promptY = y0 + (lines.length - 1) * lh;
    ctx.fillStyle = CONSOLE_TERM.accent;
    ctx.fillText(CONSOLE_PROMPT, px, promptY);
    const promptWidth = ctx.measureText(CONSOLE_PROMPT).width;
    const inputWidth = ctx.measureText(this.consoleInput).width;
    ctx.fillStyle = CONSOLE_TERM.strong;
    ctx.fillText(this.consoleInput, px + promptWidth, promptY);
    if (this.consoleOpen) {
      if (this.consoleCursor) {
        ctx.fillStyle = CONSOLE_TERM.accent;
        ctx.fillRect(px + promptWidth + inputWidth + 2, promptY - 14, 9, 17);
      }
    } else {
      ctx.fillStyle = 'rgba(158, 240, 255, 0.3)';
      ctx.fillRect(px + promptWidth + inputWidth + 2, promptY - 14, 9, 17);
    }
    this.blit(canvas, this.termTexture);
  }

  private updateOutScreen(): void {
    const canvas = this.outCanvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const y0 = this.consoleHeader(ctx, 'salida');
    const lh = 26;
    const px = 18;
    const maxLines = Math.max(1, Math.floor((canvas.height - 16 - y0) / lh) + 1);
    const pool = this.consoleOut.length
      ? this.consoleOut
      : [{ text: 'escribe "help" y pulsa Enter', color: CONSOLE_TERM.dim } satisfies ConsoleLine];
    const lines = pool.slice(-maxLines);
    lines.forEach((line, i) => {
      ctx.fillStyle = line.color;
      ctx.fillText(this.clip(line.text), px, y0 + i * lh);
    });
    this.blit(canvas, this.outTexture);
  }

  private runConsoleCommand(raw: string): void {
    const cmd = raw.trim();
    this.consoleEcho.push(CONSOLE_PROMPT + cmd);
    if (this.consoleEcho.length > 9) {
      this.consoleEcho.splice(0, this.consoleEcho.length - 9);
    }
    if (cmd) {
      this.consoleHistory.push(cmd);
      if (this.consoleHistory.length > 40) {
        this.consoleHistory.shift();
      }
      const result = runConsole(cmd, this.consoleCtx, this.discProjects);
      if (result.action === 'close') {
        this.closeConsole();
        return;
      }
      if (result.action === 'clear') {
        this.consoleOut = [];
        this.consoleEcho = [];
      } else {
        result.lines.forEach((line) => this.appendConsoleLine(line));
      }
    }
    this.updateTermScreen();
    this.updateOutScreen();
    this.notifyConsole();
  }

  private appendConsoleLine(line: ConsoleLine): void {
    this.consoleOut.push(line);
    if (this.consoleOut.length > 60) {
      this.consoleOut.splice(0, this.consoleOut.length - 60);
    }
  }

  private notifyConsole(): void {
    this.callbacks.onConsoleOutput?.();
  }

  private handleConsoleKey(event: KeyboardEvent): void {
    if (!this.consoleOpen) {
      return;
    }
    const key = event.key;
    if (key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeConsole();
      return;
    }
    if (key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const raw = this.consoleInput;
      this.consoleInput = '';
      this.consoleHistIndex = -1;
      this.runConsoleCommand(raw);
      return;
    }
    if (key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
      if (this.consoleInput) {
        this.consoleInput = this.consoleInput.slice(0, -1);
        this.updateTermScreen();
      }
      return;
    }
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      this.browseHistory(key === 'ArrowUp' ? 1 : -1);
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      if (this.consoleInput.length < CONSOLE_INPUT_MAX) {
        this.consoleInput += key;
        this.updateTermScreen();
      }
    }
  }

  private browseHistory(direction: number): void {
    const count = this.consoleHistory.length;
    if (count === 0) {
      return;
    }
    if (direction > 0) {
      this.consoleHistIndex = this.consoleHistIndex < 0 ? count - 1 : Math.max(0, this.consoleHistIndex - 1);
    } else {
      if (this.consoleHistIndex < 0) {
        return;
      }
      this.consoleHistIndex += 1;
      if (this.consoleHistIndex >= count) {
        this.consoleHistIndex = -1;
        this.consoleInput = '';
        this.updateTermScreen();
        return;
      }
    }
    this.consoleInput = this.consoleHistory[this.consoleHistIndex] ?? '';
    this.updateTermScreen();
  }

}
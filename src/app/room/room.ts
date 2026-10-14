import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { LoadingService } from '../loading.service';
import { InfoPanel, PanelSection } from '../ui/info-panel/info-panel';
import { DiscProject, fallbackProjects, fetchGitHubProjects } from '../data/github';
import { HoverInfo, HotspotId, PanelId, RoomScene, ScenePhase, ScreenRect } from './room-scene';
import { VhsHud } from '../ui/vhs-hud/vhs-hud';

const SECTION_BY_HOTSPOT: Record<PanelId, PanelSection> = {
  shelf: 'about',
  desk: 'contact',
};

const LABEL_BY_HOTSPOT: Record<HotspotId, string> = {
  door: 'Entrar',
  shelf: 'Sobre mí',
  tv: 'Proyectos',
  desk: 'Contacto',
};

@Component({
  selector: 'app-room',
  imports: [InfoPanel, VhsHud],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './room.html',
  styleUrl: './room.css',
})
export class Room implements OnDestroy {
  private readonly loadingService = inject(LoadingService);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private scene?: RoomScene;

  protected readonly loading = this.loadingService.visible;
  protected readonly hover = signal<HoverInfo | null>(null);
  protected readonly section = signal<PanelSection | null>(null);
  protected readonly phase = signal<ScenePhase>('intro');
  protected readonly disc = signal<DiscProject | null>(null);
  protected readonly screenRect = signal<ScreenRect | null>(null);

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.onEscape();
    }
  };

  constructor() {
    afterNextRender(() => {
      try {
        const scene = new RoomScene(this.canvasRef().nativeElement, {
          onHover: (info) => this.hover.set(info),
          onSelect: (id) => this.openSection(id),
          onDiscSelect: (project) => this.disc.set(project),
          onScreenRect: (rect) => this.screenRect.set(rect),
          onPhase: (phase) => this.phase.set(phase),
        });
        this.scene = scene;
        scene.setProjects(fallbackProjects());
        scene.setPhase('intro');
        scene.start();
        void this.loadProjects(scene);
      } catch (error) {
        console.error('No se pudo iniciar la escena 3D:', error);
      }
    });

    window.addEventListener('keydown', this.onKeydown);
  }

  private async loadProjects(scene: RoomScene): Promise<void> {
    const projects = await fetchGitHubProjects();
    if (this.scene === scene && projects.length > 0) {
      scene.setProjects(projects);
    }
  }

  protected label(info: HoverInfo): string {
    if (info.id === 'disc') {
      return info.discName ?? 'Disco';
    }
    return LABEL_BY_HOTSPOT[info.id];
  }

  protected overlayStyle(): Record<string, string> {
    const rect = this.screenRect();
    if (!rect) {
      return { opacity: '0', 'pointer-events': 'none' };
    }
    const width = Math.min(Math.max(rect.width, 320), 680);
    return {
      left: `${rect.x + rect.width / 2}px`,
      top: `${rect.y + rect.height / 2}px`,
      width: `${width}px`,
      opacity: '1',
    };
  }

  protected closeSection(): void {
    this.section.set(null);
    this.scene?.returnToIdle();
  }

  protected closeDisc(): void {
    this.disc.set(null);
    this.screenRect.set(null);
    this.scene?.ejectDisc();
  }

  private onEscape(): void {
    if (this.disc()) {
      this.closeDisc();
    } else if (this.section()) {
      this.closeSection();
    } else if (this.phase() === 'focus') {
      this.scene?.returnToIdle();
    }
  }

  private openSection(id: PanelId): void {
    this.hover.set(null);
    this.section.set(SECTION_BY_HOTSPOT[id]);
    this.scene?.focus(id);
  }

  ngOnDestroy(): void {
    window.removeEventListener('keydown', this.onKeydown);
    this.scene?.dispose();
  }
}

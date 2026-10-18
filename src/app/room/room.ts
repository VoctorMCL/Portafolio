import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { LoadingService } from '../loading.service';
import { InfoPanel, PanelSection } from '../ui/info-panel/info-panel';
import { DiscProject, getProjects } from '../data/github';
import { HoverInfo, HotspotId, PanelId, RoomScene, ScenePhase, ViewId } from './room-scene';
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

const ROOM_VIEWS: ViewId[] = ['general', 'tv', 'desk', 'shelf'];

const VIEW_LABEL: Record<ViewId, string> = {
  general: 'Vista general',
  tv: 'Consola',
  desk: 'PC',
  shelf: 'Estantería',
};

const COMPACT_NAV_QUERY = '(pointer: coarse), (max-width: 1200px)';

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
  protected readonly compactNav = signal(false);
  protected readonly viewIndex = signal(0);
  protected readonly viewLabel = computed(() => VIEW_LABEL[ROOM_VIEWS[this.viewIndex()]]);

  private mediaQuery?: MediaQueryList;

  private readonly onCompactChange = (event: MediaQueryListEvent): void => {
    this.compactNav.set(event.matches);
  };

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
          onPhase: (phase) => this.phase.set(phase),
        });
        this.scene = scene;
        if (this.loadingService.visible()) {
          scene.pause();
        }
        scene.setProjects(getProjects());
        scene.setPhase('intro');
        scene.start();
      } catch (error) {
        console.error('No se pudo iniciar la escena 3D:', error);
      }
    });

    window.addEventListener('keydown', this.onKeydown);

    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia(COMPACT_NAV_QUERY);
      this.compactNav.set(this.mediaQuery.matches);
      this.mediaQuery.addEventListener('change', this.onCompactChange);
    }

    effect(() => {
      const loading = this.loading();
      const scene = this.scene;
      if (!scene) {
        return;
      }
      if (loading) {
        scene.pause();
      } else {
        scene.resume();
      }
    });
  }

  protected label(info: HoverInfo): string {
    if (info.id === 'disc') {
      return info.discName ?? 'Disco';
    }
    return LABEL_BY_HOTSPOT[info.id];
  }

  protected closeSection(): void {
    this.section.set(null);
    this.viewIndex.set(0);
    this.scene?.returnToIdle();
  }

  protected stepView(delta: number): void {
    const count = ROOM_VIEWS.length;
    const next = (this.viewIndex() + delta + count) % count;
    this.viewIndex.set(next);
    this.scene?.setView(ROOM_VIEWS[next]);
  }

  protected closeDisc(): void {
    this.disc.set(null);
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
    this.mediaQuery?.removeEventListener('change', this.onCompactChange);
    this.scene?.dispose();
  }
}

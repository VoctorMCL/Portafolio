import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { LoadingService } from '../loading.service';
import { InfoPanel, PanelSection } from '../ui/info-panel/info-panel';
import { DiscProject, getProjects } from '../data/github';
import { ROOM_CONTENT } from '../data/portfolio';
import { HoverInfo, HotspotId, PanelId, RoomScene, ScenePhase, ViewId } from './room-scene';
import { CONSOLE_COMMANDS, CONSOLE_PROMPT } from './console-engine';
import type { ConsoleLine } from './console-engine';
import { loadSkillLogos } from './textures';
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
  terminal: 'Consola',
};

const ROOM_VIEWS: ViewId[] = ['general', 'tv', 'desk', 'shelf'];

const VIEW_LABEL: Record<ViewId, string> = {
  general: 'Vista general',
  tv: 'Proyectos',
  desk: 'PC',
  shelf: 'Estantería',
};

const COMPACT_NAV_QUERY = '(pointer: coarse), (any-hover: none), (max-width: 900px)';

const RELOAD_FLAG = 'portfolio-preloaded';

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
  private readonly consoleInputRef = viewChild<ElementRef<HTMLInputElement>>('consoleInput');
  private readonly consoleOutRef = viewChild<ElementRef<HTMLElement>>('consoleOut');
  private scene?: RoomScene;

  protected readonly loading = this.loadingService.visible;
  protected readonly hover = signal<HoverInfo | null>(null);
  protected readonly section = signal<PanelSection | null>(null);
  protected readonly phase = signal<ScenePhase>('intro');
  protected readonly disc = signal<DiscProject | null>(null);
  protected readonly consoleActive = signal(false);
  protected readonly compactNav = signal(true);
  protected readonly viewIndex = signal(0);
  protected readonly viewLabel = computed(() => VIEW_LABEL[ROOM_VIEWS[this.viewIndex()]]);
  protected readonly viewFocusHint = computed(() => {
    const view = ROOM_VIEWS[this.viewIndex()];
    if (view === 'desk') {
      return this.compactNav() ? 'Toca el monitor para abrir la consola' : 'Haz clic en el monitor para la consola';
    }
    if (view === 'shelf') {
      return this.compactNav() ? 'Toca los libros para saber de mí' : 'Haz clic en los libros para saber de mí';
    }
    return this.compactNav() ? 'Toca un objeto o cambia de vista' : 'Haz clic en los objetos para explorar';
  });
  protected readonly mediaOpen = signal(false);
  protected readonly mediaHint = computed(() => (this.compactNav() ? 'Toca un disco' : 'Elige un disco · pulsa Esc para salir'));
  protected readonly consoleCommands = CONSOLE_COMMANDS;
  protected readonly consolePrompt = CONSOLE_PROMPT;
  protected readonly consoleLines = signal<ConsoleLine[]>([]);
  protected readonly consoleDraft = signal('');

  private consoleHistory: string[] = [];
  private consoleHistoryIndex = -1;
  private mediaQuery?: MediaQueryList;
  private autoEnterScheduled = false;
  private autoEnterTimer?: number;

  private readonly onCompactChange = (event: MediaQueryListEvent): void => {
    this.compactNav.set(event.matches || window.innerWidth <= 900 || 'ontouchstart' in window);
    this.scene?.setKeyboardEnabled(!this.compactNav());
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.onEscape();
    }
  };

  constructor() {
    afterNextRender(() => {
      void (async () => {
        try {
          await loadSkillLogos();
          const scene = new RoomScene(this.canvasRef().nativeElement, {
            onHover: (info) => this.hover.set(info),
            onSelect: (id) => this.openSection(id),
            onDiscSelect: (project) => this.disc.set(project),
            onPhase: (phase) => this.phase.set(phase),
            onConsole: (open) => this.onConsoleChange(open),
            onConsoleOutput: () => this.syncConsoleOutput(),
            onMedia: (open) => this.onMediaChange(open),
          });
          this.scene = scene;
          scene.setKeyboardEnabled(!this.compactNav());
          if (this.loadingService.visible()) {
            scene.pause();
          }
          scene.setProjects(getProjects());
          scene.setConsoleContext({
            handle: ROOM_CONTENT.handle,
            role: ROOM_CONTENT.role,
            about: ROOM_CONTENT.about,
            skills: ROOM_CONTENT.skills,
            contact: ROOM_CONTENT.contact,
          });
          scene.setPhase('intro');
          if (this.loadingService.visible()) {
            await scene.calibrate();
          }
          this.scheduleAutoEnter();
        } catch (error) {
          console.error('No se pudo iniciar la escena 3D:', error);
        }
      })();
    });

    window.addEventListener('keydown', this.onKeydown);

    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia(COMPACT_NAV_QUERY);
      this.compactNav.set(this.mediaQuery.matches || window.innerWidth <= 900 || 'ontouchstart' in window);
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
        this.scheduleAutoEnter();
      }
    });

    afterRenderEffect(() => {
      if (!this.consoleActive() || !this.compactNav()) {
        return;
      }
      if (this.consoleLines().length) {
        this.scrollConsoleToEnd();
      }
      const field = this.consoleInputRef()?.nativeElement;
      if (field && document.activeElement !== field) {
        field.focus();
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
    if (this.consoleActive()) {
      this.scene?.closeConsole();
    } else if (this.disc()) {
      this.closeDisc();
    } else if (this.section()) {
      this.closeSection();
    } else if (this.phase() === 'focus') {
      this.scene?.returnToIdle();
    }
  }

  private scheduleAutoEnter(): void {
    if (this.autoEnterScheduled || this.loading() || !this.scene) {
      return;
    }
    this.autoEnterScheduled = true;
    try {
      if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();
        return;
      }
    } catch {
      // sessionStorage no disponible: continuar sin recargar
    }
    this.autoEnterTimer = window.setTimeout(() => {
      if (this.phase() === 'intro') {
        this.scene?.enterHouse();
      }
    }, 700);
  }

  private onMediaChange(open: boolean): void {
    this.mediaOpen.set(open);
    if (open) {
      this.viewIndex.set(ROOM_VIEWS.indexOf('tv'));
    }
  }

  private onConsoleChange(open: boolean): void {
    this.consoleActive.set(open);
    if (open) {
      this.hover.set(null);
      this.consoleHistory = this.scene?.consoleHistoryList() ?? [];
      this.consoleHistoryIndex = -1;
      this.consoleDraft.set('');
      if (this.section()) {
        this.section.set(null);
        this.viewIndex.set(0);
      }
    }
    this.syncConsoleOutput();
  }

  private syncConsoleOutput(): void {
    this.consoleLines.set(this.scene?.consoleTranscript() ?? []);
  }

  protected onConsoleInput(event: Event): void {
    this.consoleDraft.set((event.target as HTMLInputElement).value);
  }

  protected onConsoleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submitConsoleCommand(this.consoleDraft());
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.browseConsoleHistory(event.key === 'ArrowUp' ? 1 : -1);
    }
  }

  protected sendConsole(event: Event): void {
    event.preventDefault();
    this.submitConsoleCommand(this.consoleDraft());
  }

  protected runConsoleCommand(cmd: string): void {
    this.submitConsoleCommand(cmd);
  }

  protected closeConsole(): void {
    this.scene?.closeConsole();
  }

  private submitConsoleCommand(raw: string): void {
    const cmd = raw.trim();
    this.consoleDraft.set('');
    if (cmd) {
      this.consoleHistory = [...this.consoleHistory.filter((entry) => entry !== cmd), cmd].slice(-40);
    }
    this.consoleHistoryIndex = -1;
    this.scene?.submitConsole(cmd);
    this.syncConsoleOutput();
    this.scrollConsoleToEnd();
  }

  private browseConsoleHistory(direction: number): void {
    const count = this.consoleHistory.length;
    if (!count) {
      return;
    }
    const next =
      direction > 0
        ? this.consoleHistoryIndex < 0
          ? count - 1
          : Math.max(0, this.consoleHistoryIndex - 1)
        : this.consoleHistoryIndex < 0
          ? -1
          : this.consoleHistoryIndex + 1;
    this.consoleHistoryIndex = next >= count ? -1 : next;
    this.consoleDraft.set(this.consoleHistoryIndex < 0 ? '' : this.consoleHistory[this.consoleHistoryIndex]);
  }

  private scrollConsoleToEnd(): void {
    const el = this.consoleOutRef()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  private openSection(id: PanelId): void {
    this.hover.set(null);
    this.section.set(SECTION_BY_HOTSPOT[id]);
    this.viewIndex.set(ROOM_VIEWS.indexOf(id));
    this.scene?.focus(id);
  }

  ngOnDestroy(): void {
    window.removeEventListener('keydown', this.onKeydown);
    window.clearTimeout(this.autoEnterTimer);
    this.mediaQuery?.removeEventListener('change', this.onCompactChange);
    this.scene?.dispose();
  }
}

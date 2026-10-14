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
import { HotspotId, HoverInfo, InteriorId, RoomScene, ScenePhase } from './room-scene';
import { VhsHud } from '../ui/vhs-hud/vhs-hud';

const SECTION_BY_HOTSPOT: Record<InteriorId, PanelSection> = {
  shelf: 'about',
  tv: 'projects',
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

  constructor() {
    afterNextRender(() => {
      try {
        const scene = new RoomScene(this.canvasRef().nativeElement, {
          onHover: (info) => this.hover.set(info),
          onSelect: (id) => this.openSection(id),
          onPhase: (phase) => this.phase.set(phase),
        });
        this.scene = scene;
        scene.setPhase('intro');
        scene.start();
      } catch (error) {
        console.error('No se pudo iniciar la escena 3D:', error);
      }
    });
  }

  protected labelFor(id: HotspotId): string {
    return LABEL_BY_HOTSPOT[id];
  }

  protected closeSection(): void {
    this.section.set(null);
    this.scene?.returnToIdle();
  }

  private openSection(id: InteriorId): void {
    this.hover.set(null);
    this.section.set(SECTION_BY_HOTSPOT[id]);
    this.scene?.focus(id);
  }

  ngOnDestroy(): void {
    this.scene?.dispose();
  }
}

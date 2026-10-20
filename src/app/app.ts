import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { inject as injectAnalytics } from '@vercel/analytics';
import { LoadingService } from './loading.service';
import { Room } from './room/room';

const NOISE_SCALE = 8;

@Component({
  imports: [Room],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnDestroy {
  private readonly loadingService = inject(LoadingService);
  protected readonly loading = this.loadingService.visible;

  private readonly noiseRef = viewChild<ElementRef<HTMLCanvasElement>>('noise');
  private frameId = 0;
  private resizeHandler?: () => void;
  private noiseImage?: ImageData;

  constructor() {
    afterNextRender(() => {
      injectAnalytics();
      this.startStatic();
      void this.waitForResources().then(() => this.loadingService.finish());
    });

    effect(() => {
      if (!this.loading()) {
        this.stopStatic();
      }
    });
  }

  private async waitForResources(): Promise<void> {
    await Promise.allSettled([this.whenWindowLoaded(), this.whenFontsReady()]);
  }

  private whenWindowLoaded(): Promise<void> {
    if (document.readyState === 'complete') {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) =>
      window.addEventListener('load', () => resolve(), { once: true }),
    );
  }

  private whenFontsReady(): Promise<unknown> {
    return document.fonts?.ready ?? Promise.resolve();
  }

  private startStatic(): void {
    const canvas = this.noiseRef()?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    const resize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth / NOISE_SCALE));
      canvas.height = Math.max(1, Math.floor(window.innerHeight / NOISE_SCALE));
      this.noiseImage = ctx.createImageData(canvas.width, canvas.height);
    };
    resize();
    this.resizeHandler = resize;
    window.addEventListener('resize', resize);

    let frame = 0;
    const draw = () => {
      this.frameId = requestAnimationFrame(draw);
      if (frame++ % 3 !== 0 || !this.noiseImage) {
        return;
      }
      const data = this.noiseImage.data;

      for (let i = 0; i < data.length; i += 4) {
        const value = 40 + Math.random() * 215;
        data[i] = value * 0.78;
        data[i + 1] = value * 0.86;
        data[i + 2] = value;
        data[i + 3] = Math.random() * 175;
      }

      ctx.putImageData(this.noiseImage, 0, 0);
    };
    draw();
  }

  private stopStatic(): void {
    cancelAnimationFrame(this.frameId);
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = undefined;
    }
  }

  ngOnDestroy(): void {
    this.stopStatic();
  }
}

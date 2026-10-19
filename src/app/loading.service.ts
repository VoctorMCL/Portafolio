import { Injectable, computed, signal } from '@angular/core';

const MIN_VISIBLE_MS = 3600;

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly finished = signal(false);
  private readonly minimumElapsed = signal(false);

  readonly visible = computed(() => !this.finished() || !this.minimumElapsed());

  constructor() {
    window.setTimeout(() => this.minimumElapsed.set(true), MIN_VISIBLE_MS);
  }

  finish(): void {
    this.finished.set(true);
  }
}

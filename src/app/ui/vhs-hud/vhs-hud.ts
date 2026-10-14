import { ChangeDetectionStrategy, Component, OnDestroy, computed, input, signal } from '@angular/core';

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

@Component({
  selector: 'app-vhs-hud',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vhs-hud.html',
  styleUrl: './vhs-hud.css',
})
export class VhsHud implements OnDestroy {
  readonly dim = input(false);

  private readonly now = signal(new Date());
  private readonly elapsed = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  protected readonly date = computed(() => {
    const d = this.now();
    const day = String(d.getDate()).padStart(2, '0');
    return `${MONTHS[d.getMonth()]} ${day} ${d.getFullYear()}`;
  });

  protected readonly time = computed(() => {
    const d = this.now();
    let hours = d.getHours();
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds} ${period}`;
  });

  protected readonly counter = computed(() => {
    const total = this.elapsed();
    const minutes = String(Math.floor(total / 60)).padStart(2, '0');
    const seconds = String(total % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  });

  constructor() {
    this.timer = setInterval(() => {
      this.now.set(new Date());
      this.elapsed.update((value) => value + 1);
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}

import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ROOM_CONTENT } from '../../data/portfolio';

export type PanelSection = 'about' | 'contact';

@Component({
  selector: 'app-info-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './info-panel.html',
  styleUrl: './info-panel.css',
})
export class InfoPanel {
  readonly section = input<PanelSection | null>(null);
  readonly close = output<void>();

  protected readonly content = ROOM_CONTENT;
  protected readonly contactBody = signal('');

  protected readonly mailtoHref = computed(() => {
    const subject = encodeURIComponent('Hola, vi tu portafolio');
    const body = encodeURIComponent(this.contactBody().trim() || '¡Hola! Me gustaría contactarte.');
    return `mailto:${this.content.contact.email}?subject=${subject}&body=${body}`;
  });

  protected onMessageInput(event: Event): void {
    this.contactBody.set((event.target as HTMLTextAreaElement).value);
  }

  protected closePanel(): void {
    this.close.emit();
  }
}

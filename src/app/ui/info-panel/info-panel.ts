import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { PROJECTS, Project, ROOM_CONTENT } from '../../data/portfolio';

export type PanelSection = 'about' | 'projects' | 'contact';

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
  protected readonly projects = PROJECTS;
  protected readonly selected = signal<Project | null>(null);

  protected readonly contactBody = signal('');

  protected readonly mailtoHref = computed(() => {
    const subject = encodeURIComponent('Hola, vi tu portafolio');
    const body = encodeURIComponent(this.contactBody().trim() || '¡Hola! Me gustaría contactarte.');
    return `mailto:${this.content.contact.email}?subject=${subject}&body=${body}`;
  });

  protected selectProject(project: Project): void {
    this.selected.set(project);
  }

  protected backToList(): void {
    this.selected.set(null);
  }

  protected onMessageInput(event: Event): void {
    this.contactBody.set((event.target as HTMLTextAreaElement).value);
  }

  protected closePanel(): void {
    this.selected.set(null);
    this.close.emit();
  }
}

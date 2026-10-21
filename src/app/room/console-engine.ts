import { DiscProject } from '../data/github';

export type ConsoleLine = { text: string; color: string };

export interface ConsoleContext {
  handle: string;
  role: string;
  about: string[];
  skills: string[];
  contact: { email: string; github?: string; linkedin?: string; location?: string };
}

export const CONSOLE_PROMPT = 'victor@portafolio:~$ ';
export const CONSOLE_INPUT_MAX = 30;
export const CONSOLE_OUT_LINES = 11;

export const CONSOLE_TERM = {
  accent: '#6cd0ff',
  soft: '#c8e6ff',
  strong: '#eaf5ff',
  dim: '#7f93b3',
  alert: '#ff6bd0',
} as const;

export const CONSOLE_BOOT: ConsoleLine[] = [
  { text: '> build --mode=prod', color: CONSOLE_TERM.accent },
  { text: '  [config] loaded angular.json', color: CONSOLE_TERM.accent },
  { text: '  [build] compiling application...', color: CONSOLE_TERM.accent },
  { text: '  [bundle] assets inlined', color: CONSOLE_TERM.accent },
  { text: '  [done] dist/Portafolio/browser', color: CONSOLE_TERM.accent },
  { text: '> npm run start', color: CONSOLE_TERM.soft },
  { text: '  ready on http://localhost:4200', color: CONSOLE_TERM.soft },
];

export const CONSOLE_COMMANDS: { cmd: string; hint: string }[] = [
  { cmd: 'help', hint: 'esta ayuda' },
  { cmd: 'whoami', hint: 'identidad' },
  { cmd: 'about', hint: 'sobre mi' },
  { cmd: 'skills', hint: 'tecnologias' },
  { cmd: 'projects', hint: 'proyectos' },
  { cmd: 'contact', hint: 'contacto' },
  { cmd: 'clear', hint: 'limpia la salida' },
];

export interface ConsoleResult {
  lines: ConsoleLine[];
  action?: 'clear' | 'close';
}

export function wrapText(text: string, width: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

export function wrapSkills(skills: string[]): string[] {
  const lines: string[] = [];
  let current = '';
  for (const skill of skills) {
    const next = current ? `${current} · ${skill}` : skill;
    if (next.length > 44 && current) {
      lines.push(current);
      current = skill;
    } else {
      current = next;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

export function runConsole(raw: string, ctx: ConsoleContext | undefined, projects: DiscProject[]): ConsoleResult {
  const lines: ConsoleLine[] = [];
  const push = (text: string, color: string): void => {
    lines.push({ text, color });
  };
  const [name = '', ...args] = raw.trim().split(/\s+/);

  switch (name.toLowerCase()) {
    case 'help':
    case 'ayuda':
      push('comandos:', CONSOLE_TERM.accent);
      CONSOLE_COMMANDS.forEach((entry) => push(`  ${entry.cmd.padEnd(10)}${entry.hint}`, CONSOLE_TERM.accent));
      break;
    case 'clear':
    case 'limpiar':
      return { lines, action: 'clear' };
    case 'ls':
      push('estanteria/  escritorio/  media/  sobre/', CONSOLE_TERM.soft);
      break;
    case 'pwd':
      push('/home/victor/portafolio', CONSOLE_TERM.soft);
      break;
    case 'whoami':
      push(ctx?.handle ?? 'victor', CONSOLE_TERM.strong);
      push(ctx?.role ?? 'Ingeniero Informatico', CONSOLE_TERM.soft);
      break;
    case 'about':
    case 'perfil':
    case 'sobre': {
      push('sobre mi:', CONSOLE_TERM.accent);
      const wrapped = (ctx?.about ?? ['Ingeniero Informatico.']).flatMap((paragraph) =>
        wrapText(paragraph, 46),
      );
      const capped = wrapped.length > 8 ? [...wrapped.slice(0, 8), '…'] : wrapped;
      capped.forEach((line) => push(`  ${line}`, CONSOLE_TERM.soft));
      break;
    }
    case 'skills':
    case 'habilidades':
    case 'tecnologias': {
      const skills = ctx?.skills ?? [];
      push(`tecnologias (${skills.length}):`, CONSOLE_TERM.accent);
      wrapSkills(skills).forEach((line) => push(`  ${line}`, CONSOLE_TERM.soft));
      break;
    }
    case 'projects':
    case 'proyectos':
      push(`proyectos (${projects.length}):`, CONSOLE_TERM.accent);
      projects.slice(0, 8).forEach((project) => push(`  ${project.title} · ${project.year}`, CONSOLE_TERM.soft));
      break;
    case 'contact':
    case 'contacto': {
      const contact = ctx?.contact;
      push('contacto:', CONSOLE_TERM.accent);
      if (contact?.email) push(`  ${contact.email}`, CONSOLE_TERM.soft);
      if (contact?.github) push(`  ${contact.github}`, CONSOLE_TERM.soft);
      if (contact?.linkedin) push(`  ${contact.linkedin}`, CONSOLE_TERM.soft);
      if (contact?.location) push(`  ${contact.location}`, CONSOLE_TERM.soft);
      break;
    }
    case 'date':
    case 'fecha':
      push(new Date().toLocaleString('es-CO'), CONSOLE_TERM.soft);
      break;
    case 'echo':
      push(args.join(' ') || '(nada)', CONSOLE_TERM.soft);
      break;
    case 'salir':
    case 'exit':
      return { lines, action: 'close' };
    default:
      push(`comando no encontrado: ${name}`, CONSOLE_TERM.alert);
      push('  escribe "help" para ver los comandos', CONSOLE_TERM.dim);
      break;
  }

  return { lines };
}

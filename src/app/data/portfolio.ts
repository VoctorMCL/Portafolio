export interface Project {
  id: string;
  title: string;
  tagline: string;
  year: string;
  summary: string;
  tech: string[];
  demoUrl?: string;
  repoUrl?: string;
}

export interface RoomContent {
  handle: string;
  role: string;
  about: string[];
  education: { title: string; place: string; period: string }[];
  skills: string[];
  contact: {
    email: string;
    github?: string;
    linkedin?: string;
    location?: string;
  };
}

export const ROOM_CONTENT: RoomContent = {
  handle: 'victormcl',
  role: 'Desarrollador de Software',
  about: [
    'Colombiano construyendo cosas para la web. Actualmente estudiando Ingeniería de Software y explorando frontend, redes e IoT.',
    'Me gustan los proyectos que mezclan hardware y software: sensores, cámaras, automatización y las interfaces que los controlan.',
  ],
  education: [
    {
      title: 'Ingeniería de Software',
      place: 'Universidad',
      period: '2022 — actualidad',
    },
    {
      title: 'Técnico en Desarrollo de Software',
      place: 'SENA',
      period: '2021 — 2022',
    },
  ],
  skills: [
    'Angular',
    'TypeScript',
    'Java',
    'Python',
    'Node.js',
    'MySQL',
    'Linux',
    'Arduino / RFID',
  ],
  contact: {
    email: 'tu-correo@ejemplo.com',
    github: 'https://github.com/tu-usuario',
    linkedin: 'https://linkedin.com/in/tu-usuario',
    location: 'Colombia',
  },
};

export const PROJECTS: Project[] = [
  {
    id: 'accidentes',
    title: 'Simulador de Accidentes',
    tagline: 'Física en tiempo real',
    year: '2025',
    summary:
      'Simulación interactiva de colisiones para análisis de daños. Dibuja escenarios, ajusta masa y velocidad, y observa cómo se resuelve el impacto.',
    tech: ['Unity', 'C#', 'Física 2D'],
    demoUrl: 'https://ejemplo.com/demo',
    repoUrl: 'https://github.com/tu-usuario/simulador-accidentes',
  },
  {
    id: 'rfid',
    title: 'Sistema de Acceso RFID',
    tagline: 'Control de acceso IoT',
    year: '2025',
    summary:
      'Torniquete con lector RFID que valida credenciales contra un backend en tiempo real, registra entradas y muestra un panel de asistencia.',
    tech: ['Arduino', 'Node.js', 'Express', 'MySQL'],
    repoUrl: 'https://github.com/tu-usuario/acceso-rfid',
  },
  {
    id: 'campusclash',
    title: 'CampusClash',
    tagline: 'Torneos universitarios',
    year: '2024',
    summary:
      'Plataforma para organizar torneos entre facultades: brackets, puntajes en vivo y perfiles de equipo. Hecha en colaboración con compañeros.',
    tech: ['Angular', 'TypeScript', 'Firebase'],
    demoUrl: 'https://ejemplo.com/campusclash',
    repoUrl: 'https://github.com/tu-usuario/campusclash',
  },
];

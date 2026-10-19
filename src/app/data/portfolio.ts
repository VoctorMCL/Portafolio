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
  handle: 'Victor Manuel Cordoba Larez',
  role: 'Ingeniero Informatico / Desarrollador de Software',
  about: [
    'Soy Victor Cordoba, técnico en programación de software y estudiante de cuarto semestre en Unilasallista. Me muevo entre frontend, bases de datos e IoT.',
    'Me gustan los proyectos que mezclan hardware y software: control de acceso con RFID, sensores con Arduino y ESP32, un mini compilador propio y las interfaces que los manejan.',
    'Además estoy entrando al mundo de la ciberseguridad, aprendiendo con Kali Linux, Nmap, sqlmap y Wireshark.',
  ],
  education: [
    {
      title: 'Ingeniería de Software',
      place: 'Corporación Universitaria Lasallista',
      period: '4.º semestre',
    },
    {
      title: 'Técnico en Programación de Software',
      place: 'SENA',
      period: '2023-2024',
    },
    {
      title: 'Mejor bachiller',
      place: 'I.E. Alejandro Velez Barrientos',
      period: '2024',
    },
  ],
  skills: [
    'JavaScript',
    'Angular',
    'Vite',
    'Tailwind',
    'PHP',
    'Python',
    'Java',
    'MySQL',
    'PostgreSQL',
    'MongoDB',
    'Arduino',
    'ESP32',
    'Linux',
    'Git',
    'Kali Linux',
    'Nmap',
    'sqlmap',
    'Wireshark',
  ],
  contact: {
    email: 'cordobavictorml@gmail.com',
    github: 'https://github.com/VoctorMCL',
    location: 'Colombia',
  },
};

export const PROJECTS: Project[] = [
  {
    id: 'rfid',
    title: 'Control de Acceso RFID',
    tagline: 'IoT con Esp32 RFID, via CrowPi3',
    year: '2026',
    summary:
      'Sistema de control de acceso con lector RFID RC522 en CrowPi3 para Unilasallista. Valida cada tarjeta contra Supabase, registra el intento como ACEPTADO o DENEGADO y lo muestra en una interfaz web.',
    tech: ['Python', 'RFID', 'NFC', 'Supabase', 'Angular'],
    repoUrl: 'https://github.com/VoctorMCL/RFID',
  },
  {
    id: 'sensorlang',
    title: 'SensorLang',
    tagline: 'Mini compilador para Arduino',
    year: '2026',
    summary:
      'Lenguaje propio y mini compilador que interpreta instrucciones desde la consola y controla un Arduino Nano, por ejemplo para prender y apagar LEDs y leer sensores.',
    tech: ['Python', 'Arduino Nano', 'Compiladores', 'Esp32'],
  },
  {
    id: 'macollo',
    title: 'Proyecto Invernadero',
    tagline: 'Invernadero Inteligente - Monitoreo de cultivos',
    year: '2026',
    summary:
      'Aplicación web para el seguimiento de un invernadero, desarrollada en equipo con una base de datos Postgres. TODO: describe qué hace (sensores, dashboard, etc.).',
    tech: ['Astro', 'PostgreSQL', 'Git', 'pnpm', 'IoT'],
    repoUrl: 'https://github.com/Jdgb22/Proyect_invernadero',
    demoUrl: 'macollo.tech',
  },
  {
    id: 'sgp',
    title: 'SGP Parqueadero',
    tagline: 'Gestión de parqueadero',
    year: '2026',
    summary:
      'Sistema de gestión para parqueadero. Control de ingresos, reportes y accesos a parqueaderos, diseñado para ser escalable y adaptable a diferentes tipos de parqueaderos',
    tech: ['MongoDB', 'Express', 'Angular', 'Node.js', 'TypeScript'],
    repoUrl: 'https://github.com/VoctorMCL/SGP',
  },
  {
    id: 'lazo',
    title: 'Lazo',
    tagline: 'Chatbot con IA',
    year: '2026',
    summary:
      'Proyecto académico de un chatbot basado 100% en IA, probado con unos 50 casos pregenerados, con marco teórico, análisis ético y de impacto.',
    tech: ['IA generativa', 'Prompt engineering', 'Gemini', 'Angular'],
    repoUrl: 'https://github.com/VoctorMCL/Lazo',
    demoUrl: 'lazo.victormcl.me',
  },
  {
    id: 'cfsv',
    title: 'CFSV',
    tagline: 'Calculadora Fisica de Siniestros Viales',
    year: '2026',
    summary:
      'Caluladora fisica que describe y recrea situaciones de siniestros viales. Capaz de ralentizar la física de un choque, calcular velocidades, distancias y fuerzas involucradas en un accidente de tránsito.',
    tech: ['HTML', 'CSS', 'JavaScript', 'three.js'],
    repoUrl: 'https://github.com/VoctorMCL/ProyectoFisica',
  },
  {
    id: 'sisv',
    title: 'SISV',
    tagline: 'Sistema Informatico de Siniestros Viales',
    year: '2025',
    summary:
      'Herramienta para la gestión de siniestros viales, con mapa en tiempo real, registro de incidentes y reportes estadísticos.',
    tech: ['PHP', 'MySQL', 'JavaScript', 'Leaflet.js'],
    repoUrl: 'https://github.com/VoctorMCL/SISV',
  },
  {
    id: 'kongelados',
    title: 'Kongelados',
    tagline: 'E-commerce para tienda',
    year: '2025',
    summary:
      'Tienda en línea para una empresa de productos congelados, con catálogo, carrito de compras y pagos integrados a través de una pasarela de pago (Wompi).',
    tech: ['PHP', 'Tailwind', 'JavaScript', 'Wompi'],
  },
  {
    id: 'sill23ec',
    title: 'SILL23EC',
    tagline: 'TODO',
    year: '2024',
    summary:
      'Sistema de gestión de inventario y logística para una tienda real, con funcionalidades de seguimiento de productos, control de stock y generación de reportes.',
    tech: ['PHP', 'MySQL', 'JavaScript', 'CSS'],
    repoUrl: 'https://github.com/VoctorMCL/SILL23EC',
  },
];

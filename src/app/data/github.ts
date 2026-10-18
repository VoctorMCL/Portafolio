import { PROJECTS } from './portfolio';

export interface DiscProject {
  id: string;
  name: string;
  title: string;
  summary: string;
  language?: string;
  tech: string[];
  repoUrl: string;
  demoUrl?: string;
  stars: number;
  year: string;
  accent: string;
}

export const GITHUB_USER = 'VoctorMCL';

const PALETTE = [
  '#39e0ff',
  '#ff2fb0',
  '#8a4dff',
  '#6cd0ff',
  '#ffd166',
  '#06d6a0',
  '#ef476f',
  '#457b9d',
  '#f4a261',
  '#9b5de5',
];

export function getProjects(): DiscProject[] {
  return PROJECTS.map((project, index) => ({
    id: project.id,
    name: project.id,
    title: project.title,
    summary: project.summary,
    language: project.tech[0],
    tech: project.tech,
    repoUrl: project.repoUrl ?? `https://github.com/${GITHUB_USER}`,
    demoUrl: project.demoUrl,
    stars: 0,
    year: project.year,
    accent: PALETTE[index % PALETTE.length],
  }));
}

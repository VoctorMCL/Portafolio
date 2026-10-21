import { PROJECTS } from './portfolio';

export interface DiscProject {
  id: string;
  title: string;
  summary: string;
  tech: string[];
  repoUrl?: string;
  demoUrl?: string;
  year: string;
  accent: string;
}

export const GITHUB_USER = 'VoctorMCL';

const withProtocol = (url: string): string => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

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
    title: project.title,
    summary: project.summary,
    tech: project.tech,
    repoUrl: project.repoUrl ? withProtocol(project.repoUrl) : undefined,
    demoUrl: project.demoUrl ? withProtocol(project.demoUrl) : undefined,
    year: project.year,
    accent: PALETTE[index % PALETTE.length],
  }));
}

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

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Python: '#3572a5',
  Java: '#b07219',
  PHP: '#4f5d95',
  C: '#555555',
  'C#': '#178600',
  'C++': '#f34b7d',
  Shell: '#89e051',
  Groovy: '#4298b8',
};

interface RawRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  topics?: string[];
  pushed_at: string | null;
  created_at: string | null;
  fork: boolean;
  archived: boolean;
}

function prettify(name: string): string {
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toDisc(repo: RawRepo, index: number): DiscProject {
  const tech = [repo.language, ...(repo.topics ?? [])].filter((t): t is string => !!t);
  const accent =
    (repo.language && LANGUAGE_COLORS[repo.language]) || PALETTE[index % PALETTE.length];
  const stamp = repo.pushed_at ?? repo.created_at ?? '';
  return {
    id: String(repo.id),
    name: repo.name,
    title: prettify(repo.name),
    summary: repo.description?.trim() || 'Proyecto alojado en GitHub.',
    language: repo.language ?? undefined,
    tech: tech.slice(0, 6),
    repoUrl: repo.html_url,
    demoUrl: repo.homepage?.trim() || undefined,
    stars: repo.stargazers_count,
    year: stamp ? String(new Date(stamp).getFullYear()) : '—',
    accent,
  };
}

export async function fetchGitHubProjects(user: string = GITHUB_USER): Promise<DiscProject[]> {
  if (typeof fetch !== 'function') {
    return fallbackProjects();
  }
  try {
    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=pushed`,
      { headers: { Accept: 'application/vnd.github+json' } },
    );
    if (!response.ok) {
      throw new Error(`GitHub respondió ${response.status}`);
    }
    const repos = (await response.json()) as RawRepo[];
    if (!Array.isArray(repos) || repos.length === 0) {
      throw new Error('Sin repositorios públicos');
    }
    return repos
      .filter((repo) => !repo.fork && !repo.archived)
      .map((repo, index) => toDisc(repo, index));
  } catch (error) {
    console.warn('GitHub no disponible, usando proyectos locales:', error);
    return fallbackProjects();
  }
}

export function fallbackProjects(): DiscProject[] {
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

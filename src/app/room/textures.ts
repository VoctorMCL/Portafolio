function surface(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d')! };
}

export function heightToNormal(source: HTMLCanvasElement, strength = 2): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const { canvas, ctx } = surface(w, h);
  const src = source.getContext('2d')!.getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h);

  const lum = (x: number, y: number): number => {
    const xx = (x + w) % w;
    const yy = (y + h) % h;
    const i = (yy * w + xx) * 4;
    return (src[i] * 299 + src[i + 1] * 587 + src[i + 2] * 114) / 255000;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (lum(x + 1, y) - lum(x - 1, y)) * strength;
      const dy = (lum(x, y + 1) - lum(x, y - 1)) * strength;
      let nx = -dx;
      let ny = dy;
      let nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv;
      ny *= inv;
      nz *= inv;
      const i = (y * w + x) * 4;
      out.data[i] = (nx * 0.5 + 0.5) * 255;
      out.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      out.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

export function woodCanvas(): HTMLCanvasElement {
  const { canvas, ctx } = surface(256, 256);
  ctx.fillStyle = '#41301f';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 240; i++) {
    const shade = 18 + Math.random() * 46;
    ctx.strokeStyle = `rgba(${shade + 20}, ${shade + 8}, ${shade - 4}, ${0.06 + Math.random() * 0.14})`;
    ctx.lineWidth = 0.5 + Math.random() * 2;
    const y = Math.random() * 256;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(64, y + (Math.random() - 0.5) * 10, 192, y + (Math.random() - 0.5) * 10, 256, y + (Math.random() - 0.5) * 6);
    ctx.stroke();
  }

  for (let i = 0; i <= 256; i += 64) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  return canvas;
}

export function planksCanvas(): HTMLCanvasElement {
  const { canvas, ctx } = surface(512, 512);
  ctx.fillStyle = '#241a13';
  ctx.fillRect(0, 0, 512, 512);

  const plankH = 64;
  for (let row = 0; row < 512 / plankH; row++) {
    const y = row * plankH;
    const tone = 26 + Math.random() * 22;
    ctx.fillStyle = `rgb(${tone + 16}, ${tone + 4}, ${tone - 4})`;
    ctx.fillRect(0, y, 512, plankH - 3);

    for (let i = 0; i < 70; i++) {
      ctx.strokeStyle = `rgba(10,6,2,${0.05 + Math.random() * 0.12})`;
      ctx.lineWidth = 0.5 + Math.random();
      const ly = y + Math.random() * plankH;
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.bezierCurveTo(170, ly + (Math.random() - 0.5) * 8, 340, ly + (Math.random() - 0.5) * 8, 512, ly + (Math.random() - 0.5) * 5);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  for (let row = 0; row <= 8; row++) {
    ctx.beginPath();
    ctx.moveTo(0, row * plankH);
    ctx.lineTo(512, row * plankH);
    ctx.stroke();
  }

  return canvas;
}

export function wallCanvas(): HTMLCanvasElement {
  const { canvas, ctx } = surface(256, 256);
  ctx.fillStyle = '#1b1e2b';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 6000; i++) {
    const a = Math.random() * 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }

  return canvas;
}

export function sidingCanvas(): HTMLCanvasElement {
  const { canvas, ctx } = surface(256, 256);
  ctx.fillStyle = '#2b2b38';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 16) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(0, y + 13, 256, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, y, 256, 1);
  }

  return canvas;
}

export function rugCanvas(): HTMLCanvasElement {
  const { canvas, ctx } = surface(256, 256);
  ctx.fillStyle = '#20233a';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(120, 210, 255, 0.5)';
  ctx.lineWidth = 3;
  for (let r = 40; r < 150; r += 26) {
    ctx.strokeRect(128 - r, 128 - r * 0.62, r * 2, r * 1.24);
  }
  ctx.strokeStyle = 'rgba(255, 47, 176, 0.45)';
  ctx.strokeRect(18, 18, 220, 220);

  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }

  return canvas;
}

export function posterCanvas(lines: string[], bg: string, fg: string): HTMLCanvasElement {
  const { canvas, ctx } = surface(256, 384);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 384);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 232, 360);

  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.font = i === 0 ? 'bold 44px monospace' : 'bold 30px monospace';
    ctx.fillText(line, 128, 120 + i * 64);
  });

  return canvas;
}

export function screenCanvas(): HTMLCanvasElement {
  const { canvas, ctx } = surface(512, 320);
  ctx.fillStyle = '#020a14';
  ctx.fillRect(0, 0, 512, 320);

  ctx.fillStyle = 'rgba(40, 160, 255, 0.10)';
  for (let y = 0; y < 320; y += 4) {
    ctx.fillRect(0, y, 512, 1);
  }

  ctx.font = '18px monospace';
  const lines = [
    { text: '> whoami', color: '#6cd0ff' },
    { text: '  victormcl', color: '#c8e6ff' },
    { text: '> ls proyectos/', color: '#6cd0ff' },
    { text: '  simulador  rfid  campusclash', color: '#c8e6ff' },
    { text: '> status --now', color: '#6cd0ff' },
    { text: '  buscando ideas...', color: '#ff6bd0' },
  ];
  lines.forEach((line, i) => {
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, 22, 46 + i * 34);
  });

  ctx.fillStyle = '#9ef0ff';
  ctx.fillRect(22, 250, 12, 20);

  return canvas;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

export function discCanvas(label: string, accent: string): HTMLCanvasElement {
  const size = 256;
  const { canvas, ctx } = surface(size, size);
  const c = size / 2;

  const metallic = ctx.createRadialGradient(c - 30, c - 30, 10, c, c, c);
  metallic.addColorStop(0, '#dfe6f2');
  metallic.addColorStop(0.5, '#a7b1c6');
  metallic.addColorStop(1, '#6f7a90');
  ctx.fillStyle = metallic;
  ctx.beginPath();
  ctx.arc(c, c, c - 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, c - 1, 0, Math.PI * 2);
  ctx.clip();

  ctx.globalAlpha = 0.18;
  for (let r = 30; r < size; r += 12) {
    ctx.strokeStyle = r % 24 === 0 ? accent : '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(c, c, 84, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(6, 8, 16, 0.78)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px monospace';
  const lines = wrapLines(ctx, label.toUpperCase(), 150).slice(0, 3);
  const startY = c - ((lines.length - 1) * 24) / 2;
  lines.forEach((line, i) => ctx.fillText(line, c, startY + i * 24));

  ctx.fillStyle = '#0b0b12';
  ctx.beginPath();
  ctx.arc(c, c, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f2f5fb';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(c, c, 26, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
  return canvas;
}

export function discScreenCanvas(project: {
  title: string;
  summary: string;
  year: string;
  tech: string[];
  language?: string;
  repoUrl: string;
  accent: string;
}): HTMLCanvasElement {
  const { canvas, ctx } = surface(512, 384);
  const accent = project.accent;
  ctx.fillStyle = '#03070e';
  ctx.fillRect(0, 0, 512, 384);

  const glow = ctx.createRadialGradient(256, 150, 20, 256, 150, 320);
  glow.addColorStop(0, `${accent}55`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 512, 384);

  ctx.fillStyle = 'rgba(120, 220, 255, 0.07)';
  for (let y = 0; y < 384; y += 4) {
    ctx.fillRect(0, y, 512, 1);
  }

  ctx.strokeStyle = `${accent}aa`;
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, 480, 352);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = accent;
  ctx.font = 'bold 19px monospace';
  ctx.fillText(`► REPRODUCIENDO · ${project.year}`, 40, 62);

  let y = 108;
  ctx.fillStyle = '#eaf5ff';
  ctx.font = 'bold 38px monospace';
  const titleLines = wrapLines(ctx, project.title.toUpperCase(), 432).slice(0, 2);
  titleLines.forEach((line) => {
    ctx.fillText(line, 40, y);
    y += 44;
  });

  y += 6;
  ctx.fillStyle = '#8fb6d8';
  ctx.font = '18px monospace';
  const summaryLines = wrapLines(ctx, project.summary, 432).slice(0, 3);
  summaryLines.forEach((line) => {
    ctx.fillText(line, 40, y);
    y += 23;
  });

  y += 18;
  ctx.font = '15px monospace';
  let x = 40;
  for (const tag of project.tech.slice(0, 5)) {
    const w = ctx.measureText(tag).width + 20;
    if (x + w > 472) {
      break;
    }
    ctx.strokeStyle = `${accent}88`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y - 16, w, 24, 12);
    ctx.stroke();
    ctx.fillStyle = '#cfe6ff';
    ctx.fillText(tag, x + 10, y + 1);
    x += w + 10;
  }

  ctx.fillStyle = '#5d86ad';
  ctx.font = '14px monospace';
  const url = project.repoUrl.replace(/^https?:\/\//, '');
  ctx.fillText(url.length > 46 ? `${url.slice(0, 45)}…` : url, 40, 348);

  return canvas;
}

export interface SkillLogo {
  slug: string;
  label: string;
  color: string;
  src: string;
}

const svgDataUri = (svg: string): string => {
  if (svg.startsWith('data:')) return svg;
  const sized = /<svg[^>]*\swidth=/.test(svg) ? svg : svg.replace('<svg ', '<svg width="96" height="96" ');
  return `data:image/svg+xml,${encodeURIComponent(sized)}`;
};

let skillLogosCache: SkillLogo[] | null = null;

export function cachedSkillLogos(): SkillLogo[] {
  return skillLogosCache ?? [];
}

export async function loadSkillLogos(): Promise<SkillLogo[]> {
  if (skillLogosCache) return skillLogosCache;
  try {
    const res = await fetch('assets/skills-logos.json');
    const list = (await res.json()) as { slug: string; label: string; color: string; svg: string }[];
    skillLogosCache = list.map((s) => ({ slug: s.slug, label: s.label, color: s.color, src: svgDataUri(s.svg) }));
  } catch {
    skillLogosCache = [];
  }
  return skillLogosCache;
}

export function logoPosterCanvas(skill: SkillLogo, onUpdate?: () => void): HTMLCanvasElement {
  const { canvas, ctx } = surface(256, 384);
  ctx.fillStyle = '#0c1120';
  ctx.fillRect(0, 0, 256, 384);
  ctx.strokeStyle = '#22304a';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 240, 368);

  const tileX = 48;
  const tileY = 62;
  const tile = 160;
  const drawTile = () => {
    ctx.fillStyle = '#141b2c';
    ctx.beginPath();
    ctx.roundRect(tileX, tileY, tile, tile, 26);
    ctx.fill();
    ctx.strokeStyle = skill.color;
    ctx.lineWidth = 3;
    ctx.stroke();
  };
  drawTile();

  ctx.fillStyle = '#dbe8ff';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(skill.label.toUpperCase(), 128, 300);

  if (skill.src) {
    const img = new Image();
    img.onload = () => {
      drawTile();
      const pad = 26;
      const scale = Math.min((tile - pad * 2) / img.width, (tile - pad * 2) / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, 128 - dw / 2, tileY + tile / 2 - dh / 2, dw, dh);
      onUpdate?.();
    };
    img.src = skill.src;
  }
  return canvas;
}

export function skyCanvas(): HTMLCanvasElement {
  const { canvas, ctx } = surface(1024, 512);

  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#080418');
  gradient.addColorStop(0.3, '#160f38');
  gradient.addColorStop(0.55, '#221850');
  gradient.addColorStop(0.78, '#2a1e5c');
  gradient.addColorStop(1, '#100a26');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);

  for (let i = 0; i < 700; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 320;
    const a = Math.random() * 0.85;
    const r = Math.random() * 1.4 + 0.2;
    ctx.fillStyle = `rgba(${210 + Math.random() * 45}, ${220 + Math.random() * 35}, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const moonX = 760;
  const moonY = 110;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 150);
  moonGlow.addColorStop(0, 'rgba(210, 225, 255, 0.65)');
  moonGlow.addColorStop(1, 'rgba(210, 225, 255, 0)');
  ctx.fillStyle = moonGlow;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = '#e8eeff';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

export function doormatCanvas(): HTMLCanvasElement {
  const { canvas, ctx } = surface(256, 160);
  ctx.fillStyle = '#2a2016';
  ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = '#c9a24b';
  ctx.font = 'bold 40px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WELCOME', 128, 80);

  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 160, 1, 1);
  }

  return canvas;
}

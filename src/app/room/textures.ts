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

export type LogoKey = 'ts' | 'js' | 'py' | 'ng' | 'cs' | 'gh';

const LOGO_ACCENT: Record<LogoKey, string> = {
  ts: '#3178c6', js: '#f0db4f', py: '#4b8bbe', ng: '#dd1b16', cs: '#9b4f96', gh: '#c9d1d9',
};

const svgDataUri = (svg: string): string =>
  `data:image/svg+xml,${encodeURIComponent(svg.replace('<svg ', '<svg width="96" height="96" '))}`;

const LOGO_SVG: Record<LogoKey, string> = {
  ts: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#fff" d="M22.67 47h99.67v73.67H22.67z"/><path fill="#007acc" d="M1.5 63.91v62.5h125v-125H1.5zm100.73-5a15.56 15.56 0 017.82 4.5 20.58 20.58 0 013 4c0 .16-5.4 3.81-8.69 5.85-.12.08-.6-.44-1.13-1.23a7.09 7.09 0 00-5.87-3.53c-3.79-.26-6.23 1.73-6.21 5a4.58 4.58 0 00.54 2.34c.83 1.73 2.38 2.76 7.24 4.86 8.95 3.85 12.78 6.39 15.16 10 2.66 4 3.25 10.46 1.45 15.24-2 5.2-6.9 8.73-13.83 9.9a38.32 38.32 0 01-9.52-.1 23 23 0 01-12.72-6.63c-1.15-1.27-3.39-4.58-3.25-4.82a9.34 9.34 0 011.15-.73L82 101l3.59-2.08.75 1.11a16.78 16.78 0 004.74 4.54c4 2.1 9.46 1.81 12.16-.62a5.43 5.43 0 00.69-6.92c-1-1.39-3-2.56-8.59-5-6.45-2.78-9.23-4.5-11.77-7.24a16.48 16.48 0 01-3.43-6.25 25 25 0 01-.22-8c1.33-6.23 6-10.58 12.82-11.87a31.66 31.66 0 019.49.26zm-29.34 5.24v5.12H56.66v46.23H45.15V69.26H28.88v-5a49.19 49.19 0 01.12-5.17C29.08 59 39 59 51 59h21.83z"/></svg>'),
  js: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#f0db4f" d="M1.408 1.408h125.184v125.185H1.408z"/><path fill="#323330" d="M116.347 96.736c-.917-5.711-4.641-10.508-15.672-14.981-3.832-1.761-8.104-3.022-9.377-5.926-.452-1.69-.512-2.642-.226-3.665.821-3.32 4.784-4.355 7.925-3.403 2.023.678 3.938 2.237 5.093 4.724 5.402-3.498 5.391-3.475 9.163-5.879-1.381-2.141-2.118-3.129-3.022-4.045-3.249-3.629-7.676-5.498-14.756-5.355l-3.688.477c-3.534.893-6.902 2.748-8.877 5.235-5.926 6.724-4.236 18.492 2.975 23.335 7.104 5.332 17.54 6.545 18.873 11.531 1.297 6.104-4.486 8.08-10.234 7.378-4.236-.881-6.592-3.034-9.139-6.949-4.688 2.713-4.688 2.713-9.508 5.485 1.143 2.499 2.344 3.63 4.26 5.795 9.068 9.198 31.76 8.746 35.83-5.176.165-.478 1.261-3.666.38-8.581zM69.462 58.943H57.753l-.048 30.272c0 6.438.333 12.34-.714 14.149-1.713 3.558-6.152 3.117-8.175 2.427-2.059-1.012-3.106-2.451-4.319-4.485-.333-.584-.583-1.036-.667-1.071l-9.52 5.83c1.583 3.249 3.915 6.069 6.902 7.901 4.462 2.678 10.459 3.499 16.731 2.059 4.082-1.189 7.604-3.652 9.448-7.401 2.666-4.915 2.094-10.864 2.07-17.444.06-10.735.001-21.468.001-32.237z"/></svg>'),
  py: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><linearGradient id="pyA" gradientUnits="userSpaceOnUse" x1="70.252" y1="1237.476" x2="170.659" y2="1151.089" gradientTransform="matrix(.563 0 0 -.568 -29.215 707.817)"><stop offset="0" stop-color="#5A9FD4"/><stop offset="1" stop-color="#306998"/></linearGradient><linearGradient id="pyB" gradientUnits="userSpaceOnUse" x1="209.474" y1="1098.811" x2="173.62" y2="1149.537" gradientTransform="matrix(.563 0 0 -.568 -29.215 707.817)"><stop offset="0" stop-color="#FFD43B"/><stop offset="1" stop-color="#FFE873"/></linearGradient><path fill="url(#pyA)" d="M63.391 1.988c-4.222.02-8.252.379-11.8 1.007-10.45 1.846-12.346 5.71-12.346 12.837v9.411h24.693v3.137H29.977c-7.176 0-13.46 4.313-15.426 12.521-2.268 9.405-2.368 15.275 0 25.096 1.755 7.311 5.947 12.519 13.124 12.519h8.491V67.234c0-8.151 7.051-15.34 15.426-15.34h24.665c6.866 0 12.346-5.654 12.346-12.548V15.833c0-6.693-5.646-11.72-12.346-12.837-4.244-.706-8.645-1.027-12.866-1.008zM50.037 9.557c2.55 0 4.634 2.117 4.634 4.721 0 2.593-2.083 4.69-4.634 4.69-2.56 0-4.633-2.097-4.633-4.69-.001-2.604 2.073-4.721 4.633-4.721z" transform="translate(0 10.26)"/><path fill="url(#pyB)" d="M91.682 28.38v10.966c0 8.5-7.208 15.655-15.426 15.655H51.591c-6.756 0-12.346 5.783-12.346 12.549v23.515c0 6.691 5.818 10.628 12.346 12.547 7.816 2.297 15.312 2.713 24.665 0 6.216-1.801 12.346-5.423 12.346-12.547v-9.412H63.938v-3.138h37.012c7.176 0 9.852-5.005 12.348-12.519 2.578-7.735 2.467-15.174 0-25.096-1.774-7.145-5.161-12.521-12.348-12.521h-9.268zM77.809 87.927c2.561 0 4.634 2.097 4.634 4.692 0 2.602-2.074 4.719-4.634 4.719-2.55 0-4.633-2.117-4.633-4.719 0-2.595 2.083-4.692 4.633-4.692z" transform="translate(0 10.26)"/></svg>'),
  ng: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#B3B3B3" d="M63.81 1.026L4.553 21.88l9.363 77.637 49.957 27.457 50.214-27.828 9.36-77.635z"/><path fill="#A6120D" d="M117.536 25.998L63.672 7.629v112.785l45.141-24.983z"/><path fill="#DD1B16" d="M11.201 26.329l8.026 69.434 44.444 24.651V7.627z"/><path fill="#F2F2F2" d="M78.499 67.67l-14.827 6.934H48.044l-7.347 18.374-13.663.254 36.638-81.508L78.499 67.67zm-1.434-3.491L63.77 37.858 52.864 63.726h10.807l13.394.453z"/><path fill="#B3B3B3" d="M63.671 11.724l.098 26.134 12.375 25.888H63.698l-.027 10.841 17.209.017 8.042 18.63 13.074.242z"/></svg>'),
  cs: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#9B4F96" d="M115.4 30.7L67.1 2.9c-.8-.5-1.9-.7-3.1-.7-1.2 0-2.3.3-3.1.7l-48 27.9c-1.7 1-2.9 3.5-2.9 5.4v55.7c0 1.1.2 2.4 1 3.5l106.8-62c-.6-1.2-1.5-2.1-2.4-2.7z"/><path fill="#68217A" d="M10.7 95.3c.5.8 1.2 1.5 1.9 1.9l48.2 27.9c.8.5 1.9.7 3.1.7 1.2 0 2.3-.3 3.1-.7l48-27.9c1.7-1 2.9-3.5 2.9-5.4V36.1c0-.9-.1-1.9-.6-2.8l-106.6 62z"/><path fill="#fff" d="M85.3 76.1C81.1 83.5 73.1 88.5 64 88.5c-13.5 0-24.5-11-24.5-24.5s11-24.5 24.5-24.5c9.1 0 17.1 5 21.3 12.5l13-7.5c-6.8-11.9-19.6-20-34.3-20-21.8 0-39.5 17.7-39.5 39.5s17.7 39.5 39.5 39.5c14.6 0 27.4-8 34.2-19.8l-12.9-7.6zM97 66.2l.9-4.3h-4.2v-4.7h5.1L100 51h4.9l-1.2 6.1h3.8l1.2-6.1h4.8l-1.2 6.1h2.4v4.7h-3.3l-.9 4.3h4.2v4.7h-5.1l-1.2 6h-4.9l1.2-6h-3.8l-1.2 6h-4.8l1.2-6h-2.4v-4.7H97zm4.8 0h3.8l.9-4.3h-3.8l-.9 4.3z"/></svg>'),
  gh: svgDataUri('<svg fill="#ffffff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>'),
};

export function logoPosterCanvas(logoKey: LogoKey, label: string, onUpdate?: () => void): HTMLCanvasElement {
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
    ctx.strokeStyle = LOGO_ACCENT[logoKey];
    ctx.lineWidth = 3;
    ctx.stroke();
  };
  drawTile();

  ctx.fillStyle = '#dbe8ff';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.toUpperCase(), 128, 300);

  const src = LOGO_SVG[logoKey];
  if (src) {
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
    img.src = src;
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

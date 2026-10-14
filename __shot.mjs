import puppeteer from 'puppeteer-core';

const EXE = '/home/victormcl/.cache/puppeteer/chrome/linux-152.0.7977.75/chrome-linux64/chrome';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: true,
  protocolTimeout: 180000,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--ignore-gpu-blocklist',
    '--disable-dev-shm-usage',
    '--window-size=800,480',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 800, height: 480 });
page.on('console', (m) => log(`[${m.type()}] ${m.text().slice(0, 500)}`));
page.on('pageerror', (e) => log(`[pageerror] ${e.message.slice(0, 500)}`));

log('goto');
await page.goto('http://localhost:5099/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => log('[goto] ' + e.message));

for (let i = 0; i < 15; i++) {
  await new Promise((r) => setTimeout(r, 4000));
  const st = await page
    .evaluate(() => {
      const c = document.querySelector('canvas');
      return { hasCanvas: !!c, w: c?.width, h: c?.height, loader: !!document.querySelector('.loader') };
    })
    .catch((e) => ({ err: e.message }));
  log('t=' + (i + 1) * 4 + 's ' + JSON.stringify(st));
  if (st.hasCanvas && !st.loader) break;
}

await page.screenshot({ path: '/tmp/opencode/shot.png' }).then(() => log('screenshot ok')).catch((e) => log('screenshot err ' + e.message));
await browser.close().catch(() => {});
log('done');

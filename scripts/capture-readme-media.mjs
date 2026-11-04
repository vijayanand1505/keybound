// Run with Node 24, Google Chrome, FFmpeg, and a running development server.
// FFMPEG_PATH=/path/to/ffmpeg node scripts/capture-readme-media.mjs
import { copyFile, mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const baseURL = process.env.MEDIA_BASE_URL || 'http://localhost:3000';
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
if (spawnSync(ffmpeg, ['-version'], { stdio: 'ignore' }).status !== 0) {
  throw new Error('Install FFmpeg or set FFMPEG_PATH before capturing media.');
}
const output = resolve('docs/media');
await mkdir(output, { recursive: true });
const scratch = await mkdtemp(join(tmpdir(), 'keybound-media-'));
// An explicit full FFmpeg build can also serve as Playwright's recording helper.
// Keep it in a temporary registry rather than changing the user's browser cache.
if (process.env.FFMPEG_PATH) {
  const require = createRequire(import.meta.url);
  const core = dirname(require.resolve('playwright-core/package.json'));
  const { browsers } = JSON.parse(await readFile(join(core, 'browsers.json'), 'utf8'));
  const revision = browsers.find(browser => browser.name === 'ffmpeg').revision;
  process.env.PLAYWRIGHT_BROWSERS_PATH = join(scratch, 'playwright');
  const helper = join(process.env.PLAYWRIGHT_BROWSERS_PATH, `ffmpeg-${revision}`);
  await mkdir(helper, { recursive: true });
  const binary = process.platform === 'darwin' ? 'ffmpeg-mac'
    : process.platform === 'win32' ? 'ffmpeg-win64.exe' : 'ffmpeg-linux';
  await copyFile(resolve(process.env.FFMPEG_PATH), join(helper, binary));
}
const { chromium, expect } = await import('@playwright/test');
const missions = JSON.parse(await readFile('content/missions.json', 'utf8'));
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
let state;

function encode(args) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr || 'FFmpeg failed');
}

async function record(name, action) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    storageState: state,
    recordVideo: { dir: scratch, size: { width: 1280, height: 888 } },
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const button = name => page.getByRole('button', {
    name: name === 'Begin mission' ? /^Begin mission/ : name,
    exact: true,
  });
  const hold = (ms = 1200) => page.waitForTimeout(ms);
  const shot = async (name, locator) => {
    await page.evaluate(() => document.fonts.ready);
    await hold(400);
    const target = locator || (['custom-text', 'practice', 'settings', 'progress'].includes(name)
      ? page.locator('#main') : page);
    await target.screenshot({ path: join(output, `${name}.webp`), type: 'webp', quality: 86 });
    console.log(`Screenshot: ${name}`);
  };
  try {
    await page.goto(baseURL);
    await page.getByRole('heading', { name: 'Games & practice', exact: true }).waitFor();
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode().catch(() => {}))));
    await action({ page, button, hold, shot });
    await hold(500);
    state = await context.storageState({ indexedDB: true });
  } catch (error) {
    await page.screenshot({ path: join(scratch, `${name}-error.png`) }).catch(() => {});
    console.error(`Capture failed in ${name}:`, await page.locator('h1,h2').allTextContents());
    throw error;
  } finally {
    await context.close();
  }
  const raw = await page.video().path();
  encode(['-i', raw, '-an', '-c:v', 'libx264', '-preset', 'fast', '-threads', '2', '-crf', '26',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(output, `${name}.mp4`)]);
  console.log(`Video: ${name}`);
}

try {
  await record('signal-siege-demo', async ({ page, button, hold, shot }) => {
    await hold();
    await shot('home');
    await button('Play now').click();
    await page.getByRole('radio', { name: /^60-second arcade/ }).check();
    await page.getByRole('radio', { name: /^Training/ }).check();
    await hold();
    await shot('signal-siege-setup');
    await button('Launch defense').click();
    await expect(page.locator('.siege-page')).toHaveAttribute('data-status', 'running', { timeout: 10000 });
    await hold(1200);
    await shot('signal-siege', page.locator('.siege-console'));
    for (let i = 0; i < 7; i++) {
      const enemy = page.locator('.siege-enemy').first();
      await enemy.waitFor({ state: 'visible', timeout: 10000 });
      const word = await enemy.getAttribute('data-word');
      await page.keyboard.type(word, { delay: 140 });
      await hold(700);
    }
    await page.keyboard.press('Space');
    await hold(1600);
    await page.keyboard.press('Escape');
    await hold();
    await button('End run & save report').click();
    await hold();
    await shot('arcade-report', page.locator('.siege-console'));
  });

  await record('expeditions-demo', async ({ page, button, hold, shot }) => {
    await button('Begin expedition').click();
    await hold(1800);
    await button('Begin mission').click();
    // A real corrected mistake makes the progress heatmap useful in the gallery.
    await page.keyboard.type('x', { delay: 130 });
    await hold(600);
    await page.keyboard.press('Backspace');
    const opening = missions[0].text.slice(0, 37);
    await page.keyboard.type(opening, { delay: 115 });
    await shot('storm-coast');
    await page.keyboard.press('Escape');
    await hold();
    await button('Resume mission').click();
    await page.keyboard.type(missions[0].text.slice(opening.length), { delay: 75 });
    await page.getByRole('heading', { name: 'Session complete', exact: true }).waitFor();
    await hold();
    await shot('session-report');
    const download = page.waitForEvent('download');
    await button('Download card').click();
    await (await download).saveAs(join(output, 'field-report.png'));
    await button('Games').click();
    await page.getByRole('button', { name: /Expedition 02:/ }).click();
    await button('Begin expedition').click();
    await button('Begin mission').click();
    await page.keyboard.type(missions.find(mission => mission.expedition === 'ascent').text.slice(0, 36), { delay: 115 });
    await shot('white-ascent');
    await hold(1800);
  });

  await record('practice-demo', async ({ page, button, hold, shot }) => {
    await button('Practice').click();
    await hold();
    await shot('practice');
    await button('Custom Text').click();
    await page.getByLabel('Give it a title').fill('A message from the relay');
    const passage = 'Keep the signal bright. Every word brings us home.';
    await page.getByLabel('Your paragraph or sentences').fill(passage);
    await hold();
    await shot('custom-text');
    await button('Start typing').click();
    await page.keyboard.type(passage, { delay: 120 });
    await page.getByRole('heading', { name: 'Session complete', exact: true }).waitFor();
    await hold();
    await button('Practice').click();
    await button('Enter the signal room').click();
    await button('Begin mission').click();
    await page.keyboard.type('const signal = await relay.connect();', { delay: 100 });
    await page.keyboard.press('Enter');
    await page.keyboard.type('if (signal.ready) {', { delay: 100 });
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await shot('code-practice');
    await button('Practice').click();
    await button('Train with Tick').click();
    await button('Begin mission').click();
    const coach = await page.locator('.typing-passage').textContent();
    await page.keyboard.type(coach.trim().split(' ').slice(0, 4).join(' ') + ' ', { delay: 100 });
    await shot('weakness-hunt');
    await button('Daily Challenge').click();
    await hold();
    await shot('daily-challenge');
    await button("Play today's expedition").click();
    await button('Begin mission').click();
    const daily = await page.locator('.typing-passage').textContent();
    await page.keyboard.type(daily.trim().split(' ').slice(0, 5).join(' ') + ' ', { delay: 100 });
    await hold(1800);
  });

  await record('personalization-demo', async ({ page, button, hold, shot }) => {
    await button('Progress').click();
    await hold();
    await shot('progress');
    await button('Settings').click();
    await page.getByRole('radio', { name: /^Light/ }).check();
    await page.getByRole('radio', { name: 'Ocean', exact: true }).check();
    await hold();
    await shot('settings');
    await button('Games').click();
    await hold();
    await shot('light-theme');
    await button('Settings').click();
    await page.getByRole('radio', { name: /^Dark/ }).check();
    await page.getByRole('radio', { name: 'Amber', exact: true }).check();
    await page.getByRole('switch', { name: 'Terminal sound', exact: true }).click();
    await page.locator('.sound-studio').scrollIntoViewIfNeeded();
    await hold();
    await shot('sound-packs', page.locator('.sound-studio'));
    await page.getByRole('button', { name: 'Preview Deep Thock', exact: true }).click();
    await hold(2200);
    await button('Signal Siege').click();
    await page.locator('.siege-customization summary').click();
    await page.getByRole('radio', { name: /^Dart/ }).check();
    await page.getByRole('radio', { name: /^Aurora/ }).check();
    await page.getByRole('radio', { name: /^Tracer/ }).check();
    await button('Test fire').click();
    await hold(1600);
    await shot('ship-customization', page.locator('.siege-customization'));
    await button('Progress').click();
    const exported = page.waitForEvent('download');
    await button('Export progress').click();
    await exported;
    await hold();
  });

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, storageState: state,
  });
  const page = await mobile.newPage();
  await page.goto(baseURL);
  await page.getByRole('heading', { name: 'Games & practice', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(output, 'mobile.webp'), type: 'webp', quality: 86 });
  await mobile.close();

  // Small inline animation; the full clip remains available as H.264 MP4.
  encode(['-ss', '18', '-t', '8', '-i', join(output, 'signal-siege-demo.mp4'),
    '-vf', 'fps=8,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer',
    '-loop', '0', join(output, 'signal-siege-preview.gif')]);
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  console.log('Captured all README media without browser runtime errors.');
} finally {
  await browser.close();
  await rm(scratch, { recursive: true, force: true });
}

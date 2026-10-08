// Real compiled Angular + Phaser + API. Never accesses an existing browser profile.
// Scope: entry, scene rendering/recovery and durable pending-save recovery; not
// an end-to-end playthrough of every question or a physical-phone test.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const { chromium } = require(process.env.EXPLORALAB_PLAYWRIGHT_MODULE || path.join(root, 'infra/.local/browser/node_modules/playwright'));
const env = Object.fromEntries(fs.readFileSync(path.join(root, 'infra/.local/release.env'), 'utf8').split(/\r?\n/).filter(line => line.includes('=')).map(line => {
  const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
}));
assert.equal(new URL(env.PUBLIC_ORIGIN).hostname, 'localhost');
assert.equal(env.BIND_ADDRESS, '127.0.0.1');

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.EXPLORALAB_BROWSER_EXECUTABLE || undefined });
  const report = [];
  try {
    for (const [name, viewport, hasTouch] of [
      ['desktop', { width: 1366, height: 900 }, false],
      ['portrait', { width: 390, height: 844 }, true],
    ]) {
      // Self-signed rehearsal only; http_smoke separately verifies TLS with its CA.
      const context = await browser.newContext({ viewport, hasTouch, ignoreHTTPSErrors: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(env.PUBLIC_ORIGIN + '/register');
      const password = 'FictitiousTest123!' + crypto.randomBytes(8).toString('hex');
      await page.locator('#register-name').fill('Cuenta de ensayo');
      await page.locator('#register-email').fill(`browser-${crypto.randomBytes(8).toString('hex')}@example.invalid`);
      await page.locator('#register-password').fill(password);
      await page.locator('#register-confirm-password').fill(password);
      await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
      await page.waitForURL('**/world');
      await page.getByRole('button', { name: 'Comenzar recorrido' }).click();
      await page.locator('.world-loading').waitFor({ state: 'hidden', timeout: 45000 });
      assert.equal(await page.locator('#phaser-container canvas').count(), 1);
      const userId = await page.evaluate(async () => (await (await fetch('/api/v1/me')).json()).user.id);

      // Use the actual supported interrupted-map recovery, not Angular internals.
      await page.addInitScript(() => sessionStorage.setItem('exploralab.world-session.v1', JSON.stringify({
        version: 1, sceneKey: 'OpenPitScene', playerX: 600, playerY: 600, savedAt: Date.now(),
      })));
      await page.route('**/assets/game/audio/**', route => route.abort());
      await page.reload();
      await page.locator('.world-loading').waitFor({ state: 'hidden', timeout: 45000 });
      await page.waitForFunction(() => performance.getEntriesByName('exploralab:scene-load:OpenPitScene').length > 0);
      const duration = await page.evaluate(() => performance.getEntriesByName('exploralab:scene-load:OpenPitScene').at(-1).duration);
      const pendingKey = 'exploralab.pending-progress.v1.' + encodeURIComponent(userId);
      await page.evaluate(({ pendingKey, userId }) => localStorage.setItem(pendingKey,
        JSON.stringify({ version: 1, userId, lessonIds: ['lesson-01'] })), { pendingKey, userId });
      await page.route('**/api/v1/me/progress/lesson-01', route => route.abort());
      await page.reload();
      await page.locator('.progress-sync-toast--error').waitFor({ state: 'visible', timeout: 30000 });
      assert.ok(await page.evaluate(key => localStorage.getItem(key), pendingKey));
      await page.unroute('**/api/v1/me/progress/lesson-01');
      await page.reload();
      await page.waitForFunction(async () => {
        const response = await fetch('/api/v1/me/progress');
        return response.ok && (await response.json()).lessons.filter(item => item.lessonId === 'lesson-01').length === 1;
      }, null, { timeout: 30000 });
      await page.waitForFunction(key => localStorage.getItem(key) === null, pendingKey);
      await page.locator('.world-loading').waitFor({ state: 'hidden', timeout: 45000 });
      if (hasTouch) {
        await page.setViewportSize({ width: 844, height: 390 });
        await page.waitForFunction(() => document.querySelector('#phaser-container canvas')?.width > 0);
      }
      assert.equal(await page.locator('#phaser-container canvas').count(), 1);
      assert.deepEqual(errors, []);
      report.push({ device: name, openPitMilliseconds: Math.round(duration), optionalAudioFailurePlayable: true,
        pendingSaveRecoveredAgainstRealAPI: true, canvasInstances: 1 });
      await context.close();
    }
    fs.writeFileSync(path.join(root, 'infra/.local/browser-smoke.json'), JSON.stringify({
      version: env.APP_VERSION, scope: 'Real scene/API smoke; not complete lesson gameplay or phone validation', results: report,
    }, null, 2));
    console.log('Desktop and touch/rotation smoke passed, including interrupted-save recovery with real PostgreSQL.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

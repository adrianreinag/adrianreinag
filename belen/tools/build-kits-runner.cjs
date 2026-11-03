const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage();
  p.on('console', (m) => { if (m.text().startsWith('[T]') || m.type() === 'error') console.log(m.text().slice(0, 400)); });
  p.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await p.goto('process.env.KIT_URL || 'http://localhost:8765/build-kits.html'');
  await p.waitForFunction('window.DONE===true', null, { timeout: 600000 });
  const out = await p.evaluate('window.OUT');
  for (const [k, v] of Object.entries(out)) { fs.writeFileSync(__dirname + '/kits/kit_' + k + '.glb', Buffer.from(v, 'base64')); console.log('wrote', k, Buffer.from(v, 'base64').length); }
  await b.close();
})();

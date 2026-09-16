// Host smoke test: open a URL in headless Chromium over the DevTools protocol,
// stream its console for a few real seconds, and fail if the rig never moved
// or anything threw. Usage: node scripts/smoke.mjs <url> [seconds]
// Headless Chromium's virtual-time budget does not drive requestAnimationFrame
// under SwiftShader, so this runs in real time instead.
import { spawn } from 'node:child_process';

const [url, secs = '9'] = process.argv.slice(2);
if (!url) {
  console.error('usage: node scripts/smoke.mjs <url> [seconds]');
  process.exit(2);
}
const port = 9333;
const chrome = spawn(
  process.env.CHROME ?? 'chromium',
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    `--remote-debugging-port=${port}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets = [];
for (let i = 0; i < 50 && targets.length === 0; i++) {
  await sleep(200);
  try {
    const list = await (await fetch(`http://localhost:${port}/json/list`)).json();
    targets = list.filter((t) => t.type === 'page');
  } catch {
    /* not up yet */
  }
}
if (targets.length === 0) {
  console.error('smoke: could not reach headless Chromium');
  chrome.kill();
  process.exit(1);
}

const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
let id = 0;
const send = (method, params = {}) => ws.send(JSON.stringify({ id: ++id, method, params }));
const positions = [];
const propSamples = [];
let failures = 0;
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.consoleAPICalled') {
    const text = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
    console.log(m.params.type.toUpperCase(), text);
    const at = /rig at \(([-\d.]+), ([-\d.]+), ([-\d.]+)\)/.exec(text);
    if (at) positions.push(at.slice(1, 4).map(Number));
    const rest = /props at rest: (\d+)\/(\d+)/.exec(text);
    if (rest) propSamples.push([Number(rest[1]), Number(rest[2])]);
    if (/NaN/.test(text)) failures++;
    if (m.params.type === 'error') failures++;
  } else if (m.method === 'Runtime.exceptionThrown') {
    console.log(
      'EXCEPTION',
      m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text,
    );
    failures++;
  }
};
await new Promise((r) => (ws.onopen = r));
send('Runtime.enable');
send('Page.enable');
send('Page.navigate', { url });
await sleep(Number(secs) * 1000);
ws.close();
chrome.kill();

const first = positions[0];
const last = positions[positions.length - 1];
const moved = first && last ? Math.hypot(last[0] - first[0], last[2] - first[2]) : 0;
console.log(
  `smoke: ${positions.length} position samples, moved ${moved.toFixed(2)} m, ${failures} failure(s)`,
);
if (failures > 0 || positions.length < 3 || moved < 1) process.exit(1);

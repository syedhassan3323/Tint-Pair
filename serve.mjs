import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const host = '127.0.0.1';
const port = 4173;
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.mjs', ['app.mjs', 'text/javascript; charset=utf-8']],
  ['/theme.mjs', ['theme.mjs', 'text/javascript; charset=utf-8']],
]);

const server = createServer(async (request, response) => {
  const head = request.method === 'HEAD';
  function reply(status, body, headers = {}) {
    response.writeHead(status, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      ...headers,
    });
    response.end(head ? undefined : body);
  }
  if (request.method !== 'GET' && !head) {
    reply(405, 'Method not allowed. Use GET or HEAD.\n', { Allow: 'GET, HEAD' });
    return;
  }
  let path;
  try { path = new URL(request.url, `http://${host}:${port}`).pathname; }
  catch { reply(400, 'Bad request.\n'); return; }
  const asset = assets.get(path);
  if (!asset) { reply(404, 'Not found.\n'); return; }
  try {
    const body = await readFile(new URL(asset[0], import.meta.url));
    reply(200, body, { 'Content-Type': asset[1] });
  } catch (error) {
    console.error(`TintPair could not read ${asset[0]}: ${error.message}`);
    reply(500, 'Unable to load the application asset.\n');
  }
});

server.on('error', error => {
  console.error(`TintPair could not start at http://${host}:${port}: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  console.log(`TintPair is ready at http://${host}:${port}`);
  console.log('No build or installation needed. Press Ctrl+C to stop.');
});

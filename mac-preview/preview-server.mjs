#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';

const ignoredDirs = new Set(['node_modules', '.git', '.expo', 'dist', 'build']);
const liveClients = new Set();
const watcherHandles = new Map();
let reloadTimer = null;

function getLocalAddress() {
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return entry.address;
      }
    }
  }
  return '127.0.0.1';
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.ico': 'image/x-icon',
      '.txt': 'text/plain; charset=utf-8',
      '.md': 'text/markdown; charset=utf-8',
    }[ext] || 'application/octet-stream'
  );
}

function safePath(requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const joined = path.normalize(path.join(rootDir, decoded));
  if (!joined.startsWith(rootDir)) return null;
  return joined;
}

function broadcastReload() {
  for (const res of liveClients) {
    try {
      res.write(`event: reload\ndata: ${Date.now()}\n\n`);
    } catch {
      liveClients.delete(res);
    }
  }
}

function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(broadcastReload, 100);
}

function addWatch(dir) {
  if (watcherHandles.has(dir)) return;
  try {
    const watcher = fs.watch(dir, { persistent: true }, (eventType, filename) => {
      if (filename) {
        const base = filename.toString().split(path.sep)[0];
        if (ignoredDirs.has(base)) return;
      }
      scheduleReload();
      const target = filename ? path.join(dir, filename.toString()) : dir;
      try {
        const stat = fs.statSync(target);
        if (stat.isDirectory() && !ignoredDirs.has(path.basename(target))) {
          watchTree(target);
        }
      } catch {
        // file removed or unreadable; reload is enough
      }
    });
    watcherHandles.set(dir, watcher);
  } catch {
    // Ignore directories we cannot watch.
  }
}

function watchTree(dir) {
  if (ignoredDirs.has(path.basename(dir))) return;
  addWatch(dir);
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && !ignoredDirs.has(entry.name)) {
      watchTree(path.join(dir, entry.name));
    }
  }
}

function injectLiveReload(html) {
  const snippet = `
<script>
(() => {
  const source = new EventSource('/__live');
  source.addEventListener('reload', () => location.reload());
})();
</script>`;
  if (html.includes('</body>')) return html.replace('</body>', `${snippet}\n</body>`);
  return html + snippet;
}

function sendFile(res, filePath) {
  const type = contentType(filePath);
  const isHtml = type.startsWith('text/html');
  if (isHtml) {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Failed to read file.');
        return;
      }
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      res.end(injectLiveReload(data));
    });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Failed to read file.');
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(data);
  });
}

function directoryListing(res, dirPath, urlPath) {
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const items = entries
    .filter((entry) => !ignoredDirs.has(entry.name))
    .map((entry) => {
      const href = path.posix.join(urlPath, entry.name) + (entry.isDirectory() ? '/' : '');
      return `<li><a href="${href}">${entry.name}${entry.isDirectory() ? '/' : ''}</a></li>`;
    })
    .join('');

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CleanCheck Preview</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 24px; background: #f6f7fb; color: #0f172a; }
      .card { max-width: 760px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 20px; }
      a { color: #0f172a; text-decoration: none; }
      li { margin: 10px 0; }
      .meta { color: #475569; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>CleanCheck Preview</h1>
      <p class="meta">Open <strong>${urlPath}</strong> and load your app from this Mac.</p>
      <ul>${items || '<li>No files</li>'}</ul>
    </div>
  </body>
</html>`);
}

const server = http.createServer((req, res) => {
  const urlPath = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname;

  if (urlPath === '/__live') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('\n');
    liveClients.add(res);
    req.on('close', () => liveClients.delete(res));
    return;
  }

  const filePath = safePath(urlPath === '/' ? '/index.html' : urlPath);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const indexFile = path.join(filePath, 'index.html');
      if (fs.existsSync(indexFile)) {
        sendFile(res, indexFile);
      } else {
        directoryListing(res, filePath, urlPath);
      }
      return;
    }
    sendFile(res, filePath);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

watchTree(rootDir);

server.listen(port, host, () => {
  const address = getLocalAddress();
  console.log(`CleanCheck Preview running`);
  console.log(`Open on Mac:   http://localhost:${port}`);
  console.log(`Open on iPhone: http://${address}:${port}`);
  console.log(`Serving:       ${rootDir}`);
});

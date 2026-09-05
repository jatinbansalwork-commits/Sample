import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const port = Number(process.env.PORT) || 8080;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.eml': 'message/rfc822',
  '.msg': 'application/vnd.ms-outlook',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
};

function responseHeaders(ext) {
  const type = types[ext] || 'application/octet-stream';
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-store' };
  // Keep PDFs inline in iframe/object previews — octet-stream triggers a download.
  if (ext === '.pdf') {
    headers['Content-Disposition'] = 'inline';
  }
  return headers;
}

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(root, urlPath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      const isSpaRoute = !path.extname(urlPath);
      if (isSpaRoute) {
        fs.readFile(path.join(root, 'index.html'), (indexErr, indexData) => {
          if (indexErr) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': types['.html'], 'Cache-Control': 'no-store' });
          res.end(indexData);
        });
        return;
      }
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, responseHeaders(ext));
    res.end(data);
  });
}).listen(port, () => {
  console.log(`Serving ${root} on http://localhost:${port}`);
});

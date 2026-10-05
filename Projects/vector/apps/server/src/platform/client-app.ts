import { existsSync, statSync } from 'node:fs';
import { join, normalize, resolve } from 'node:path';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

// In production one server answers everything: /api, and the built client (so the
// sign-in cookie, the API and the pages share one origin). In development Vite
// serves the client instead.

/** Hashed build files never change, so browsers keep them a year. */
const IMMUTABLE = 'public, max-age=31536000, immutable';
/** Everything else (HTML, the favicon): check for a new version each time. */
const REVALIDATE = 'no-cache';

/**
 * What the browser may load. Scripts and styles come from Vector; map tiles for the
 * optional real-world layer from OpenFreeMap; MapLibre runs its workers from blobs.
 */
const CONTENT_SECURITY_POLICY = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  // React sets inline style attributes (positions, colors from settings).
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:', 'https://tiles.openfreemap.org'],
  fontSrc: ["'self'", 'data:'],
  connectSrc: ["'self'", 'https://tiles.openfreemap.org'],
  workerSrc: ["'self'", 'blob:'],
  childSrc: ["'self'", 'blob:'],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: [],
};

/** The prerendered page for a path (e.g. /airspaces/chicago/index.html), if there is one. */
function prerendered(dir: string, path: string): string | undefined {
  const clean = normalize(decodeURIComponent(path)).replace(/^(\.\.(\/|\\|$))+/, '');
  const file = join(dir, clean, 'index.html');
  // Stay inside the build directory.
  if (!resolve(file).startsWith(resolve(dir))) return undefined;
  return existsSync(file) && statSync(file).isFile() ? file.slice(dir.length) : undefined;
}

/** Serves the built client from `dir`, with security headers on every response. */
export async function serveClient(app: FastifyInstance, options: { dir: string; hsts: boolean }) {
  const dir = resolve(options.dir);
  if (!existsSync(join(dir, 'index.html')))
    throw new Error(`No built client in ${dir}: run npm run build first`);

  await app.register(helmet, {
    contentSecurityPolicy: { directives: CONTENT_SECURITY_POLICY },
    // Map tiles come from another origin.
    crossOriginEmbedderPolicy: false,
    hsts: options.hsts ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  });

  await app.register(fastifyStatic, {
    root: dir,
    wildcard: false,
    index: false,
    setHeaders(response, path) {
      response.header('cache-control', path.includes('/assets/') ? IMMUTABLE : REVALIDATE);
    },
  });

  // Pages: a public page's own HTML (title and link previews), else the app's shell.
  app.setNotFoundHandler((request, reply) => {
    const path = request.url.split('?')[0] ?? '/';
    if (path.startsWith('/api/') || path === '/api') {
      return reply.code(404).send({ error: { code: 'not_found', message: 'No such route' } });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return reply.code(404).send({ error: { code: 'not_found', message: 'No such route' } });
    // A missing file (an old build's asset, say) is a real 404, not the app.
    if (/\.[a-z0-9]+$/i.test(path) && !path.endsWith('.html'))
      return reply.code(404).type('text/plain').send('Not found');
    const page = path === '/' ? undefined : prerendered(dir, path);
    reply.header('cache-control', REVALIDATE);
    return reply.sendFile(page ?? 'index.html');
  });
}

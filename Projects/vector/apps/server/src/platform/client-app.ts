import { existsSync, readFileSync, statSync } from 'node:fs';
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

/** A page's own link-preview tags, for pages whose preview depends on data (a shared result). */
export interface PageMeta {
  title: string;
  description: string;
  /** An absolute URL. */
  image: string;
  imageAlt: string;
}

export interface ClientOptions {
  dir: string;
  hsts: boolean;
  /** The site's address (CLIENT_ORIGIN): link previews need absolute URLs. */
  origin?: string;
  /** The preview for a path that has its own (undefined: the page's usual one). */
  pageMeta?: (path: string) => Promise<PageMeta | undefined>;
}

const attribute = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * A page's HTML with its link-preview tags finished: the image as an absolute URL
 * (Facebook, LinkedIn, iMessage and Slack need one), the page's own address, and,
 * for pages with their own preview, its title, description and image.
 */
export function withPageMeta(
  html: string,
  { origin, path, meta }: { origin: string | undefined; path: string; meta: PageMeta | undefined },
): string {
  let page = html;
  if (meta) {
    page = page
      .replace(/(<title>)[^<]*/, `$1${attribute(meta.title)}`)
      .replace(/(<meta\s+name="description"\s+content=")[^"]*/, `$1${attribute(meta.description)}`)
      .replace(/(<meta\s+property="og:title"\s+content=")[^"]*/, `$1${attribute(meta.title)}`)
      .replace(
        /(<meta\s+property="og:description"\s+content=")[^"]*/,
        `$1${attribute(meta.description)}`,
      )
      .replace(/(<meta\s+property="og:image"\s+content=")[^"]*/, `$1${attribute(meta.image)}`);
  }
  if (!origin) return page;
  const image = /<meta\s+property="og:image"\s+content="([^"]*)"/.exec(page)?.[1];
  const absolute = image?.startsWith('/') ? `${origin}${image}` : image;
  if (image && absolute) page = page.replace(`content="${image}"`, `content="${absolute}"`);
  const has = (property: string) => new RegExp(`<meta\\s+property="${property}"`).test(page);
  if (meta && has('og:image:alt'))
    page = page.replace(
      /(<meta\s+property="og:image:alt"\s+content=")[^"]*/,
      `$1${attribute(meta.imageAlt)}`,
    );
  const extra = [
    `<meta property="og:url" content="${attribute(`${origin}${path}`)}" />`,
    ...(absolute ? [`<meta name="twitter:image" content="${absolute}" />`] : []),
    ...(meta && !has('og:image:width')
      ? [
          '<meta property="og:image:width" content="1200" />',
          '<meta property="og:image:height" content="630" />',
        ]
      : []),
    ...(meta && !has('og:image:alt')
      ? [`<meta property="og:image:alt" content="${attribute(meta.imageAlt)}" />`]
      : []),
  ];
  return page.replace('</head>', `    ${extra.join('\n    ')}\n  </head>`);
}

/** The prerendered page for a path (e.g. /airspaces/chicago/index.html), if there is one. */
function prerendered(dir: string, path: string): string | undefined {
  const clean = normalize(decodeURIComponent(path)).replace(/^(\.\.(\/|\\|$))+/, '');
  const file = join(dir, clean, 'index.html');
  // Stay inside the build directory.
  if (!resolve(file).startsWith(resolve(dir))) return undefined;
  return existsSync(file) && statSync(file).isFile() ? file.slice(dir.length) : undefined;
}

/** Serves the built client from `dir`, with security headers on every response. */
export async function serveClient(app: FastifyInstance, options: ClientOptions) {
  const dir = resolve(options.dir);
  // Pages don't change while the server runs.
  const pages = new Map<string, string>();
  const read = (file: string) => {
    let html = pages.get(file);
    if (html === undefined) {
      html = readFileSync(join(dir, file), 'utf8');
      pages.set(file, html);
    }
    return html;
  };
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
  app.setNotFoundHandler(async (request, reply) => {
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
    const meta = await options.pageMeta?.(path).catch(() => undefined);
    reply.header('cache-control', REVALIDATE);
    return reply
      .type('text/html; charset=utf-8')
      .send(withPageMeta(read(page ?? 'index.html'), { origin: options.origin, path, meta }));
  });
}

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { withPageMeta } from './client-app';

// A tiny stand-in for the built client.
const dir = mkdtempSync(join(tmpdir(), 'vector-client-'));
const app = buildApp({ checkDatabase: async () => true, client: { dir, hsts: true } });

describe('serving the built client', () => {
  beforeAll(async () => {
    writeFileSync(join(dir, 'index.html'), '<title>Vector</title>');
    mkdirSync(join(dir, 'about'));
    writeFileSync(join(dir, 'about', 'index.html'), '<title>About · Vector</title>');
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'assets', 'index-abc123.js'), 'console.log(1)');
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('keeps hashed assets a year, and pages only until they change', async () => {
    const asset = await app.inject({ method: 'GET', url: '/assets/index-abc123.js' });
    expect(asset.statusCode).toBe(200);
    expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    const page = await app.inject({ method: 'GET', url: '/' });
    expect(page.body).toBe('<title>Vector</title>');
    expect(page.headers['cache-control']).toBe('no-cache');
  });

  it('gives a public page its own HTML, and every other address the app', async () => {
    expect((await app.inject({ method: 'GET', url: '/about' })).body).toContain('About · Vector');
    expect((await app.inject({ method: 'GET', url: '/about?ref=x' })).body).toContain(
      'About · Vector',
    );
    expect((await app.inject({ method: 'GET', url: '/play' })).body).toBe('<title>Vector</title>');
    expect((await app.inject({ method: 'GET', url: '/../../etc/passwd' })).body).toBe(
      '<title>Vector</title>',
    );
  });

  it('answers missing files and unknown API routes with 404s, not the app', async () => {
    expect((await app.inject({ method: 'GET', url: '/assets/gone.js' })).statusCode).toBe(404);
    const api = await app.inject({ method: 'GET', url: '/api/nothing' });
    expect(api.statusCode).toBe(404);
    expect(api.json().error.code).toBe('not_found');
    expect((await app.inject({ method: 'POST', url: '/somewhere' })).statusCode).toBe(404);
  });

  it('sends security headers', async () => {
    const response = await app.inject({ method: 'GET', url: '/' });
    expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('link-preview tags', () => {
  const html = `<head><title>Vector</title>
    <meta name="description" content="An ATC simulator." />
    <meta property="og:title" content="Vector" />
    <meta property="og:description" content="An ATC simulator." />
    <meta property="og:image" content="/og-image.jpg" />
    <meta property="og:image:alt" content="A radar scope" />
  </head>`;

  it('makes the image an absolute address and adds the page’s own', () => {
    const page = withPageMeta(html, {
      origin: 'https://vector.test',
      path: '/records',
      meta: undefined,
    });
    expect(page).toContain(
      '<meta property="og:image" content="https://vector.test/og-image.jpg" />',
    );
    expect(page).toContain('<meta property="og:url" content="https://vector.test/records" />');
    expect(page).toContain(
      '<meta name="twitter:image" content="https://vector.test/og-image.jpg" />',
    );
    expect(page).toContain('<title>Vector</title>');
  });

  it('gives a page its own title, description and image, escaped', () => {
    const page = withPageMeta(html, {
      origin: 'https://vector.test',
      path: '/results/1',
      meta: {
        title: 'Ace <3 worked N90 · "+1" RP',
        description: 'Fine & dandy',
        image: 'https://vector.test/api/share/results/1/card.png',
        imageAlt: 'Ace’s session',
      },
    });
    expect(page).toContain('<title>Ace &lt;3 worked N90 · &quot;+1&quot; RP</title>');
    expect(page).toContain('content="Fine &amp; dandy"');
    expect(page).toContain('og:image" content="https://vector.test/api/share/results/1/card.png"');
    expect(page).toContain('og:image:alt" content="Ace’s session"');
    expect(page.match(/og:image:alt/g)).toHaveLength(1);
    expect(page).toContain('<meta property="og:image:width" content="1200" />');
  });

  it('leaves the HTML alone without a site address (development)', () => {
    expect(withPageMeta(html, { origin: undefined, path: '/', meta: undefined })).toBe(html);
  });
});

describe('search engines', () => {
  const site = mkdtempSync(join(tmpdir(), 'vector-seo-'));
  const page = (title: string) =>
    `<head><title>${title}</title><script type="application/ld+json" data-page="/">{"@type":"FAQPage"}</script></head>`;
  const production = buildApp({
    checkDatabase: async () => true,
    client: { dir: site, hsts: true, origin: 'https://vector.test', indexing: true },
  });
  const staging = buildApp({
    checkDatabase: async () => true,
    client: { dir: site, hsts: true, origin: 'https://staging.vector.test', indexing: false },
  });

  beforeAll(async () => {
    writeFileSync(join(site, 'index.html'), page('Vector'));
    mkdirSync(join(site, 'airspaces', 'chicago'), { recursive: true });
    writeFileSync(join(site, 'airspaces', 'index.html'), page('Airspaces'));
    writeFileSync(join(site, 'airspaces', 'chicago', 'index.html'), page('Chicago'));
    mkdirSync(join(site, 'assets'));
    await Promise.all([production.ready(), staging.ready()]);
  });

  afterAll(async () => {
    await Promise.all([production.close(), staging.close()]);
    rmSync(site, { recursive: true, force: true });
  });

  it('lets production be indexed, with a sitemap of the public pages', async () => {
    const robots = (await production.inject({ method: 'GET', url: '/robots.txt' })).body;
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Allow: /api/share/');
    expect(robots).toContain('Sitemap: https://vector.test/sitemap.xml');
    const sitemap = (await production.inject({ method: 'GET', url: '/sitemap.xml' })).body;
    expect(sitemap.match(/<loc>[^<]+<\/loc>/g)).toEqual([
      '<loc>https://vector.test</loc>',
      '<loc>https://vector.test/airspaces</loc>',
      '<loc>https://vector.test/airspaces/chicago</loc>',
    ]);
  });

  it('keeps staging out of search results', async () => {
    expect((await staging.inject({ method: 'GET', url: '/robots.txt' })).body).toBe(
      'User-agent: *\nDisallow: /\n',
    );
    expect((await staging.inject({ method: 'GET', url: '/sitemap.xml' })).statusCode).toBe(404);
    const home = await staging.inject({ method: 'GET', url: '/' });
    expect(home.headers['x-robots-tag']).toBe('noindex, nofollow');
  });

  it('gives each page its address, and its own structured data only', async () => {
    const home = (await production.inject({ method: 'GET', url: '/' })).body;
    expect(home).toContain('<link rel="canonical" href="https://vector.test/" />');
    expect(home).toContain('"FAQPage"');
    // The front page's questions aren't on other pages (the shell is the same HTML).
    const other = (await production.inject({ method: 'GET', url: '/community' })).body;
    expect(other).not.toContain('FAQPage');
    expect(other).toContain('<link rel="canonical" href="https://vector.test/community" />');
    expect(
      (await production.inject({ method: 'GET', url: '/airspaces/chicago' })).headers[
        'x-robots-tag'
      ],
    ).toBeUndefined();
  });
});

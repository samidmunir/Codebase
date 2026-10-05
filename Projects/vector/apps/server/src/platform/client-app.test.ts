import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';

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

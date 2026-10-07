import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import publicPages from './src/site/public-pages.json' with { type: 'json' };

/** This build's id: the app compares it with the server's /version.json to notice deploys. */
const BUILD_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Writes a copy of index.html for each public page with that page's title,
 * description and link-preview tags in it, so search engines and link previews
 * (which don't run the app) see them. The app takes over once it loads.
 */
function publicPageMeta(): Plugin {
  let outDir = 'dist';
  return {
    name: 'vector-public-page-meta',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      writeFileSync(join(outDir, 'version.json'), `${JSON.stringify({ build: BUILD_ID })}\n`);
      const html = readFileSync(join(outDir, 'index.html'), 'utf8');
      const tags = [
        /(<title>)[^<]*/,
        /(<meta\s+name="description"\s+content=")[^"]*/,
        /(<meta\s+property="og:title"\s+content=")[^"]*/,
        /(<meta\s+property="og:description"\s+content=")[^"]*/,
      ];
      for (const tag of tags)
        if (!tag.test(html)) throw new Error(`index.html is missing the tag ${String(tag)}`);
      for (const [path, { title, description }] of Object.entries(publicPages)) {
        const [titleTag, descriptionTag, ogTitleTag, ogDescriptionTag] = tags as [
          RegExp,
          RegExp,
          RegExp,
          RegExp,
        ];
        const page = html
          .replace(titleTag, `$1${escape(title)}`)
          .replace(descriptionTag, `$1${escape(description)}`)
          .replace(ogTitleTag, `$1${escape(title)}`)
          .replace(ogDescriptionTag, `$1${escape(description)}`);
        const dir = join(outDir, path);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'index.html'), page);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // VECTOR_API_PROXY points the dev server at another API, e.g. the end-to-end test server.
  const env = loadEnv(mode, new URL('.', import.meta.url).pathname, 'VECTOR_');
  return {
    plugins: [react(), publicPageMeta()],
    define: { __BUILD_ID__: JSON.stringify(mode === 'production' ? BUILD_ID : 'dev') },
    server: {
      port: 5173,
      proxy: {
        '/api': env.VECTOR_API_PROXY ?? 'http://127.0.0.1:4000',
      },
    },
  };
});

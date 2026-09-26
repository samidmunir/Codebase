import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

export const CACHE_DIR = fileURLToPath(new URL('../../../data/.cache/', import.meta.url));

/** Downloads a URL into data/.cache once, and returns the cached bytes on later runs. */
export async function cachedDownload(url: string, cachePath: string): Promise<Uint8Array> {
  const path = join(CACHE_DIR, cachePath);
  if (existsSync(path)) return readFileSync(path);

  console.log(`  downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return bytes;
}

/** Returns the files in a zip archive whose names match `pattern`. */
export function unzipMatching(zip: Uint8Array, pattern: RegExp): Record<string, Uint8Array> {
  return unzipSync(zip, { filter: (file) => pattern.test(file.name) });
}

export function onlyFile(files: Record<string, Uint8Array>, pattern: RegExp): Uint8Array {
  const matches = Object.entries(files).filter(([name]) => pattern.test(name));
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one file matching ${pattern}, found ${matches.length}`);
  }
  return matches[0]![1];
}

export const text = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes);

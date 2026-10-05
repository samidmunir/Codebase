import { useEffect } from 'react';
import publicPages from './public-pages.json';

// Each page's title and description, for the browser tab and link previews. The
// public pages' are in public-pages.json, which the build also writes into each
// page's HTML (see vite.config.ts), so they're there before the app loads.

export const SITE_NAME = 'Vector';
export const DEFAULT_DESCRIPTION = publicPages['/'].description;

export type PublicPath = keyof typeof publicPages;

function setMeta(selector: string, attribute: 'name' | 'property', key: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = value;
}

function useMeta(fullTitle: string, description: string) {
  useEffect(() => {
    document.title = fullTitle;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
  }, [fullTitle, description]);
}

/** Sets the page's title ("Records · Vector") and description while it's shown. */
export function usePageMeta({ title, description }: { title?: string; description?: string }) {
  useMeta(
    title ? `${title} · ${SITE_NAME}` : publicPages['/'].title,
    description ?? DEFAULT_DESCRIPTION,
  );
}

/** A public page's title and description, from public-pages.json. */
export function usePublicPageMeta(path: PublicPath) {
  const page = publicPages[path];
  useMeta(page.title, page.description);
}

export function isPublicPath(path: string): path is PublicPath {
  return Object.hasOwn(publicPages, path);
}

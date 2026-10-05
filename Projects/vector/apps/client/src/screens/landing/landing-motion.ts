import { useEffect, useRef, type RefObject } from 'react';

// Motion for the front page: parallax from scrolling and the pointer, and
// sections that rise into view. All of it is off when the system asks for
// reduced motion.

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** How far the pointer's easing moves toward its target each frame (0–1). */
const POINTER_EASE = 0.06;

/**
 * Sets --scroll (px scrolled, while the element is near the top) and --px / --py
 * (the pointer, -1 to 1 across the element, eased) on an element, for CSS to move
 * its layers by. The page scrolls inside the site's main area, not the window.
 */
export function useParallax(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion()) return;
    const scroller: HTMLElement | Window = element.closest('.site__main') ?? window;
    const scrollTop = () =>
      scroller instanceof Window ? scroller.scrollY : (scroller as HTMLElement).scrollTop;

    let target = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    let frame = 0;
    const draw = () => {
      frame = 0;
      eased.x += (target.x - eased.x) * POINTER_EASE;
      eased.y += (target.y - eased.y) * POINTER_EASE;
      const scrolled = Math.min(scrollTop(), element.offsetHeight * 1.5);
      element.style.setProperty('--scroll', scrolled.toFixed(1));
      element.style.setProperty('--px', eased.x.toFixed(4));
      element.style.setProperty('--py', eased.y.toFixed(4));
      // Keep easing toward the pointer until it's settled.
      if (Math.abs(target.x - eased.x) > 0.001 || Math.abs(target.y - eased.y) > 0.001) request();
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const onPointer = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      if (event.clientY > box.bottom) return;
      target = {
        x: ((event.clientX - box.left) / box.width) * 2 - 1,
        y: ((event.clientY - box.top) / box.height) * 2 - 1,
      };
      request();
    };
    const onLeave = () => {
      target = { x: 0, y: 0 };
      request();
    };

    scroller.addEventListener('scroll', request, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    request();
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', request);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [ref]);
}

/**
 * Marks the container as moving (so its [data-reveal] children start hidden), then
 * reveals each one as it scrolls into view. Without motion, nothing is hidden.
 */
export function useReveal<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion() || !('IntersectionObserver' in window)) return;
    root.dataset.motion = 'on';
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealed = 'true';
            observer.unobserve(entry.target);
          }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    );
    for (const element of root.querySelectorAll('[data-reveal]')) observer.observe(element);
    return () => {
      observer.disconnect();
      delete root.dataset.motion;
    };
  }, []);
  return ref;
}

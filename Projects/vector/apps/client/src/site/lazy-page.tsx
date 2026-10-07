import { Component, lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { markOutdated } from './app-version';

/** If a screen's code can't be loaded (gone after a deploy, or offline), say so. */
class LoadFailure extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch() {
    // Usually a deploy replaced the file; the update notice offers the reload.
    markOutdated();
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="site-empty">
        <h1>This page didn’t load</h1>
        <p>Vector may have been updated since you opened it, or the connection dropped.</p>
        <p>
          <button
            type="button"
            className="site-button site-button--primary"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </p>
      </div>
    );
  }
}

/**
 * A screen whose code loads when it's first opened (so the front page doesn't wait
 * for the scope, the admin pages or the community).
 */
export function lazyPage<P extends object>(
  load: () => Promise<Record<string, unknown>>,
  name: string,
): ComponentType<P> {
  const Screen = lazy(async () => ({ default: (await load())[name] as ComponentType<P> }));
  return function LazyPage(props: P) {
    return (
      <LoadFailure>
        <Suspense fallback={<div className="lazy-page" aria-busy="true" />}>
          <Screen {...props} />
        </Suspense>
      </LoadFailure>
    );
  };
}

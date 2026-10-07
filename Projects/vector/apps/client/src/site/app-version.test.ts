import { describe, expect, it } from 'vitest';
import { BUILD_ID, missingFileMessage } from './app-version';

describe('noticing a new version', () => {
  it('runs as the development build outside a production build', () => {
    expect(BUILD_ID).toBe('dev');
  });

  it('treats a missing file as a sign of a deploy, and anything else as a connection problem', () => {
    expect(missingFileMessage(404, 'the airspace')).toBe(
      'Vector has been updated since this page was opened. Reload to load the airspace.',
    );
    expect(missingFileMessage(503, 'the airspace')).toBe(
      'Couldn’t load the airspace (503). Check your connection and try again.',
    );
  });
});

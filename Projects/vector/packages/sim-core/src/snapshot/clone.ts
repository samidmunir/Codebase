/**
 * Deep-copies plain JSON data. Sim state is JSON by design, so this is also
 * the exact transformation a snapshot goes through when saved to the server.
 */
export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

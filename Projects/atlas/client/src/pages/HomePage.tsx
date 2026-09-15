import { ApiStatus } from "../components/common/ApiStatus";

export function HomePage() {
  return (
    <main>
      <h1>Atlas</h1>
      <p>Your personal operating system.</p>

      <ApiStatus />
    </main>
  );
}

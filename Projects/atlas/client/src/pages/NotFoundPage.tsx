import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main>
      <h1>404</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/">Return home</Link>
    </main>
  );
}

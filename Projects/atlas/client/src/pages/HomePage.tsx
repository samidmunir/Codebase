import { useAuth } from "../features/auth";

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <p>Restoring Atlas session...</p>;
  }

  return (
    <main>
      <h1>Atlas</h1>

      <p>
        Authentication:{" "}
        {isAuthenticated ? "Authenticated" : "Not authenticated"}
      </p>

      {user && (
        <p>
          Welcome, {user.firstName} {user.lastName}
        </p>
      )}
    </main>
  );
}

import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <span>404</span>
      <h1>This page does not exist.</h1>
      <p>The page may have moved or the address may be incorrect.</p>

      <Link className="primary-button" to="/app/dashboard">
        <ArrowLeft size={18} />
        Return to dashboard
      </Link>
    </main>
  );
}

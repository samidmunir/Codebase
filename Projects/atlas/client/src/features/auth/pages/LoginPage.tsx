import { type FormEvent, useState } from "react";
// import { useNavigate } from "react-router-dom";

import { ApiError } from "../../../api/ApiError";
import { AuthLayout } from "../components/AuthLayout";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const location = useLocation();

  const registrationSuccess = location.state?.registrationSuccess === true;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login({
        email,
        password,
      });

      navigate("/");
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to your Atlas."
      footerText="New to Atlas?"
      footerLinkText="Create an account"
      footerLinkTo="/register"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {registrationSuccess && (
          <div className="auth-success" role="status">
            Account created successfully. You can now sign in.
          </div>
        )}
        {error && (
          <div className="auth-alert" role="alert">
            {error}
          </div>
        )}

        <div className="auth-field">
          <label htmlFor="email">Email</label>

          <input
            id="email"
            name="email"
            type="email"
            value={email}
            placeholder="you@example.com"
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <div className="auth-label-row">
            <label htmlFor="password">Password</label>

            <span className="auth-muted-link">Forgot password?</span>
          </div>

          <PasswordInput
            id="password"
            name="password"
            value={password}
            placeholder="Enter your password"
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in to Atlas"}
        </button>
      </form>
    </AuthLayout>
  );
}

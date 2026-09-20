import { type ChangeEvent, type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../../api/ApiError";
import { AuthLayout } from "../components/AuthLayout";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../hooks/useAuth";

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const initialForm: RegisterForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState<RegisterForm>(initialForm);

  const [error, setError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        ...form,

        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });

      navigate("/login", {
        state: {
          registrationSuccess: true,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError("Unable to create your account. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your Atlas"
      subtitle="Start building your personal command center."
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkTo="/login"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && (
          <div className="auth-alert" role="alert">
            {error}
          </div>
        )}

        <div className="auth-name-grid">
          <div className="auth-field">
            <label htmlFor="firstName">First name</label>

            <input
              id="firstName"
              name="firstName"
              value={form.firstName}
              autoComplete="given-name"
              placeholder="Sami"
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="lastName">Last name</label>

            <input
              id="lastName"
              name="lastName"
              value={form.lastName}
              autoComplete="family-name"
              placeholder="Munir"
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="email">Email</label>

          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            autoComplete="email"
            placeholder="you@example.com"
            onChange={handleChange}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="password">Password</label>

          <PasswordInput
            id="password"
            name="password"
            value={form.password}
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            onChange={handleChange}
          />

          <small>Use at least 8 characters.</small>
        </div>

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}

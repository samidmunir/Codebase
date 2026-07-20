import { ArrowRight, LoaderCircle, Mail } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";

import PasswordField from "../components/auth/PasswordField.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

const initialForm = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: "",
      form: "",
    }));
  }

  function validate() {
    const nextErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.password) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        email: form.email.trim(),
        password: form.password,
      });

      toast.success("Welcome back!");

      const destination = location.state?.from?.pathname ?? "/app/dashboard";

      navigate(destination, { replace: true });
    } catch (error) {
      const message = error?.message ?? "Unable to sign in. Please try again.";

      setErrors({
        form: message,
      });

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-form">
      <div className="auth-form__heading">
        <span>Welcome back</span>
        <h1>Sign in to your workspace</h1>
        <p>Continue managing your applications and career opportunities.</p>
      </div>

      {errors.form && (
        <div className="form-alert" role="alert">
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="email">Email address</label>

          <div
            className={`input-shell ${
              errors.email ? "input-shell--error" : ""
            }`}
          >
            <Mail size={18} />

            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
            />
          </div>

          {errors.email && <p className="form-error">{errors.email}</p>}
        </div>

        <PasswordField
          id="password"
          name="password"
          label="Password"
          value={form.password}
          onChange={updateField}
          autoComplete="current-password"
          placeholder="Enter your password"
          error={errors.password}
        />

        <div className="form-options">
          <label className="checkbox">
            <input type="checkbox" />
            <span>Remember this device</span>
          </label>

          <button
            type="button"
            className="text-button"
            disabled
            title="Password recovery will be added later"
          >
            Forgot password?
          </button>
        </div>

        <button
          className="primary-button"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="spin" size={19} />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight size={19} />
            </>
          )}
        </button>
      </form>

      <p className="auth-form__footer">
        New to ApplyFlow? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}

import { ArrowRight, Check, LoaderCircle, Mail, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

import PasswordField from "../components/auth/PasswordField.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const passwordRules = [
  {
    label: "At least 10 characters",
    validate: (value) => value.length >= 10,
  },
  {
    label: "One uppercase letter",
    validate: (value) => /[A-Z]/.test(value),
  },
  {
    label: "One lowercase letter",
    validate: (value) => /[a-z]/.test(value),
  },
  {
    label: "One number",
    validate: (value) => /\d/.test(value),
  },
  {
    label: "One special character",
    validate: (value) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value),
  },
];

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const evaluatedPasswordRules = useMemo(
    () =>
      passwordRules.map((rule) => ({
        ...rule,
        passed: rule.validate(form.password),
      })),
    [form.password],
  );

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

    if (form.firstName.trim().length < 2) {
      nextErrors.firstName = "First name must contain at least 2 characters.";
    }

    if (form.lastName.trim().length < 2) {
      nextErrors.lastName = "Last name must contain at least 2 characters.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    const passwordIsValid = evaluatedPasswordRules.every((rule) => rule.passed);

    if (!passwordIsValid) {
      nextErrors.password = "Your password does not meet all requirements.";
    }

    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
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
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      toast.success("Your account has been created!");

      navigate("/app/dashboard", {
        replace: true,
      });
    } catch (error) {
      const message = error?.message ?? "Unable to create your account.";

      setErrors({
        form: message,
      });

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-form auth-form--register">
      <div className="auth-form__heading">
        <span>Start your journey</span>
        <h1>Create your workspace</h1>
        <p>Organize your search and make every application count.</p>
      </div>

      {errors.form && (
        <div className="form-alert" role="alert">
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">First name</label>

            <div
              className={`input-shell ${
                errors.firstName ? "input-shell--error" : ""
              }`}
            >
              <UserRound size={18} />

              <input
                id="firstName"
                name="firstName"
                value={form.firstName}
                onChange={updateField}
                autoComplete="given-name"
                placeholder="Sami"
              />
            </div>

            {errors.firstName && (
              <p className="form-error">{errors.firstName}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last name</label>

            <div
              className={`input-shell ${
                errors.lastName ? "input-shell--error" : ""
              }`}
            >
              <UserRound size={18} />

              <input
                id="lastName"
                name="lastName"
                value={form.lastName}
                onChange={updateField}
                autoComplete="family-name"
                placeholder="Munir"
              />
            </div>

            {errors.lastName && <p className="form-error">{errors.lastName}</p>}
          </div>
        </div>

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
          autoComplete="new-password"
          placeholder="Create a strong password"
          error={errors.password}
        />

        <div className="password-rules">
          {evaluatedPasswordRules.map((rule) => (
            <div
              className={
                rule.passed
                  ? "password-rule password-rule--passed"
                  : "password-rule"
              }
              key={rule.label}
            >
              <span>
                <Check size={12} />
              </span>

              {rule.label}
            </div>
          ))}
        </div>

        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm password"
          value={form.confirmPassword}
          onChange={updateField}
          autoComplete="new-password"
          placeholder="Repeat your password"
          error={errors.confirmPassword}
        />

        <button
          className="primary-button"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="spin" size={19} />
              Creating account...
            </>
          ) : (
            <>
              Create account
              <ArrowRight size={19} />
            </>
          )}
        </button>
      </form>

      <p className="auth-form__footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}

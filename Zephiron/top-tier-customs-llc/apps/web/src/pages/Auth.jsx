import {
  ArrowRight,
  Globe,
  Lock,
  LockKeyhole,
  Mail,
  UserPlus,
  LogIn,
  ShieldCheck,
  Wrench,
  Sparkles,
} from "lucide-react";
import { useTheme } from "../contexts/Theme";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/logo.jpg";

const Auth = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [mode, setMode] = useState("register");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    city: "",
    country: "",
  });

  const accentRing = isDark ? "focus:ring-rose-500" : "focus:ring-sky-500";
  const accentBorder = isDark ? "border-rose-500/40" : "border-sky-500/40";
  const accentBg = isDark ? "bg-rose-500" : "bg-sky-500";
  const accentHover = isDark ? "hover:bg-rose-500/90" : "hover:bg-sky-500/90";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // your submit logic
  };

  return (
    <main
      className={`w-full min-h-screen transition-all duration-3000 ${
        isDark ? "bg-zinc-950/90 text-zinc-50" : "bg-zinc-50/90 text-zinc-950"
      }`}
    >
      {/* subtle background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className={`absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl opacity-25 ${
            isDark ? "bg-rose-500" : "bg-sky-500"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 pb-12">
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch`}
        >
          {/* LEFT: Welcome / Brand */}
          <section
            className={`rounded-3xl border p-7 sm:p-9 transition-all duration-3000 ${
              isDark
                ? "bg-white/5 border-white/10"
                : "bg-black/5 border-black/10"
            }`}
          >
            <div className="flex items-center gap-4">
              <img
                src={logo}
                alt="Top Tier Customs Logo"
                className={`h-16 w-16 rounded-2xl object-cover border-2 ${accentBorder}`}
              />
              <div>
                <p className="text-sm opacity-75">Top Tier Customs</p>
                <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wide">
                  Welcome back.
                </h1>
              </div>
            </div>

            <p className="mt-5 text-base sm:text-lg opacity-80 leading-relaxed">
              Build your next upgrade with curated parts, clean installs, and a
              process that’s as sharp as the final result.
            </p>

            {/* Mode Toggle Pill */}
            <div className="mt-7">
              <div
                className={`inline-flex items-center rounded-full border p-1 ${
                  isDark
                    ? "border-white/10 bg-black/20"
                    : "border-black/10 bg-white/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    mode === "register"
                      ? `${accentBg} text-white shadow-lg`
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    mode === "login"
                      ? `${accentBg} text-white shadow-lg`
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  Login
                </button>
              </div>

              <p className="mt-3 text-sm opacity-70">
                {mode === "register"
                  ? "Create an account to save builds, track orders, and book services."
                  : "Sign in to manage your profile, orders, and appointments."}
              </p>
            </div>

            {/* Value props */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: ShieldCheck, title: "Verified Quality" },
                { icon: Wrench, title: "Pro Installs" },
                { icon: Sparkles, title: "Clean Finish" },
              ].map(({ icon: Icon, title }) => (
                <div
                  key={title}
                  className={`rounded-2xl border p-4 ${
                    isDark
                      ? "bg-white/5 border-white/10"
                      : "bg-white/70 border-black/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-9 w-9 rounded-xl grid place-items-center border ${
                        isDark
                          ? "bg-black/20 border-white/10"
                          : "bg-white border-black/10"
                      }`}
                    >
                      <Icon className="opacity-90" size={18} />
                    </div>
                    <p className="text-sm font-semibold">{title}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Small secondary nav */}
            <div className="mt-9 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/")}
                className={`px-5 py-3 rounded-full text-sm font-semibold border transition ${
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "border-black/10 bg-black/5 hover:bg-black/10"
                }`}
              >
                Back to Home
              </button>

              <button
                type="button"
                onClick={() => navigate("/catalog")}
                className={`px-5 py-3 rounded-full text-sm font-semibold border-2 ${accentBorder} hover:translate-y-[-1px] transition`}
              >
                Browse Catalog <ArrowRight className="inline ml-1" size={16} />
              </button>
            </div>
          </section>

          {/* RIGHT: Form */}
          <section
            className={`rounded-3xl border p-7 sm:p-9 transition-all duration-3000 ${
              isDark
                ? "bg-white/5 border-white/10"
                : "bg-white/70 border-black/10"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold">
                  {mode === "register" ? "Create your account" : "Sign in"}
                </h2>
                <p className="mt-2 opacity-75">
                  {mode === "register"
                    ? "Join to save builds, track orders, and schedule services."
                    : "Welcome back — let’s get you back to building."}
                </p>
              </div>
              <div
                className={`h-12 w-12 rounded-2xl grid place-items-center border ${
                  isDark
                    ? "bg-black/20 border-white/10"
                    : "bg-white border-black/10"
                }`}
              >
                {mode === "register" ? <UserPlus /> : <LogIn />}
              </div>
            </div>

            {/* Error */}
            {error ? (
              <div
                className={`mt-6 rounded-2xl border p-4 text-sm ${
                  isDark
                    ? "border-rose-500/40 bg-rose-500/10"
                    : "border-sky-500/40 bg-sky-500/10"
                }`}
              >
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              {mode === "register" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    icon={<UserPlus size={18} className="opacity-80" />}
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                    isDark={isDark}
                    accentRing={accentRing}
                  />
                  <Input
                    icon={<UserPlus size={18} className="opacity-80" />}
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    isDark={isDark}
                    accentRing={accentRing}
                  />
                </div>
              )}

              <Input
                icon={<Mail size={18} className="opacity-80" />}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email address"
                isDark={isDark}
                accentRing={accentRing}
              />

              <div
                className={`grid grid-cols-1 ${
                  mode === "register" ? "sm:grid-cols-2" : ""
                } gap-3`}
              >
                <Input
                  icon={<Lock size={18} className="opacity-80" />}
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                  isDark={isDark}
                  accentRing={accentRing}
                />

                {mode === "register" && (
                  <Input
                    icon={<LockKeyhole size={18} className="opacity-80" />}
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    isDark={isDark}
                    accentRing={accentRing}
                  />
                )}
              </div>

              {mode === "register" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    icon={<Globe size={18} className="opacity-80" />}
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="City"
                    isDark={isDark}
                    accentRing={accentRing}
                  />
                  <Input
                    icon={<Globe size={18} className="opacity-80" />}
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    placeholder="Country"
                    isDark={isDark}
                    accentRing={accentRing}
                  />
                </div>
              )}

              <button
                type="submit"
                className={`w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold transition ${
                  isDark ? "text-white" : "text-white"
                } ${accentBg} ${accentHover}`}
              >
                {mode === "register" ? "Create account" : "Sign in"}
                <ArrowRight size={18} />
              </button>

              <div className="pt-2 text-sm opacity-75">
                {mode === "register" ? (
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className={`font-semibold underline underline-offset-4 ${
                        isDark ? "hover:text-rose-300" : "hover:text-sky-600"
                      }`}
                    >
                      Log in
                    </button>
                  </p>
                ) : (
                  <p>
                    New here?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("register")}
                      className={`font-semibold underline underline-offset-4 ${
                        isDark ? "hover:text-rose-300" : "hover:text-sky-600"
                      }`}
                    >
                      Create an account
                    </button>
                  </p>
                )}
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
};

function Input({ icon, isDark, accentRing, className = "", ...props }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
        isDark ? "bg-black/20 border-white/10" : "bg-white border-black/10"
      }`}
    >
      <div className="shrink-0">{icon}</div>
      <input
        {...props}
        className={`w-full bg-transparent outline-none placeholder:opacity-60 ${accentRing} focus:ring-2 rounded-lg ${className}`}
      />
    </div>
  );
}

export default Auth;

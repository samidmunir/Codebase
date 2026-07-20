import {
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Outlet } from "react-router-dom";

const benefits = [
  {
    icon: BarChart3,
    title: "Measure your progress",
    description:
      "Track response rates, interviews, offers, and pipeline performance.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by design",
    description:
      "Your session uses rotating refresh tokens and secure authentication.",
  },
  {
    icon: Sparkles,
    title: "Stay organized",
    description:
      "Keep applications, tasks, contacts, interviews, and documents together.",
  },
];

export default function AuthLayout() {
  return (
    <main className="auth-layout">
      <section className="auth-layout__showcase">
        <div className="auth-layout__showcase-content">
          <div className="brand">
            <div className="brand__mark">
              <BriefcaseBusiness size={25} />
            </div>

            <div>
              <strong>ApplyFlow</strong>
              <span>Career Workspace</span>
            </div>
          </div>

          <div className="auth-layout__headline">
            <div className="eyebrow">
              <CheckCircle2 size={16} />
              Built for intentional job searches
            </div>

            <h1>Turn every opportunity into a clear next step.</h1>

            <p>
              Build a focused application pipeline, prepare for interviews,
              manage follow-ups, and understand what is driving your job search
              forward.
            </p>
          </div>

          <div className="auth-benefits">
            {benefits.map(({ icon: Icon, title, description }) => (
              <article className="auth-benefit" key={title}>
                <div className="auth-benefit__icon">
                  <Icon size={19} />
                </div>

                <div>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="auth-layout__orb auth-layout__orb--one" />
        <div className="auth-layout__orb auth-layout__orb--two" />
      </section>

      <section className="auth-layout__form-panel">
        <div className="auth-layout__mobile-brand">
          <div className="brand__mark">
            <BriefcaseBusiness size={23} />
          </div>

          <strong>ApplyFlow</strong>
        </div>

        <div className="auth-layout__form-container">
          <Outlet />
        </div>
      </section>
    </main>
  );
}

import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Plus,
  Target,
  Trophy,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext.jsx";

const metrics = [
  {
    label: "Active applications",
    value: "0",
    detail: "Start building your pipeline",
    icon: BriefcaseBusiness,
  },
  {
    label: "Upcoming interviews",
    value: "0",
    detail: "Nothing scheduled yet",
    icon: CalendarCheck,
  },
  {
    label: "Tasks due",
    value: "0",
    detail: "Your schedule is clear",
    icon: CheckCircle2,
  },
  {
    label: "Offers received",
    value: "0",
    detail: "Keep building momentum",
    icon: Trophy,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <section className="dashboard__welcome">
        <div>
          <div className="eyebrow">
            <Target size={16} />
            Your job-search command center
          </div>

          <h1>Welcome back, {user?.firstName}.</h1>

          <p>
            Here is an overview of your application activity and what needs your
            attention.
          </p>
        </div>

        <button className="primary-button dashboard__add-button">
          <Plus size={19} />
          Add application
        </button>
      </section>

      <section className="dashboard-metrics">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <article className="metric-card" key={label}>
            <div className="metric-card__header">
              <div className="metric-card__icon">
                <Icon size={20} />
              </div>

              <ArrowUpRight size={18} />
            </div>

            <strong>{value}</strong>
            <h2>{label}</h2>
            <p>{detail}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel dashboard-panel--wide">
          <div className="dashboard-panel__heading">
            <div>
              <span>Pipeline</span>
              <h2>Application activity</h2>
            </div>

            <select defaultValue="30">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          <div className="empty-state">
            <div className="empty-state__icon">
              <BriefcaseBusiness size={30} />
            </div>

            <h3>No applications yet</h3>

            <p>
              Add your first opportunity to begin tracking your application
              pipeline and performance.
            </p>

            <button className="secondary-button">
              <Plus size={18} />
              Add first application
            </button>
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel__heading">
            <div>
              <span>Today</span>
              <h2>Upcoming</h2>
            </div>
          </div>

          <div className="empty-state empty-state--compact">
            <div className="empty-state__icon">
              <Clock3 size={26} />
            </div>

            <h3>Your schedule is clear</h3>

            <p>Interviews, follow-ups, and due tasks will appear here.</p>
          </div>
        </article>
      </section>
    </div>
  );
}

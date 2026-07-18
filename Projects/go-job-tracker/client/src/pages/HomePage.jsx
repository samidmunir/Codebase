import { useEffect, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  CheckCircle2,
  Database,
  LoaderCircle,
  Server,
  XCircle,
} from "lucide-react";
import { getAPIHealth, getDatabaseHealth } from "../services/healthService";

const initialServiceState = {
  status: "checking",
  message: "Checking service...",
};

function ServiceCard({ title, icon: Icon, service }) {
  const isChecking = service.status === "checking";
  const isHealthy = service.status === "healthy";

  return (
    <article className="service-card">
      <div className="service-card_header">
        <div className="service-card_icon">
          <Icon size={22} />
        </div>

        <div>
          <p className="service-card_eyebrow">System service</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="service-card_status">
        {isChecking && <LoaderCircle className="spin" size={20} />}

        {!isChecking &&
          (isHealthy ? <CheckCircle2 size={20} /> : <XCircle size={20} />)}

        <span>{service.message}</span>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [apiHealth, setApiHealth] = useState(initialServiceState);
  const [databaseHealth, setDatabaseHealth] = useState(initialServiceState);

  useEffect(() => {
    async function checkServices() {
      const [apiResult, databaseResult] = await Promise.allSettled([
        getAPIHealth(),
        getDatabaseHealth(),
      ]);

      if (apiResult.status === "fulfilled") {
        setApiHealth({
          status: "healthy",
          message: apiResult.value.message,
        });
      } else {
        setApiHealth({
          status: "unhealthy",
          message: apiResult.reason.message,
        });
      }

      if (databaseResult.status === "fulfilled") {
        setDatabaseHealth({
          status: "healthy",
          message: databaseResult.value.message,
        });
      } else {
        setDatabaseHealth({
          status: "unhealthy",
          message: databaseResult.reason.message,
        });
      }
    }

    checkServices();
  }, []);

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero_badge">
          <Activity size={16} />
          Milestone #1
        </div>
        <div className="hero_icon">
          <BriefcaseBusiness size={36} />
        </div>
        <h1>Go Job Tracker</h1>
        <p>
          A professional workspace for organizing applications, interviews,
          contacts, offers, tasks, and job-search analytics.
        </p>
      </section>

      <section className="services-grid">
        <ServiceCard title="GJT API" icon={Server} service={apiHealth} />

        <ServiceCard title="MongoDB" icon={Database} service={databaseHealth} />
      </section>
    </main>
  );
}

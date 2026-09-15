import { useEffect, useState } from "react";
import { getReadiness, type ReadinessResponse } from "../../api/health";

type Status = "loading" | "ready" | "error";

export function ApiStatus() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<ReadinessResponse | null>(null);

  useEffect(() => {
    async function checkApi() {
      try {
        const result = await getReadiness();

        setData(result);
        setStatus("ready");
      } catch (error) {
        console.error("Atlas API readiness check failed:", error);
        setStatus("error");
      }
    }
    void checkApi();
  }, []);

  if (status === "loading") {
    return <p>Checking Atlas API...</p>;
  }

  if (status === "error") {
    return <p>Atlas API unavailable.</p>;
  }

  return (
    <div>
      <p>Atlas API connected.</p>
      <p>Database: {data?.database}</p>
    </div>
  );
}

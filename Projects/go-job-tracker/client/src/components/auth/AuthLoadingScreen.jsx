import { BriefcaseBusiness, LoaderCircle } from "lucide-react";

export default function AuthLoadingScreen() {
  return (
    <main className="auth-loading-screen">
      <div className="auth-loading-screen_logo">
        <BriefcaseBusiness size={30} />
      </div>

      <LoaderCircle
        className="spin"
        size={28}
        aria-label="Loading authentication session"
      />

      <p>Restoring your workspace...</p>
    </main>
  );
}

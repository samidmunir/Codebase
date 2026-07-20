import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../components/auth/ProtectedRoute.jsx";
import PublicRoute from "../components/auth/PublicRoute.jsx";
import AppLayout from "../layouts/AppLayout.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import PlaceholderPage from "../pages/PlaceholderPage.jsx";
import RegisterPage from "../pages/RegisterPage.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />

          <Route path="dashboard" element={<DashboardPage />} />

          <Route
            path="applications"
            element={
              <PlaceholderPage
                title="Applications"
                description="Your complete application pipeline will be implemented in Milestone #3."
              />
            }
          />

          <Route
            path="companies"
            element={
              <PlaceholderPage
                title="Companies"
                description="Company research and relationship tracking are coming next."
              />
            }
          />

          <Route
            path="contacts"
            element={
              <PlaceholderPage
                title="Contacts"
                description="Manage recruiters, referrals, hiring managers, and interviewers."
              />
            }
          />

          <Route
            path="interviews"
            element={
              <PlaceholderPage
                title="Interviews"
                description="Interview preparation and scheduling will live here."
              />
            }
          />

          <Route
            path="tasks"
            element={
              <PlaceholderPage
                title="Tasks"
                description="Follow-ups, assessments, and deadlines will be organized here."
              />
            }
          />

          <Route
            path="documents"
            element={
              <PlaceholderPage
                title="Documents"
                description="Store resumes, cover letters, portfolios, and supporting files."
              />
            }
          />

          <Route
            path="analytics"
            element={
              <PlaceholderPage
                title="Analytics"
                description="Your pipeline performance and conversion metrics will appear here."
              />
            }
          />

          <Route
            path="settings"
            element={
              <PlaceholderPage
                title="Settings"
                description="Manage your profile, preferences, security, and notifications."
              />
            }
          />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

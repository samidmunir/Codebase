import { Route, Routes } from "react-router-dom";

import { LoginPage, RegisterPage } from "../features/auth";

import { DashboardPage } from "../features/dashboard/pages/DashboardPage";

import { AppLayout } from "../layouts/AppLayout";

import CalendarPage from "../pages/CalendarPage";
import GoalsPage from "../pages/GoalsPage";
import HabitsPage from "../pages/HabitsPage";
import NotFoundPage from "../pages/NotFoundPage";
import ProjectsPage from "../features/projects/pages/ProjectsPage";
import ProjectDetailPage from "../features/projects/pages/ProjectDetailPage";
import TasksPage from "../features/tasks/pages/TasksPage";

import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />

          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />

          <Route path="tasks" element={<TasksPage />} />

          <Route path="goals" element={<GoalsPage />} />

          <Route path="habits" element={<HabitsPage />} />

          <Route path="calendar" element={<CalendarPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

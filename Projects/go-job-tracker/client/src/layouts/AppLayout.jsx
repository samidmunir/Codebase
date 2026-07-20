import { Outlet } from "react-router-dom";

import AppHeader from "../components/layout/AppHeader.jsx";
import AppSidebar from "../components/layout/AppSidebar.jsx";

export default function AppLayout() {
  return (
    <div className="authenticated-app">
      <AppSidebar />

      <div className="authenticated-app__content">
        <AppHeader />

        <main className="app-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

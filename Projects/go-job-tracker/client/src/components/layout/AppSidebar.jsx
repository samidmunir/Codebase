import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckSquare2,
  ContactRound,
  FileText,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const primaryNavigation = [
  {
    label: "Dashboard",
    to: "/app/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Applications",
    to: "/app/applications",
    icon: BriefcaseBusiness,
  },
  {
    label: "Companies",
    to: "/app/companies",
    icon: Building2,
  },
  {
    label: "Contacts",
    to: "/app/contacts",
    icon: ContactRound,
  },
  {
    label: "Interviews",
    to: "/app/interviews",
    icon: CalendarDays,
  },
  {
    label: "Tasks",
    to: "/app/tasks",
    icon: CheckSquare2,
  },
  {
    label: "Documents",
    to: "/app/documents",
    icon: FileText,
  },
  {
    label: "Analytics",
    to: "/app/analytics",
    icon: BarChart3,
  },
];

export default function AppSidebar() {
  return (
    <aside className="app-sidebar">
      <div className="brand app-sidebar__brand">
        <div className="brand__mark">
          <BriefcaseBusiness size={24} />
        </div>

        <div>
          <strong>ApplyFlow</strong>
          <span>Career Workspace</span>
        </div>
      </div>

      <nav className="app-sidebar__navigation">
        <p className="app-sidebar__section-title">Workspace</p>

        {primaryNavigation.map(({ label, to, icon: Icon }) => (
          <NavLink
            to={to}
            key={to}
            className={({ isActive }) =>
              isActive ? "sidebar-link sidebar-link--active" : "sidebar-link"
            }
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="app-sidebar__footer">
        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            isActive ? "sidebar-link sidebar-link--active" : "sidebar-link"
          }
        >
          <Settings size={19} />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}

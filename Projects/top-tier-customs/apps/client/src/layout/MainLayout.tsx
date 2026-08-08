import Navbar from "../components/navigation/Navbar";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <main>
      {/* Scrollbar */}
      <Navbar />
      <Outlet />
      {/* Footer */}
    </main>
  );
};

export default MainLayout;

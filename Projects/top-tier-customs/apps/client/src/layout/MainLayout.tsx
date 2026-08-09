import Navbar from "../components/navigation/Navbar";
import { Outlet } from "react-router-dom";
import Footer from "../components/navigation/Footer";

const MainLayout = () => {
  return (
    <main>
      {/* Scrollbar */}
      <Navbar />
      <Outlet />
      <Footer />
    </main>
  );
};

export default MainLayout;

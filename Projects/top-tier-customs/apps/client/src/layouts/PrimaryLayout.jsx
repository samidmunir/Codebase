import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

const PrimaryLayout = () => {
  return (
    <main>
      <Navbar />
      <section>
        <Outlet />
      </section>
    </main>
  );
};

export default PrimaryLayout;

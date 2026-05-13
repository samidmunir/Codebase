import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { ToastContainer } from "react-toastify";
import { useTheme } from "../contexts/Theme";
import ScrollBar from "../components/ui/ScrollBar";

const Main = ({ children }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <main>
      <ScrollBar />
      <Navbar />
      <ToastContainer position="bottom-right" autoClose={3000} theme={theme} />
      <section
        className={`min-h-screen transition-all duration-3000 ${
          isDark ? "bg-zinc-950/90" : "bg-zinc-50/90"
        }`}
      >
        {children}
      </section>
      <Footer />
    </main>
  );
};

export default Main;

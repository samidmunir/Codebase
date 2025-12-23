import { useTheme } from "../contexts/Theme";
import Navbar from "../components/Navbar";

const Main = ({ children }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <main>
      <Navbar />
      <section
        className={`min-h-screen transition-all duration-3000 ${
          isDark ? "bg-zinc-950/90" : "bg-zinc-50/90"
        }`}
      >
        {children}
      </section>
    </main>
  );
};

export default Main;

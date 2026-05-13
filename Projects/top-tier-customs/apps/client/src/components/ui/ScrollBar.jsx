import { motion, useScroll } from "framer-motion";
import { useTheme } from "../../contexts/Theme";

const ScrollBar = () => {
  const { scrollYProgress } = useScroll();

  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.div
      style={{ scaleX: scrollYProgress }}
      className={`fixed top-0 left-0 h-1 w-full origin-left z-1000 rounded-full shadow-md transition-all duration-1000 ${
        isDark
          ? "bg-linear-to-r from-rose-500 to-zinc-50"
          : "bg-linear-to-r from-sky-500 to-zinc-950"
      }`}
    ></motion.div>
  );
};

export default ScrollBar;

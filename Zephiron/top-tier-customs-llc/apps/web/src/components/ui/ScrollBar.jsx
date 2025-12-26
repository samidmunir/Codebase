import { useTheme } from "../../contexts/Theme";
import { motion, useScroll } from "framer-motion";

const ScrollBar = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      style={{ scaleX: scrollYProgress }}
      className={`fixed top-0 left-0 h-1 w-full origin-left z-1000 rounded-full shadow-md bg-linear-to-r transition-all duration-1000 ${
        isDark ? "from-rose-500 to-zinc-50" : "from-sky-500 to-zinc-950"
      }`}
    ></motion.div>
  );
};

export default ScrollBar;

import { useTheme } from "../../contexts/Theme";
import { Moon, Sun } from "lucide-react";

const Theme = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="relative h-10 w-10 rounded-xl grid place-items-center cursor-pointer
                 transition-transform active:scale-95"
    >
      {/* Sun */}
      <Sun
        className={[
          "absolute h-6 w-6 transition-all duration-1500 ease-out",
          "motion-reduce:transition-none",
          isDark
            ? "opacity-100 scale-100 rotate-0 text-amber-500"
            : "opacity-0 scale-75 -rotate-90 text-amber-500 pointer-events-none",
        ].join(" ")}
      />

      {/* Moon */}
      <Moon
        className={[
          "absolute h-6 w-6 transition-all duration-1500 ease-out",
          "motion-reduce:transition-none",
          isDark
            ? "opacity-0 scale-75 rotate-90 text-indigo-600 pointer-events-none"
            : "opacity-100 scale-100 rotate-0 text-indigo-600",
        ].join(" ")}
      />
    </button>
  );
};

export default Theme;

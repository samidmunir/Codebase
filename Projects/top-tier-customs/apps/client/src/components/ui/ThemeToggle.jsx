import { useTheme } from "../../context/ThemeContext";
import { Moon, Sun } from "lucide-react";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button onClick={() => toggleTheme()}>
      {isDark ? (
        <Sun
          size={28}
          className={`text-amber-500 transition-all duration-1500`}
        />
      ) : (
        <Moon
          size={28}
          className={`text-blue-600 transition-all duration-1500`}
        />
      )}
    </button>
  );
};

export default ThemeToggle;

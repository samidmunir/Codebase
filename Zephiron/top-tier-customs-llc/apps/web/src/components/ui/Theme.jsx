import { useTheme } from "../../contexts/Theme";
import { Moon, Sun } from "lucide-react";

const Theme = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className={`p-1 flex items-center justify-center cursor-pointer transition-all duration-1000`}
    >
      {isDark ? (
        <Sun className="text-amber-500" />
      ) : (
        <Moon className="text-blue-600" />
      )}
    </button>
  );
};

export default Theme;

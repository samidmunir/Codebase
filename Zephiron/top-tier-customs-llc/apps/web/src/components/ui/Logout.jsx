import { useTheme } from "../../contexts/Theme";
import { LogOut } from "lucide-react";
import { useAuth } from "../../contexts/Auth";

const Login = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { logout } = useAuth();

  return (
    <button
      onClick={logout}
      className={`p-1 flex items-center justify-center cursor-pointer transition-all duration-1000 ${
        isDark ? "text-sky-500" : "text-blue-600"
      }`}
    >
      <LogOut />
    </button>
  );
};

export default Login;

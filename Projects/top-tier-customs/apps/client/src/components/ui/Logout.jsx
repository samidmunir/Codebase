import { LogOut } from "lucide-react";
import { useTheme } from "../../contexts/Theme";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/Auth";

const Logout = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { logout } = useAuth();

  const navigate = useNavigate();

  return (
    <button
      onClick={logout}
      className={`p-1 flex items-center justify-center cursor-pointer transition-all duration-1000 ${
        isDark ? "text-rose-500" : "text-red-600"
      }`}
    >
      <LogOut />
    </button>
  );
};

export default Logout;

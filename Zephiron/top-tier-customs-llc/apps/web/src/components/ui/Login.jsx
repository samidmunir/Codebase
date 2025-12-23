import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/Theme";
import { LogIn } from "lucide-react";

const Login = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/auth")}
      className={`p-1 flex items-center justify-center cursor-pointer transition-all duration-1000 ${
        isDark ? "text-sky-500" : "text-blue-600"
      }`}
    >
      <LogIn />
    </button>
  );
};

export default Login;

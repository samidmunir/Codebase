import { LogIn } from "lucide-react";
import { useTheme } from "../../contexts/Theme";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/auth")}
      className={`p-1 flex items-center justify-center cursor-pointer transition-all duration-1000 ${
        isDark ? "text-sky-500" : "text-rose-500"
      }`}
    >
      <LogIn />
    </button>
  );
};

export default Login;

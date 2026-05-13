import { createContext, useContext, useEffect, useState } from "react";
import api, { set_access_token } from "../api/axios.js";
import { toast } from "react-toastify";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [status, setStatus] = useState("loading");

  const apply_access_token = (token) => {
    setAccessToken(token);
    set_access_token(token);
  };

  useEffect(() => {
    const init_auth = async () => {
      try {
        const res = await api.post("/api/auth/refresh", {});
        setUser(res.data.user);
        apply_access_token(res.data.access_token);
        setStatus("authenticated");
      } catch (e) {
        setUser(null);
        apply_access_token(null);
        setStatus("unauthenticated");
      }
    };

    init_auth();
  }, []);

  const register = async (email, password, first_name, last_name) => {
    const res = await api.post("/api/auth/register", {
      email,
      password,
      first_name,
      last_name,
    });

    if (res.status === 201) {
      //   alert("Registeration successful. Please login");
      setStatus("unauthenticated");
    } else {
      alert("Registration failed.");
      setStatus("unauthenticated");
    }
  };

  const login = async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });

    if (res.status === 200) {
      setUser(res.data.user);
      apply_access_token(res.data.access_token);
      setStatus("authenticated");
    } else {
      setUser(null);
      apply_access_token(null);
      setStatus("unauthenticated");
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout", {});
      toast.success("You are now logged out.");
    } catch (e) {
      //
    }
    setUser(null);
    apply_access_token(null);
    setStatus("unauthenticated");
  };

  const resetPassword = async (password, new_password) => {
    try {
      console.log("<context.Auth.jsx> resetPassword(): password:", password);
      console.log(
        "<context.Auth.jsx> resetPassword(): new_password:",
        new_password
      );
      const res = await api.put("/api/auth/reset-password", {
        password,
        new_password,
      });
      console.log("res:", res);

      if (res.status === 204) {
        alert("Password updated successfully!");
      } else {
        alert("Failed to update password.");
      }
    } catch (e) {
      console.error("Failed to update password:", e.message);
    }
  };

  const updateSettings = async (settings) => {
    try {
      const res = await api.put("/api/auth/update-settings", { settings });
      console.log("<updateSettings()> --> res:", res);

      if (res.status === 204) {
        alert("Settings updated successfully!");
      } else {
        alert("Failed to update settings.");
      }
    } catch (e) {
      console.error("Failed to update user settings:", e.message);
    }
  };

  const value = {
    user,
    accessToken,
    status,
    register,
    login,
    logout,
    resetPassword,
    updateSettings,
    isAuthenticated: status === "authenticated" && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

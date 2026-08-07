import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
} from "react";
import { toast } from "react-hot-toast";

type Location = {
  city: string;
  country: string;
};

type BillingAddress = {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

type ShippingAddress = {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  location: Location;
  phone: string;
  email: string;
  role: string;
  billingAddress: BillingAddress;
  shippingAddress: ShippingAddress;
  vehicles: string[];
  savedProducts: string[];
  createdAt: string;
  updatedAt: string;
};

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  updateUser: (newData: Partial<User>) => void;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedUserRaw = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    try {
      if (storedUserRaw && storedUserRaw !== "undefined" && storedToken) {
        const storedUser: User = JSON.parse(storedUserRaw);
        setUser(storedUser);
        setToken(storedToken);
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to parse user from localStorage:", error);
      localStorage.removeItem("user");
      setUser(null);
    }
  }, []);

  const login = (token: string, user: User) => {
    setToken(token);
    setUser(user);

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    toast.success("Logged out.");
  };

  const updateUser = (newData: Partial<User>) => {
    if (!user) {
      return;
    }

    setUser({ ...user, ...newData });
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, updateUser, token, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      "useAuth() hook must be used within a <AuthProvider> component.",
    );
  }

  return context;
};

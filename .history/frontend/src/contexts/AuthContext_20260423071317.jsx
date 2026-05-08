import axios from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// Use environment variable for API URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("access_token"));
  const logoutInProgressRef = useRef(false);

  const logout = useCallback(
    (showToast = true) => {
      if (logoutInProgressRef.current) {
        return;
      }

      logoutInProgressRef.current = true;
      const hadSession = Boolean(
        localStorage.getItem("access_token") ||
        localStorage.getItem("refresh_token") ||
        token ||
        user,
      );

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      delete axios.defaults.headers.common["Authorization"];
      setToken(null);
      setUser(null);

      if (showToast && hadSession) {
        toast.success("Logged out successfully");
      }

      setTimeout(() => {
        logoutInProgressRef.current = false;
      }, 0);
    },
    [token, user],
  );

  const fetchUser = useCallback(async () => {
    console.log("Fetching user from:", `${API_URL}/auth/me/`);
    try {
      const response = await axios.get(`${API_URL}/auth/me/`);
      console.log("User fetch response:", response.data);
      setUser(response.data);
    } catch (error) {
      console.error(
        "Error fetching user:",
        error.response?.status,
        error.response?.data,
      );
      logout(false);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const login = useCallback(
    async (username, password) => {
      console.log("Login attempt for:", username);
      try {
        const response = await axios.post(`${API_URL}/token/`, {
          username,
          password,
        });
        console.log("Login response:", response.data);
        const { access, refresh } = response.data;
        localStorage.setItem("access_token", access);
        localStorage.setItem("refresh_token", refresh);
        axios.defaults.headers.common["Authorization"] = `Bearer ${access}`;
        setToken(access);
        await fetchUser();
        toast.success("Login successful!");
        return true;
      } catch (error) {
        console.error("Login error:", error.response?.data);
        toast.error("Invalid credentials");
        return false;
      }
    },
    [fetchUser],
  );

  useEffect(() => {
    console.log("AuthProvider useEffect - token exists:", !!token);
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      console.log("No token, setting loading to false");
      setLoading(false);
    }
  }, [fetchUser, token]);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};

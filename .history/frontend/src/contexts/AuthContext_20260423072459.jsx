import axios from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

  const logout = useCallback((options = {}) => {
    const { showToast = true } = options;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
    if (showToast) {
      toast.success("Logged out successfully");
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me/`);
      setUser(response.data);
    } catch (error) {
      logout({ showToast: false });
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const login = useCallback(
    async (username, password) => {
      try {
        const response = await axios.post(`${API_URL}/token/`, {
          username,
          password,
        });
        const { access, refresh } = response.data;
        localStorage.setItem("access_token", access);
        localStorage.setItem("refresh_token", refresh);
        axios.defaults.headers.common["Authorization"] = `Bearer ${access}`;
        setToken(access);
        await fetchUser();
        toast.success("Login successful!");
        return true;
      } catch (error) {
        toast.error("Invalid credentials");
        return false;
      }
    },
    [fetchUser],
  );

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};

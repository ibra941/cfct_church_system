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

  const logout = useCallback(async (options = {}) => {
    const { showToast = true } = options;
    // Blacklist the refresh token server-side
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        await axios.post(`${API_URL}/auth/logout/`, { refresh: refreshToken });
      } catch {
        // Ignore – still clear local session
      }
    }
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
      return response.data;
    } catch (error) {
      logout({ showToast: false });
      return null;
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
        const userData = await fetchUser();
        if (!userData?.email_verified) {
          // Keep session so user can verify email and request a fresh link.
          return {
            success: true,
            emailVerified: false,
            email: userData?.email || "",
          };
        }
        toast.success("Login successful!");
        return { success: true, emailVerified: true };
      } catch (error) {
        const statusCode = error?.response?.status;
        const apiDetail = error?.response?.data?.detail;

        if (!error?.response) {
          toast.error(
            "Server unavailable. Start backend on http://localhost:8000",
          );
          return { success: false };
        }

        if (statusCode === 423) {
          return { success: false, locked: true, detail: apiDetail };
        }

        if (statusCode === 401 || statusCode === 400) {
          toast.error("Invalid username or password");
          return { success: false };
        }

        toast.error(apiDetail || "Login failed. Please try again.");
        return { success: false };
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
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser: fetchUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

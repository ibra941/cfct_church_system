import { useState } from "react";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash, FaTimes } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [requestingReset, setRequestingReset] = useState(false);
  const { login } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(username, password);
    setLoading(false);
    if (success) navigate("/dashboard");
  };

  const handlePasswordResetRequest = async (e) => {
    e.preventDefault();
    setRequestingReset(true);
    try {
      const response = await api.post("/auth/password-reset/request/", {
        email: resetEmail.trim(),
      });
      toast.success(
        response?.data?.detail ||
          (language === "sw"
            ? "Ikiwa barua pepe ipo, kiungo cha kuweka upya nenosiri kimetumwa."
            : "If that email exists, a reset link has been sent."),
      );
      setShowForgotModal(false);
      setResetEmail("");
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        (language === "sw"
          ? "Imeshindikana kutuma ombi la kuweka upya nenosiri"
          : "Failed to request password reset");
      toast.error(Array.isArray(detail) ? detail[0] : detail);
    } finally {
      setRequestingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="flex justify-center items-center py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              {language === "sw" ? "Ingia kwenye Mfumo" : "Sign in to System"}
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <input
                id="username"
                type="text"
                required
                className="input"
                placeholder={
                  language === "sw" ? "Jina la Mtumiaji" : "Username"
                }
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                className="input pr-10"
                placeholder={language === "sw" ? "Nenosiri" : "Password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-[106px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label={
                  showPassword
                    ? language === "sw"
                      ? "Ficha nenosiri"
                      : "Hide password"
                    : language === "sw"
                      ? "Onyesha nenosiri"
                      : "Show password"
                }
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                {language === "sw" ? "Umesahau nenosiri?" : "Forgot password?"}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading
                ? language === "sw"
                  ? "Inaingiza..."
                  : "Logging in..."
                : language === "sw"
                  ? "Ingia"
                  : "Sign in"}
            </button>
            <p className="text-center text-sm">
              <Link
                to="/register"
                className="text-primary-600 hover:text-primary-500"
              >
                {language === "sw"
                  ? "Huna akaunti? Jiunge nasi"
                  : "Don't have an account? Join us"}
              </Link>
            </p>
          </form>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-5 border-b dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {language === "sw" ? "Weka Upya Nenosiri" : "Reset Password"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handlePasswordResetRequest} className="p-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {language === "sw"
                  ? "Weka barua pepe uliyotumia kujisajili. Tutakutumia kiungo cha kuweka upya nenosiri."
                  : "Enter the email you used during registration. We will send a reset link."}
              </p>
              <input
                type="email"
                required
                className="input"
                placeholder={language === "sw" ? "Barua pepe" : "Email address"}
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="btn-secondary"
                >
                  {language === "sw" ? "Ghairi" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={requestingReset}
                  className="btn-primary"
                >
                  {requestingReset
                    ? language === "sw"
                      ? "Inatuma..."
                      : "Sending..."
                    : language === "sw"
                      ? "Tuma Kiungo"
                      : "Send Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

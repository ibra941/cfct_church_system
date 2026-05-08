import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const ResetPassword = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasValidLinkParams = useMemo(() => Boolean(uid && token), [uid, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasValidLinkParams) {
      toast.error(
        language === "sw"
          ? "Kiungo cha kuweka upya nenosiri si sahihi"
          : "Invalid password reset link",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(
        language === "sw" ? "Nenosiri hayafanani" : "Passwords do not match",
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/auth/password-reset/confirm/", {
        uid,
        token,
        new_password: newPassword,
      });
      toast.success(
        response?.data?.detail ||
          (language === "sw"
            ? "Nenosiri limewekwa upya"
            : "Password reset successful"),
      );
      navigate("/login");
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail[0]
        : detail ||
          (language === "sw"
            ? "Imeshindikana kuweka upya nenosiri"
            : "Failed to reset password");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="flex justify-center items-center py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              {language === "sw" ? "Weka Upya Nenosiri" : "Reset Password"}
            </h2>
          </div>

          {!hasValidLinkParams ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                {language === "sw"
                  ? "Kiungo hiki si sahihi au hakijakamilika. Tafadhali omba kiungo kipya kutoka ukurasa wa kuingia."
                  : "This link is invalid or incomplete. Please request a new link from the login page."}
              </p>
              <Link to="/login" className="btn-primary inline-block">
                {language === "sw" ? "Rudi Kuingia" : "Back to Login"}
              </Link>
            </div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="relative">
                  <input
                    id="new_password"
                    type={showNewPassword ? "text" : "password"}
                    required
                    className="input pr-10"
                    placeholder={
                      language === "sw" ? "Nenosiri Jipya" : "New Password"
                    }
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label={
                      showNewPassword
                        ? language === "sw"
                          ? "Ficha nenosiri"
                          : "Hide password"
                        : language === "sw"
                          ? "Onyesha nenosiri"
                          : "Show password"
                    }
                  >
                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className="input pr-10"
                    placeholder={
                      language === "sw"
                        ? "Thibitisha Nenosiri Jipya"
                        : "Confirm New Password"
                    }
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label={
                      showConfirmPassword
                        ? language === "sw"
                          ? "Ficha nenosiri"
                          : "Hide password"
                        : language === "sw"
                          ? "Onyesha nenosiri"
                          : "Show password"
                    }
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting
                  ? language === "sw"
                    ? "Inahifadhi..."
                    : "Saving..."
                  : language === "sw"
                    ? "Hifadhi Nenosiri Jipya"
                    : "Save New Password"}
              </button>

              <p className="text-center text-sm">
                <Link
                  to="/login"
                  className="text-primary-600 hover:text-primary-500"
                >
                  {language === "sw" ? "Rudi Kuingia" : "Back to Login"}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

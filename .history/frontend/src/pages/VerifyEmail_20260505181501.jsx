import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import { resendVerificationEmail, verifyEmail } from "../services/auth";

const VerifyEmail = () => {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const loginEmail = searchParams.get("email") || "";
  const fromLogin = searchParams.get("from") === "login";

  const [status, setStatus] = useState("idle"); // idle | loading | success | error | expired | pending
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState(loginEmail);
  const [resendStatus, setResendStatus] = useState("idle"); // idle | loading | sent | error

  useEffect(() => {
    if (!token) {
      if (fromLogin) {
        setStatus("pending");
        setMessage(
          language === "sw"
            ? "Akaunti yako haijathibitishwa bado. Tuma kiungo kipya cha uthibitisho hapa chini."
            : "Your account is not verified yet. Send a new verification link below.",
        );
      } else {
        setStatus("error");
        setMessage(
          language === "sw"
            ? "Kiungo cha kuthibitisha si sahihi."
            : "Invalid verification link.",
        );
      }
      return;
    }

    setStatus("loading");
    verifyEmail(token)
      .then((data) => {
        setStatus("success");
        setMessage(
          data?.detail ||
            (language === "sw"
              ? "Barua pepe imethibitishwa!"
              : "Email verified successfully!"),
        );
      })
      .catch((err) => {
        const detail = err?.response?.data?.detail || "";
        const isExpired =
          detail.toLowerCase().includes("expired") ||
          detail.toLowerCase().includes("muda");
        setStatus(isExpired ? "expired" : "error");
        setMessage(
          detail ||
            (language === "sw"
              ? "Imeshindikana kuthibitisha barua pepe."
              : "Failed to verify email."),
        );
      });
  }, [token, language]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendStatus("loading");
    try {
      await resendVerificationEmail(resendEmail.trim().toLowerCase());
      setResendStatus("sent");
    } catch {
      setResendStatus("error");
    }
  };

  const t = (sw, en) => (language === "sw" ? sw : en);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="flex justify-center items-center py-16 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow p-8 space-y-6">
          {status === "loading" && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">
                {t("Inathibitisha...", "Verifying...")}
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center space-y-4">
              <div className="text-green-500 text-5xl">✓</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("Barua Pepe Imethibitishwa", "Email Verified")}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">{message}</p>
              <Link
                to="/login"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                {t("Ingia", "Log In")}
              </Link>
            </div>
          )}

          {(status === "error" ||
            status === "expired" ||
            status === "pending") && (
            <div className="space-y-4">
              <div className="text-center">
                <div
                  className={`text-5xl ${status === "pending" ? "text-yellow-500" : "text-red-500"}`}
                >
                  {status === "pending" ? "!" : "✗"}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {status === "expired"
                    ? t("Kiungo Kimeisha Muda", "Link Expired")
                    : status === "pending"
                      ? t("Barua Pepe Haijathibitishwa", "Email Not Verified")
                      : t("Uthibitisho Umeshindwa", "Verification Failed")}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  {message}
                </p>
              </div>

              {/* Resend form */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t(
                    "Tuma tena kiungo cha kuthibitisha:",
                    "Resend a new verification link:",
                  )}
                </p>

                {resendStatus === "sent" ? (
                  <p className="text-green-600 text-sm">
                    {t(
                      "Kiungo kipya kimetumwa. Angalia barua pepe yako.",
                      "A new link has been sent. Check your inbox.",
                    )}
                  </p>
                ) : (
                  <form onSubmit={handleResend} className="flex gap-2">
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder={t("Barua pepe yako", "Your email")}
                      required
                      className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={resendStatus === "loading"}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {resendStatus === "loading"
                        ? t("Inatuma...", "Sending...")
                        : t("Tuma", "Send")}
                    </button>
                  </form>
                )}

                {resendStatus === "error" && (
                  <p className="text-red-500 text-sm mt-1">
                    {t(
                      "Imeshindikana kutuma. Jaribu tena.",
                      "Failed to send. Please try again.",
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

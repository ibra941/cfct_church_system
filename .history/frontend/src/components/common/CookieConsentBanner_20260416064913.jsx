import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const CONSENT_KEY = "cfct_cookie_consent";

const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    setVisible(!saved);
  }, []);

  const setConsent = (value) => {
    localStorage.setItem(CONSENT_KEY, value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-gray-900 text-white shadow-2xl border-t border-gray-700">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p className="text-sm leading-6 text-gray-200">
          We use essential cookies to keep CFCT Management System secure and reliable. Read our
          <Link to="/privacy" className="underline ml-1 mr-1 text-blue-300 hover:text-blue-200">
            Privacy Policy
          </Link>
          and
          <Link to="/terms" className="underline ml-1 text-blue-300 hover:text-blue-200">
            Terms of Service
          </Link>
          .
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setConsent("rejected")}
            className="px-3 py-2 text-sm rounded border border-gray-500 hover:bg-gray-800"
          >
            Decline Optional
          </button>
          <button
            onClick={() => setConsent("accepted")}
            className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaCheck, FaClock, FaTimes, FaUserCheck } from "react-icons/fa";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../services/api";

const PendingApprovalsPanel = ({ maxItems = 3 }) => {
  const { language } = useLanguage();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const response = await api.get("/members/registrations/pending/");
      const data = response.data.results || response.data || [];
      setRegistrations(Array.isArray(data) ? data.slice(0, maxItems) : []);
    } catch (error) {
      console.error("Error fetching pending registrations:", error);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (registrationId, action) => {
    const rejectionReason =
      action === "reject"
        ? window.prompt(
            language === "sw"
              ? "Weka sababu ya kukataa ombi hili"
              : "Enter a reason for rejecting this registration",
          )
        : "";

    if (action === "reject" && rejectionReason === null) {
      return;
    }

    setProcessingId(registrationId);
    try {
      await api.post(`/members/registrations/${registrationId}/${action}/`, {
        rejection_reason: rejectionReason || "",
      });
      toast.success(
        language === "sw"
          ? action === "approve"
            ? "Mwanachama amekubaliwa"
            : "Ombi limekataliwa"
          : action === "approve"
            ? "Member approved"
            : "Registration rejected",
      );
      setRegistrations((current) =>
        current.filter((registration) => registration.id !== registrationId),
      );
    } catch (error) {
      console.error("Error processing registration:", error);
      toast.error(
        language === "sw" ? "Hitilafu imetokea" : "An error occurred",
      );
    } finally {
      setProcessingId(null);
    }
  };

  if (loading || registrations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw" ? "Maombi Mapya ya Wanachama" : "New Member Registrations"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {language === "sw"
              ? "Kagua maombi mapya na uchukue hatua moja kwa moja hapa"
              : "Review new registrations and approve or reject them directly here"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 text-sm font-medium">
          <FaClock />
          <span>
            {registrations.length} {language === "sw" ? "inasubiri" : "pending"}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {registrations.map((registration) => {
          const personalInfo = registration.personal_info || {};
          return (
            <div
              key={registration.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FaUserCheck className="text-primary-600" />
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {personalInfo.full_name || registration.user_details?.full_name || registration.user_details?.username || "-"}
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <p>{personalInfo.email || registration.user_details?.email || "-"}</p>
                    <p>{personalInfo.phone || registration.user_details?.phone || "-"}</p>
                    <p>{registration.church_name || "-"}</p>
                    <p>{new Date(registration.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction(registration.id, "approve")}
                    disabled={processingId === registration.id}
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-2 rounded-md text-sm"
                  >
                    <FaCheck />
                    <span>{language === "sw" ? "Kubali" : "Approve"}</span>
                  </button>
                  <button
                    onClick={() => handleAction(registration.id, "reject")}
                    disabled={processingId === registration.id}
                    className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-2 rounded-md text-sm"
                  >
                    <FaTimes />
                    <span>{language === "sw" ? "Kataa" : "Reject"}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PendingApprovalsPanel;
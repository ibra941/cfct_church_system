import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaPray, FaTrash } from "react-icons/fa";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const PrayerRequests = () => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [requestText, setRequestText] = useState("");
  const [requests, setRequests] = useState([]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get("/prayers/");
      const data = response.data?.results || response.data || [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setRequests([]);
      toast.error(
        language === "sw"
          ? "Imeshindikana kupata maombi ya maombi"
          : "Failed to load prayer requests",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const submitPrayer = async (e) => {
    e.preventDefault();
    if (!requestText.trim()) {
      toast.error(
        language === "sw"
          ? "Andika ombi la maombi kwanza"
          : "Please enter your prayer request",
      );
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/prayers/", { request: requestText.trim() });
      setRequestText("");
      toast.success(
        language === "sw"
          ? "Ombi la maombi limetumwa kwa mchungaji"
          : "Prayer request sent to your pastor",
      );
      fetchRequests();
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.detail ||
          (language === "sw"
            ? "Imeshindikana kutuma ombi"
            : "Failed to submit prayer request"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRequest = async (id) => {
    if (
      !window.confirm(
        language === "sw"
          ? "Una uhakika unataka kufuta ombi hili?"
          : "Are you sure you want to delete this request?",
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      await api.delete(`/prayers/${id}/`);
      setRequests((prev) => prev.filter((item) => item.id !== id));
      toast.success(
        language === "sw"
          ? "Ombi limefutwa"
          : "Prayer request deleted",
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.detail ||
          (language === "sw"
            ? "Imeshindikana kufuta ombi"
            : "Failed to delete request"),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const statusLabel = (status) => {
    if (status === "answered") {
      return language === "sw" ? "Imejibiwa" : "Done";
    }
    if (status === "prayed") {
      return language === "sw" ? "Imeombewa" : "Prayed";
    }
    if (status === "closed") {
      return language === "sw" ? "Imefungwa" : "Closed";
    }
    return language === "sw" ? "Inasubiri" : "Pending";
  };

  const statusClass = (status) => {
    if (status === "answered") return "bg-green-100 text-green-800";
    if (status === "prayed") return "bg-blue-100 text-blue-800";
    if (status === "closed") return "bg-gray-100 text-gray-700";
    return "bg-yellow-100 text-yellow-800";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center space-x-2 mb-6">
        <FaPray className="text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Maombi ya Maombi" : "Prayer Requests"}
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <form onSubmit={submitPrayer} className="space-y-3">
          <textarea
            rows="4"
            className="input"
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            placeholder={
              language === "sw"
                ? "Andika ombi lako la maombi hapa"
                : "Write your prayer request here"
            }
          />
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting
              ? language === "sw"
                ? "Inatuma..."
                : "Submitting..."
              : language === "sw"
                ? "Tuma Ombi"
                : "Send Request"}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {language === "sw" ? "Historia ya Maombi" : "Request History"}
        </h2>
        <div className="space-y-3">
          {requests.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-gray-900 dark:text-white">{item.request}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                  {item.answer_notes && (
                    <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                      {language === "sw" ? "Ujumbe wa mchungaji" : "Pastor note"}: {item.answer_notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${statusClass(item.status)}`}
                  >
                    {statusLabel(item.status)}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteRequest(item.id)}
                    disabled={deletingId === item.id}
                    className="text-red-600 hover:text-red-800"
                    title={language === "sw" ? "Futa" : "Delete"}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === "sw"
                ? "Hakuna maombi ya maombi bado"
                : "No prayer requests yet"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrayerRequests;

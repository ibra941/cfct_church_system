import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaCheck, FaGlobe, FaLock, FaPray, FaTimes, FaTrash } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const PrayerRequests = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isLeader = user?.role === "local_leader";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [answeringId, setAnsweringId] = useState(null);
  const [requestText, setRequestText] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [requests, setRequests] = useState([]);
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [answerNotes, setAnswerNotes] = useState("");

  const t = (sw, en) => (language === "sw" ? sw : en);

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
        t("Imeshindikana kupata maombi", "Failed to load prayer requests"),
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
        t("Andika ombi la maombi kwanza", "Please enter your prayer request"),
      );
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/prayers/", {
        request: requestText.trim(),
        is_public: isPublic,
      });
      setRequestText("");
      setIsPublic(false);
      toast.success(
        isPublic
          ? t(
              "Ombi la maombi la umma limetumwa",
              "Public prayer request submitted",
            )
          : t(
              "Ombi la maombi limetumwa kwa mchungaji",
              "Private prayer request sent to your pastor",
            ),
      );
      fetchRequests();
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.detail ||
          t("Imeshindikana kutuma ombi", "Failed to submit prayer request"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRequest = async (id) => {
    if (
      !window.confirm(
        t(
          "Una uhakika unataka kufuta ombi hili?",
          "Are you sure you want to delete this request?",
        ),
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      await api.delete(`/prayers/${id}/`);
      setRequests((prev) => prev.filter((item) => item.id !== id));
      toast.success(t("Ombi limefutwa", "Prayer request deleted"));
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.detail ||
          t("Imeshindikana kufuta ombi", "Failed to delete request"),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const markAsAnswered = async (id) => {
    if (!answerNotes.trim()) {
      toast.error(
        t(
          "Andika ujumbe kabla ya kujibu ombi",
          "Please enter a message before marking as answered",
        ),
      );
      return;
    }

    setAnsweringId(id);
    try {
      await api.post(`/prayers/${id}/mark-done/`, {
        answer_notes: answerNotes,
      });
      toast.success(
        t("Ombi limejibiwa kwa mwanachama", "Prayer marked as answered"),
      );
      setShowAnswerForm(false);
      setAnswerNotes("");
      fetchRequests();
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.detail ||
          t("Imeshindikana kujibu ombi", "Failed to mark prayer as answered"),
      );
    } finally {
      setAnsweringId(id);
    }
  };

  const statusLabel = (status) => {
    if (status === "answered") return t("Imejibiwa", "Answered");
    if (status === "prayed") return t("Imeombewa", "Prayed");
    if (status === "closed") return t("Imefungwa", "Closed");
    return t("Inasubiri", "Pending");
  };

  const statusClass = (status) => {
    if (status === "answered") return "bg-green-100 text-green-800";
    if (status === "prayed") return "bg-blue-100 text-blue-800";
    if (status === "closed") return "bg-gray-100 text-gray-700";
    return "bg-yellow-100 text-yellow-800";
  };

  // Separate own requests from public church prayers (for members)
  const myRequests = requests.filter((r) => r.member === user?.id);
  const publicChurchPrayers = requests.filter(
    (r) => r.is_public && r.member !== user?.id,
  );
  // For leaders, pending prayers that need action
  const pendingPrayers = requests.filter((r) => r.status === "pending");

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <FaPray className="text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("Maombi", "Prayer Requests")}
        </h1>
      </div>

      {/* MEMBER SUBMISSION FORM - Only for members, not leaders */}
      {!isLeader && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {t("Tuma Ombi Jipya", "Submit New Request")}
          </h2>
          <form onSubmit={submitPrayer} className="space-y-3">
            <textarea
              rows="4"
              className="input"
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder={t(
                "Andika ombi lako la maombi hapa",
                "Write your prayer request here",
              )}
            />

            {/* Public / Private toggle */}
            <div className="flex items-center gap-4 flex-wrap">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition ${
                  !isPublic
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400"
                }`}
              >
                <FaLock size={12} />
                {t("Binafsi (kwa Mchungaji tu)", "Private (to Pastor only)")}
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition ${
                  isPublic
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-400"
                }`}
              >
                <FaGlobe size={12} />
                {t("Wazi (Wanachama wote)", "Public (All members)")}
              </button>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting
                ? t("Inatuma...", "Submitting...")
                : t("Tuma Ombi", "Send Request")}
            </button>
          </form>
        </div>
      )}

      {/* LEADER VIEW - All prayers to manage */}
      {isLeader && (
        <>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t(
                "Unaona maombi yote kutoka kwa wanachama wa kanisa lako. Bonyeza 'Jibu' kujibu ombi.",
                "You can see all prayer requests from your church members. Click 'Answer' to respond to a prayer.",
              )}
            </p>
          </div>

          {/* Pending Prayers - Needing Action */}
          {pendingPrayers.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t("Maombi Yanayosubiri", "Pending Prayer Requests")} (
                {pendingPrayers.length})
              </h2>
              <div className="space-y-4">
                {pendingPrayers.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {item.member_name}
                          </span>
                          {item.is_public ? (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <FaGlobe size={10} /> {t("Wazi", "Public")}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <FaLock size={10} /> {t("Binafsi", "Private")}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-900 dark:text-white mb-1">
                          {item.request}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAnswerForm(true);
                            setAnsweringId(item.id);
                            setAnswerNotes("");
                          }}
                          className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                          title={t("Jibu ombi", "Answer prayer")}
                        >
                          <FaCheck size={12} /> {t("Jibu", "Answer")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Answer Prayer Modal */}
          {showAnswerForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-green-300 dark:border-green-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("Jibu Ombi", "Answer Prayer")}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAnswerForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              <textarea
                rows="4"
                className="input mb-4"
                value={answerNotes}
                onChange={(e) => setAnswerNotes(e.target.value)}
                placeholder={t(
                  "Andika ujumbe au maelezo ya kujibu ombi hili",
                  "Enter your response or prayer update",
                )}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => markAsAnswered(answeringId)}
                  disabled={answeringId !== null}
                  className="btn-primary"
                >
                  {answeringId !== null ? t("Jinajiabu...", "Answering...") : t("Jibu Ombi", "Answer Prayer")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnswerForm(false)}
                  className="btn-secondary"
                >
                  {t("Ghairi", "Cancel")}
                </button>
              </div>
            </div>
          )}

          {/* All Prayers List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("Maombi Yote ya Kanisa", "All Church Prayer Requests")}
            </h2>
            <div className="space-y-3">
              {requests.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 ${
                    item.status === "answered"
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {item.member_name}
                        </span>
                        {item.is_public ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <FaGlobe size={10} /> {t("Wazi", "Public")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <FaLock size={10} /> {t("Binafsi", "Private")}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900 dark:text-white">
                        {item.request}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                      {item.answer_notes && (
                        <p className="text-xs text-green-700 dark:text-green-400 mt-2 border-t border-green-200 dark:border-green-700 pt-2">
                          <span className="font-semibold">
                            {t("Jibu la Mchungaji", "Pastor Response")}:
                          </span>{" "}
                          {item.answer_notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${statusClass(item.status)}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {requests.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("Hakuna maombi bado", "No prayer requests yet")}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* MEMBER VIEW - My requests and public church prayers */}
      {!isLeader && (
        <>
          {/* My Requests */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("Maombi Yangu", "My Requests")}
            </h2>
            <div className="space-y-3">
              {myRequests.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {item.is_public ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <FaGlobe size={10} /> {t("Wazi", "Public")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <FaLock size={10} /> {t("Binafsi", "Private")}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900 dark:text-white">
                        {item.request}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                      {item.answer_notes && (
                        <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                          {t("Ujumbe wa mchungaji", "Pastor note")}:{" "}
                          {item.answer_notes}
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
                        title={t("Futa", "Delete")}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {myRequests.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("Hujatuma maombi bado", "No prayer requests submitted yet")}
                </p>
              )}
            </div>
          </div>

          {/* Public Church Prayers */}
          {publicChurchPrayers.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <FaGlobe className="inline mr-2 text-green-500" />
                {t("Maombi ya Wazi ya Kanisa", "Public Church Prayer Requests")}
              </h2>
              <div className="space-y-3">
                {publicChurchPrayers.map((item) => (
                  <div
                    key={item.id}
                    className="border border-green-100 dark:border-green-900 rounded-lg p-4 bg-green-50 dark:bg-green-900/20"
                  >
                    <p className="text-gray-900 dark:text-white">{item.request}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.member_name || t("Mwanachama", "Member")} &middot;{" "}
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PrayerRequests;

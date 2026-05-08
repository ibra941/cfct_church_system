import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaChurch,
  FaPhone,
  FaUserTie,
} from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../services/api";

const MemberDashboard = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { id: memberId } = useParams();
  // When memberId is set, a leader is viewing another member (read-only)
  const isLeaderView = !!memberId;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    member: null,
    church: null,
    pastor: null,
    departments: [],
    events: { upcoming: [], past: [] },
    prayers: [],
    offerings: [],
    offering_summary: {},
    activities: [],
  });
  const [transferRequests, setTransferRequests] = useState([]);
  const [transferChurches, setTransferChurches] = useState([]);
  const [transferForm, setTransferForm] = useState({
    to_church: "",
    transfer_reason: "",
    recommendation_letter: null,
  });
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const url = memberId
        ? `/dashboard/member/?user_id=${memberId}`
        : "/dashboard/member/";
      const response = await api.get(url);
      const payload = response.data || {};
      setData(payload);
    } catch (error) {
      toast.error(
        language === "sw"
          ? "Imeshindikana kupata dashibodi ya mwanachama"
          : "Failed to load member dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [memberId]);

  useEffect(() => {
    if (!isLeaderView) {
      fetchTransferData();
    }
  }, [isLeaderView]);

  const normalizeList = (response) => {
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.results)) return response.data.results;
    return [];
  };

  const fetchTransferData = async () => {
    try {
      const [transfersResponse, churchesResponse] = await Promise.all([
        api.get("/transfers/"),
        api.get("/locals/"),
      ]);

      setTransferRequests(normalizeList(transfersResponse));
      setTransferChurches(normalizeList(churchesResponse));
    } catch (error) {
      console.error("Error loading transfer data:", error);
    }
  };

  const submitTransferRequest = async () => {
    if (!transferForm.to_church || !transferForm.transfer_reason.trim()) {
      toast.error(
        language === "sw"
          ? "Kanisa lengwa na sababu ya uhamisho vinahitajika"
          : "Destination church and transfer reason are required",
      );
      return;
    }

    setSubmittingTransfer(true);
    try {
      const payload = new FormData();
      payload.append("to_church", transferForm.to_church);
      payload.append("transfer_reason", transferForm.transfer_reason.trim());
      if (transferForm.recommendation_letter) {
        payload.append(
          "recommendation_letter",
          transferForm.recommendation_letter,
        );
      }

      await api.post("/transfers/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        language === "sw"
          ? "Ombi la uhamisho limetumwa kwa mchungaji"
          : "Transfer request submitted to your pastor",
      );

      setTransferForm({
        to_church: "",
        transfer_reason: "",
        recommendation_letter: null,
      });
      fetchTransferData();
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kutuma ombi la uhamisho"
            : "Failed to submit transfer request"),
      );
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const registerEvent = async (eventId) => {
    try {
      await api.post(`/events/${eventId}/register/`);
      toast.success(
        language === "sw"
          ? "Umesajiliwa kwenye tukio"
          : "Event registration successful",
      );
      fetchDashboard();
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kusajili tukio"
            : "Failed to register event"),
      );
    }
  };

  const upcomingEvents = useMemo(() => data?.events?.upcoming || [], [data]);
  const pastEvents = useMemo(() => data?.events?.past || [], [data]);
  const activities = useMemo(() => data?.activities || [], [data]);

  const backDashboardPath =
    user?.role === "local_leader"
      ? "/dashboard/church"
      : user?.role === "district_leader"
        ? "/dashboard/district"
        : user?.role === "regional_leader"
          ? "/dashboard/regional"
          : user?.role === "zone_leader"
            ? "/dashboard/zone"
            : user?.role === "national_leader"
              ? "/dashboard/national"
              : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        {isLeaderView ? (
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 mb-3"
          >
            <FaArrowLeft className="mr-2" />
            {language === "sw" ? "Rudi Nyuma" : "Go Back"}
          </button>
        ) : (
          backDashboardPath && (
            <Link
              to={backDashboardPath}
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 mb-3"
            >
              <FaArrowLeft className="mr-2" />
              {language === "sw"
                ? "Rudi Dashibodi Kuu"
                : "Back to Leader Dashboard"}
            </Link>
          )
        )}
        {isLeaderView && (
          <div className="mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
            {language === "sw"
              ? `Unaangalia dashibodi ya: ${data?.member?.full_name || data?.member?.username || "Mwanachama"}`
              : `Viewing dashboard for: ${data?.member?.full_name || data?.member?.username || "Member"}`}
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Dashibodi ya Mwanachama" : "Member Dashboard"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {language === "sw" ? "Kanisa" : "Church"}: {data?.church?.name || "-"}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FaUserTie className="text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {language === "sw" ? "Taarifa za Mchungaji" : "Pastor Information"}
          </h2>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">
              {language === "sw" ? "Kanisa" : "Church"}:
            </span>{" "}
            {data?.church?.name || "-"}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">
              {language === "sw" ? "Mchungaji" : "Pastor"}:
            </span>{" "}
            {data?.pastor?.name || "-"}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Email:</span>{" "}
            {data?.pastor?.email || "-"}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
            <FaPhone className="mr-2" />
            <span className="font-semibold mr-1">
              {language === "sw" ? "Simu" : "Phone"}:
            </span>
            {data?.pastor?.phone || "-"}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FaCalendarAlt className="text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {language === "sw" ? "Matukio ya Kanisa" : "Church Events"}
          </h2>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          {language === "sw" ? "Yanayokuja" : "Upcoming"}
        </h3>
        <div className="grid md:grid-cols-2 gap-3 mb-5">
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
            >
              <p className="font-medium text-gray-900 dark:text-white">
                {event.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(event.start_date).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                {event.description}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {event.venue || "-"}
                </span>
                {!isLeaderView && (
                  <button
                    onClick={() => registerEvent(event.id)}
                    disabled={event.registration_status === "registered"}
                    className="btn-primary text-sm"
                  >
                    {event.registration_status === "registered"
                      ? language === "sw"
                        ? "Umesajiliwa"
                        : "Registered"
                      : language === "sw"
                        ? "Jisajili"
                        : "Register"}
                  </button>
                )}
              </div>
              {event.images?.[0] && (
                <img
                  src={event.images[0]}
                  alt={event.title}
                  className="w-full h-32 object-cover rounded mt-3"
                />
              )}
            </div>
          ))}
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          {language === "sw" ? "Yaliyopita" : "Past"}
        </h3>
        <div className="space-y-2">
          {pastEvents.map((event) => (
            <div
              key={event.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
            >
              <p className="font-medium text-gray-900 dark:text-white">
                {event.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(event.start_date).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {language === "sw" ? "Rekodi ya Shughuli" : "Activity Record"}
        </h2>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {activities.map((activity, index) => (
            <div
              key={`${activity.type}-${activity.created_at}-${index}`}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
            >
              <p className="font-medium text-gray-900 dark:text-white">
                {activity.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {activity.description}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(activity.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === "sw"
                ? "Hakuna rekodi bado"
                : "No activity records yet"}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {language === "sw" ? "Rekodi za Matoleo" : "Offering Records"}
        </h2>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {(data?.offerings || []).map((offering) => (
            <div
              key={offering.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
            >
              <p className="font-medium text-gray-900 dark:text-white">
                {offering.offering_type_display} - {offering.amount}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {offering.payment_method} | {offering.receipt_no || "-"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(offering.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          {(data?.offerings || []).length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === "sw"
                ? "Hakuna matoleo yaliyorekodiwa"
                : "No offerings recorded yet"}
            </p>
          )}
        </div>
      </div>

      {!isLeaderView && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {language === "sw" ? "Maombi ya Uhamisho" : "Transfer Requests"}
          </h2>

          <div className="grid md:grid-cols-2 gap-3">
            <select
              className="input"
              value={transferForm.to_church}
              onChange={(e) =>
                setTransferForm((prev) => ({
                  ...prev,
                  to_church: e.target.value,
                }))
              }
            >
              <option value="">
                {language === "sw"
                  ? "Chagua Kanisa Lengwa"
                  : "Select Destination Church"}
              </option>
              {transferChurches.map((church) => (
                <option key={church.id} value={church.id}>
                  {church.name}
                </option>
              ))}
            </select>

            <input
              type="file"
              className="input"
              onChange={(e) =>
                setTransferForm((prev) => ({
                  ...prev,
                  recommendation_letter: e.target.files?.[0] || null,
                }))
              }
            />
          </div>

          <textarea
            className="input"
            rows="3"
            value={transferForm.transfer_reason}
            onChange={(e) =>
              setTransferForm((prev) => ({
                ...prev,
                transfer_reason: e.target.value,
              }))
            }
            placeholder={
              language === "sw"
                ? "Eleza sababu ya kuomba uhamisho"
                : "Explain your transfer request reason"
            }
          />

          <button
            type="button"
            className="btn-primary"
            onClick={submitTransferRequest}
            disabled={submittingTransfer}
          >
            {language === "sw"
              ? "Tuma Ombi la Uhamisho"
              : "Submit Transfer Request"}
          </button>

          <div className="space-y-2 pt-2">
            {transferRequests.map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {request.from_church_name}{" "}
                  {language === "sw" ? "kwenda" : "to"} {request.to_church_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(request.created_at).toLocaleString()} |{" "}
                  {request.status}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  {request.transfer_reason}
                </p>
                {request.recommendation_letter_url && (
                  <a
                    href={request.recommendation_letter_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block"
                  >
                    {language === "sw"
                      ? "Fungua Barua ya Uhamisho"
                      : "Open Transfer Letter"}
                  </a>
                )}
                {request.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {request.notes}
                  </p>
                )}
              </div>
            ))}

            {transferRequests.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === "sw"
                  ? "Hakuna maombi ya uhamisho kwa sasa"
                  : "No transfer requests yet"}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex items-center space-x-3">
        <FaChurch className="text-primary-600" />
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {language === "sw"
            ? "Maudhui yote yamechujwa kulingana na kanisa ulilochagua wakati wa usajili."
            : "All dashboard information is filtered by the church selected during registration."}
        </p>
      </div>
    </div>
  );
};

export default MemberDashboard;

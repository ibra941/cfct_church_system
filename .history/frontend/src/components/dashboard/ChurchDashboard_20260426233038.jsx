import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaCheck,
  FaChurch,
  FaDonate,
  FaEye,
  FaPray,
  FaTrash,
  FaUser,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../services/api";
import {
  extractListData,
  normalizeMonthlyChartData,
} from "../../utils/apiTransforms";

const ChurchDashboard = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: churchId } = useParams();
  const resolveChurchId = (churchValue) => {
    if (!churchValue) return null;
    if (typeof churchValue === "object") {
      return churchValue.id || churchValue.pk || null;
    }
    return churchValue;
  };
  const effectiveChurchId = churchId || resolveChurchId(user?.church);

  const [churchInfo, setChurchInfo] = useState(null);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalOfferings: 0,
    totalChurches: 1,
    totalEvents: 0,
    pendingApprovals: 0,
    monthlyGrowth: 0,
    weeklyAttendance: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [recentMembers, setRecentMembers] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [pendingDepartmentRequests, setPendingDepartmentRequests] = useState(
    [],
  );
  const [pendingPrayerRequests, setPendingPrayerRequests] = useState([]);
  const [pendingTransferRequests, setPendingTransferRequests] = useState([]);
  const [reviewNotesByRequest, setReviewNotesByRequest] = useState({});
  const [reviewingRequestId, setReviewingRequestId] = useState(null);
  const [prayerAnswerById, setPrayerAnswerById] = useState({});
  const [processingPrayerId, setProcessingPrayerId] = useState(null);
  const [transferReasonById, setTransferReasonById] = useState({});
  const [processingTransferId, setProcessingTransferId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (effectiveChurchId) {
      fetchChurchData();
    }
  }, [effectiveChurchId]);

  const fetchChurchData = async () => {
    setLoading(true);
    try {
      // Fetch church info
      const churchResponse = await api.get(`/churches/${effectiveChurchId}/`);
      setChurchInfo(churchResponse.data);

      // Fetch church-scoped stats
      const statsResponse = await api.get(
        churchId
          ? `/dashboard/stats/?church_id=${effectiveChurchId}`
          : "/dashboard/stats/",
      );
      setStats({
        totalMembers: statsResponse.data.total_members || 0,
        totalOfferings: statsResponse.data.total_offerings || 0,
        totalChurches: statsResponse.data.total_churches || 1,
        totalEvents: statsResponse.data.total_events || 0,
        pendingApprovals: statsResponse.data.pending_approvals || 0,
        monthlyGrowth: statsResponse.data.monthly_growth || 0,
        weeklyAttendance: statsResponse.data.weekly_attendance || 0,
      });

      // Fetch monthly chart data
      const monthlyResponse = await api.get("/finance/monthly-summary/");
      const monthlyData = normalizeMonthlyChartData(monthlyResponse.data);
      setChartData(
        monthlyData.length > 0 ? monthlyData : generateMonthlyData(),
      );

      // Fetch recent members
      const membersResponse = await api.get("/members/?limit=5");
      const membersData = extractListData(membersResponse.data);
      setRecentMembers(Array.isArray(membersData) ? membersData : []);

      // Fetch upcoming events
      const eventsResponse = await api.get("/events/?upcoming=true&limit=5");
      const eventsData = extractListData(eventsResponse.data);
      setRecentEvents(Array.isArray(eventsData) ? eventsData : []);

      // Fetch pending department join requests for leader approval
      if (user?.role === "local_leader") {
        const joinRequestsResponse = await api.get(
          "/departments/join-requests/pending/",
        );
        const joinRequestsData = extractListData(joinRequestsResponse.data);
        setPendingDepartmentRequests(
          Array.isArray(joinRequestsData) ? joinRequestsData : [],
        );

        const prayerRequestsResponse = await api.get(
          "/prayers/?status=pending",
        );
        const prayerRequestsData = extractListData(prayerRequestsResponse.data);
        setPendingPrayerRequests(
          Array.isArray(prayerRequestsData) ? prayerRequestsData : [],
        );

        const transferRequestsResponse = await api.get(
          "/transfers/pending-review/",
        );
        const transferRequestsData = extractListData(
          transferRequestsResponse.data,
        );
        setPendingTransferRequests(
          Array.isArray(transferRequestsData) ? transferRequestsData : [],
        );
      } else {
        setPendingDepartmentRequests([]);
        setPendingPrayerRequests([]);
        setPendingTransferRequests([]);
      }
    } catch (error) {
      console.error("Error fetching church data:", error);
      setChartData(generateMonthlyData());
      setRecentMembers([]);
      setRecentEvents([]);
      setPendingDepartmentRequests([]);
      setPendingPrayerRequests([]);
      setPendingTransferRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const approveTransferRequest = async (transferId) => {
    setProcessingTransferId(transferId);
    try {
      await api.post(`/transfers/${transferId}/approve/`, {
        message: transferReasonById[transferId] || "",
      });

      setPendingTransferRequests((prev) =>
        prev.filter((request) => request.id !== transferId),
      );
      setTransferReasonById((prev) => {
        const next = { ...prev };
        delete next[transferId];
        return next;
      });

      toast.success(
        language === "sw" ? "Uhamisho umeidhinishwa" : "Transfer approved",
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kuidhinisha uhamisho"
            : "Failed to approve transfer"),
      );
    } finally {
      setProcessingTransferId(null);
    }
  };

  const rejectTransferRequest = async (transferId) => {
    const reason = (transferReasonById[transferId] || "").trim();
    if (!reason) {
      toast.error(
        language === "sw"
          ? "Sababu ya kukataa inahitajika"
          : "Rejection reason is required",
      );
      return;
    }

    setProcessingTransferId(transferId);
    try {
      await api.post(`/transfers/${transferId}/reject/`, { reason });

      setPendingTransferRequests((prev) =>
        prev.filter((request) => request.id !== transferId),
      );
      setTransferReasonById((prev) => {
        const next = { ...prev };
        delete next[transferId];
        return next;
      });

      toast.success(
        language === "sw" ? "Uhamisho umekataliwa" : "Transfer rejected",
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kukataa uhamisho"
            : "Failed to reject transfer"),
      );
    } finally {
      setProcessingTransferId(null);
    }
  };

  const markPrayerAsDone = async (prayerId) => {
    setProcessingPrayerId(prayerId);
    try {
      await api.post(`/prayers/${prayerId}/mark-done/`, {
        answer_notes: prayerAnswerById[prayerId] || "",
      });

      setPendingPrayerRequests((prev) =>
        prev.filter((request) => request.id !== prayerId),
      );
      setPrayerAnswerById((prev) => {
        const next = { ...prev };
        delete next[prayerId];
        return next;
      });

      toast.success(
        language === "sw" ? "Ombi limekamilishwa" : "Prayer marked as done",
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kusasisha ombi"
            : "Failed to update prayer request"),
      );
    } finally {
      setProcessingPrayerId(null);
    }
  };

  const deletePrayerRequest = async (prayerId) => {
    if (
      !window.confirm(
        language === "sw"
          ? "Una uhakika unataka kufuta ombi hili la maombi?"
          : "Are you sure you want to delete this prayer request?",
      )
    ) {
      return;
    }

    setProcessingPrayerId(prayerId);
    try {
      await api.delete(`/prayers/${prayerId}/`);
      setPendingPrayerRequests((prev) =>
        prev.filter((request) => request.id !== prayerId),
      );
      toast.success(
        language === "sw" ? "Ombi limefutwa" : "Prayer request deleted",
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kufuta ombi"
            : "Failed to delete prayer request"),
      );
    } finally {
      setProcessingPrayerId(null);
    }
  };

  const reviewDepartmentRequest = async (requestId, actionType) => {
    if (actionType === "reject" && !reviewNotesByRequest[requestId]?.trim()) {
      toast.error(
        language === "sw"
          ? "Andika sababu ya kukataa ombi"
          : "Please provide a rejection reason",
      );
      return;
    }

    setReviewingRequestId(requestId);
    try {
      const endpoint =
        actionType === "approve"
          ? `/departments/join-requests/${requestId}/approve/`
          : `/departments/join-requests/${requestId}/reject/`;

      await api.post(endpoint, {
        review_notes: reviewNotesByRequest[requestId] || "",
      });

      setPendingDepartmentRequests((prev) =>
        prev.filter((request) => request.id !== requestId),
      );
      setReviewNotesByRequest((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });

      toast.success(
        actionType === "approve"
          ? language === "sw"
            ? "Ombi limekubaliwa"
            : "Request approved"
          : language === "sw"
            ? "Ombi limekataliwa"
            : "Request rejected",
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kukamilisha ombi"
            : "Failed to process request"),
      );
    } finally {
      setReviewingRequestId(null);
    }
  };

  const generateMonthlyData = () => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return months.map((month) => ({
      month,
      offerings: Math.floor(Math.random() * 150000) + 50000,
      attendance: Math.floor(Math.random() * 200) + 50,
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: "TZS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      title: language === "sw" ? "Wanachama" : "Members",
      value: stats.totalMembers,
      icon: <FaUsers />,
      color: "bg-blue-500",
      change: `+${stats.monthlyGrowth}%`,
      trend: "up",
    },
    {
      title: language === "sw" ? "Matoleo" : "Offerings",
      value: formatCurrency(stats.totalOfferings),
      icon: <FaDonate />,
      color: "bg-green-500",
      change: "+4%",
      trend: "up",
    },
    {
      title: language === "sw" ? "Matukio" : "Events",
      value: stats.totalEvents,
      icon: <FaCalendarAlt />,
      color: "bg-yellow-500",
      change: "+1",
      trend: "up",
    },
    {
      title: language === "sw" ? "Mahudhurio" : "Attendance",
      value: stats.weeklyAttendance,
      icon: <FaUsers />,
      color: "bg-orange-500",
      change: "+3%",
      trend: "up",
    },
  ];

  if (!effectiveChurchId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          {language === "sw"
            ? "Hakuna kanisa lililochaguliwa"
            : "No church selected"}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Title and Welcome - at the very top */}
      <div className="mb-6">
        {churchId && (
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-primary-600 hover:text-primary-700 mb-2 flex items-center space-x-1"
          >
            <span>←</span>
            <span>{language === "sw" ? "Rudi Nyuma" : "Go Back"}</span>
          </button>
        )}
        <div className="flex items-center space-x-3">
          <div className="bg-primary-100 dark:bg-primary-900/40 p-3 rounded-full">
            <FaChurch className="text-2xl text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {churchInfo?.name ||
                (language === "sw"
                  ? "Dashibodi ya Kanisa"
                  : "Church Dashboard")}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {churchInfo?.location
                ? `${language === "sw" ? "Mahali" : "Location"}: ${churchInfo.location}`
                : language === "sw"
                  ? "Taarifa za kanisa hili"
                  : "All information for this church"}
            </p>
          </div>
        </div>
        {user?.role === "local_leader" && (
          <div className="mt-3">
            <Link
              to="/dashboard/member"
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
            >
              <FaUser className="mr-2" />
              {language === "sw"
                ? "Fungua Dashibodi ya Mwanachama"
                : "Open Member Dashboard"}
            </Link>
          </div>
        )}
      </div>

      {/* Pending Approvals Alert */}
      {stats.pendingApprovals > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <FaEye className="text-yellow-500 flex-shrink-0" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {language === "sw"
                  ? `Kuna ${stats.pendingApprovals} maombi ya wanachama yanayosubiri idhini.`
                  : `There are ${stats.pendingApprovals} pending member registration approvals.`}
              </p>
            </div>
            <div className="ml-auto">
              <Link
                to="/approvals"
                className="text-sm text-yellow-600 hover:text-yellow-700 dark:text-yellow-400"
              >
                {language === "sw" ? "Tazama" : "View"} →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {card.value}
                </p>
                <div className="flex items-center mt-2">
                  {card.trend === "up" ? (
                    <FaArrowUp className="text-green-500 text-xs mr-1" />
                  ) : (
                    <FaArrowDown className="text-red-500 text-xs mr-1" />
                  )}
                  <span
                    className={`text-xs ${card.trend === "up" ? "text-green-500" : "text-red-500"}`}
                  >
                    {card.change}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">
                    {language === "sw"
                      ? "kutoka mwezi uliopita"
                      : "from last month"}
                  </span>
                </div>
              </div>
              <div className={`${card.color} p-3 rounded-full text-white`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Monthly Offerings Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Matoleo ya Kila Mwezi" : "Monthly Offerings"}
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="offerings"
                stroke="#3b82f6"
                name={language === "sw" ? "Matoleo" : "Offerings"}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Attendance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw"
              ? "Mahudhurio ya Kila Mwezi"
              : "Monthly Attendance"}
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="attendance"
                fill="#10b981"
                name={language === "sw" ? "Mahudhurio" : "Attendance"}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Members */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === "sw" ? "Wanachama Wapya" : "Recent Members"}
            </h2>
            <Link
              to="/members"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {language === "sw" ? "Tazama Zote" : "View All"} →
            </Link>
          </div>
          <div className="space-y-3">
            {recentMembers.slice(0, 5).map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-2 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-2 transition"
                onClick={() => navigate(`/dashboard/member/${member.id}`)}
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {member.full_name || member.username}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {member.email}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {!member.is_approved && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      {language === "sw" ? "Inasubiri" : "Pending"}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(member.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-primary-600">→</span>
                </div>
              </div>
            ))}
            {recentMembers.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                {language === "sw"
                  ? "Hakuna wanachama wapya"
                  : "No recent members"}
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === "sw" ? "Matukio Yajayo" : "Upcoming Events"}
            </h2>
            <Link
              to="/events"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {language === "sw" ? "Tazama Zote" : "View All"} →
            </Link>
          </div>
          <div className="space-y-3">
            {recentEvents.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between py-2 border-b dark:border-gray-700"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {event.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {event.description?.substring(0, 50)}...
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(event.start_date).toLocaleDateString()}
                </span>
              </div>
            ))}
            {recentEvents.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                {language === "sw"
                  ? "Hakuna matukio yajayo"
                  : "No upcoming events"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/register"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center hover:shadow-lg transition"
        >
          <FaUserPlus className="text-2xl text-primary-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === "sw" ? "Ongeza Mwanachama" : "Add Member"}
          </p>
        </Link>
        <Link
          to="/offerings/add"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center hover:shadow-lg transition"
        >
          <FaDonate className="text-2xl text-green-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === "sw" ? "Rekodi Mchango" : "Record Offering"}
          </p>
        </Link>
        <Link
          to="/events/add"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center hover:shadow-lg transition"
        >
          <FaCalendarAlt className="text-2xl text-yellow-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === "sw" ? "Panga Tukio" : "Plan Event"}
          </p>
        </Link>
        {user?.role === "local_leader" && (
          <Link
            to="/dashboard/member"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center hover:shadow-lg transition"
          >
            <FaUser className="text-2xl text-primary-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {language === "sw"
                ? "Dashibodi ya Mwanachama"
                : "Member Dashboard"}
            </p>
          </Link>
        )}
      </div>

      {user?.role === "local_leader" && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === "sw"
                ? "Maombi ya Kujiunga na Idara"
                : "Department Join Requests"}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {pendingDepartmentRequests.length}
              {language === "sw" ? " yanasubiri" : " pending"}
            </span>
          </div>

          <div className="space-y-4">
            {pendingDepartmentRequests.map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <p className="font-semibold text-gray-900 dark:text-white">
                  {request.member_name ||
                    (language === "sw" ? "Mwanachama" : "Member")}
                  {language === "sw" ? "Idara" : "Department"}:{" "}
                  {request.department_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(request.requested_at).toLocaleString()}
                </p>

                <textarea
                  className="input mt-3"
                  rows="2"
                  value={reviewNotesByRequest[request.id] || ""}
                  onChange={(e) =>
                    setReviewNotesByRequest((prev) => ({
                      ...prev,
                      [request.id]: e.target.value,
                    }))
                  }
                  placeholder={
                    language === "sw"
                      ? "Andika maelezo (inahitajika ukikataa)"
                      : "Add notes (required for rejection)"
                  }
                />

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      reviewDepartmentRequest(request.id, "approve")
                    }
                    disabled={reviewingRequestId === request.id}
                    className="btn-primary"
                  >
                    {language === "sw" ? "Kubali" : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      reviewDepartmentRequest(request.id, "reject")
                    }
                    disabled={reviewingRequestId === request.id}
                    className="btn-secondary"
                  >
                    {language === "sw" ? "Kataa" : "Reject"}
                  </button>
                </div>
              </div>
            ))}

            {pendingDepartmentRequests.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === "sw"
                  ? "Hakuna maombi ya idara yanayosubiri"
                  : "No pending department requests"}
              </p>
            )}
          </div>
        </div>
      )}

      {user?.role === "local_leader" && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === "sw"
                ? "Maombi ya Uhamisho Yanayosubiri"
                : "Pending Transfer Requests"}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {pendingTransferRequests.length}
              {language === "sw" ? " yanasubiri" : " pending"}
            </span>
          </div>

          <div className="space-y-4">
            {pendingTransferRequests.map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <p className="font-semibold text-gray-900 dark:text-white">
                  {request.member_name ||
                    (language === "sw" ? "Mwanachama" : "Member")}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {request.from_church_name}{" "}
                  {language === "sw" ? "kwenda" : "to"} {request.to_church_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {request.transfer_reason}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(request.created_at).toLocaleString()}
                </p>

                {request.recommendation_letter_url ? (
                  <a
                    href={request.recommendation_letter_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block"
                  >
                    {language === "sw"
                      ? "Soma Barua ya Uhamisho"
                      : "Read Transfer Letter"}
                  </a>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {language === "sw"
                      ? "Hakuna barua iliyoambatishwa"
                      : "No transfer letter attached"}
                  </p>
                )}

                <textarea
                  className="input mt-3"
                  rows="2"
                  value={transferReasonById[request.id] || ""}
                  onChange={(e) =>
                    setTransferReasonById((prev) => ({
                      ...prev,
                      [request.id]: e.target.value,
                    }))
                  }
                  placeholder={
                    language === "sw"
                      ? "Andika ujumbe wa idhini au sababu ya kukataa"
                      : "Add approval message or rejection reason"
                  }
                />

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => approveTransferRequest(request.id)}
                    disabled={processingTransferId === request.id}
                    className="btn-primary"
                  >
                    {language === "sw" ? "Kubali" : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectTransferRequest(request.id)}
                    disabled={processingTransferId === request.id}
                    className="btn-secondary"
                  >
                    {language === "sw" ? "Kataa" : "Reject"}
                  </button>
                </div>
              </div>
            ))}

            {pendingTransferRequests.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === "sw"
                  ? "Hakuna maombi ya uhamisho yanayosubiri"
                  : "No pending transfer requests"}
              </p>
            )}
          </div>
        </div>
      )}

      {user?.role === "local_leader" && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
              <FaPray className="text-primary-600" />
              <span>
                {language === "sw"
                  ? "Maombi ya Maombi Yanayosubiri"
                  : "Pending Prayer Requests"}
              </span>
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {pendingPrayerRequests.length}
              {language === "sw" ? " yanasubiri" : " pending"}
            </span>
          </div>

          <div className="space-y-4">
            {pendingPrayerRequests.map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <p className="font-semibold text-gray-900 dark:text-white">
                  {request.member_name ||
                    (language === "sw" ? "Mwanachama" : "Member")}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {request.request}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(request.created_at).toLocaleString()}
                </p>
                {(request.member_phone || request.member_email) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {request.member_phone || "-"}
                    {request.member_email ? ` | ${request.member_email}` : ""}
                  </p>
                )}

                <textarea
                  className="input mt-3"
                  rows="2"
                  value={prayerAnswerById[request.id] || ""}
                  onChange={(e) =>
                    setPrayerAnswerById((prev) => ({
                      ...prev,
                      [request.id]: e.target.value,
                    }))
                  }
                  placeholder={
                    language === "sw"
                      ? "Andika maelezo ya kujibu (hiari)"
                      : "Add answer notes (optional)"
                  }
                />

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => markPrayerAsDone(request.id)}
                    disabled={processingPrayerId === request.id}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <FaCheck />
                    <span>
                      {language === "sw" ? "Weka Imekamilika" : "Mark Done"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePrayerRequest(request.id)}
                    disabled={processingPrayerId === request.id}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <FaTrash />
                    <span>{language === "sw" ? "Futa" : "Delete"}</span>
                  </button>
                </div>
              </div>
            ))}

            {pendingPrayerRequests.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === "sw"
                  ? "Hakuna maombi ya maombi yanayosubiri"
                  : "No pending prayer requests"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChurchDashboard;

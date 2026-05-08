import { useEffect, useState } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaBell,
  FaCalendarAlt,
  FaChartBar,
  FaChurch,
  FaDonate,
  FaDownload,
  FaExchangeAlt,
  FaEye,
  FaPaperPlane,
  FaUserCog,
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
import DashboardCards from "./DashboardCards";

const DistrictDashboard = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: districtId } = useParams();
  const [districtName, setDistrictName] = useState("");
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalOfferings: 0,
    totalChurches: 0,
    totalEvents: 0,
    totalLocals: 0,
    pendingApprovals: 0,
    monthlyGrowth: 0,
    weeklyAttendance: 0,
  });
  const [localChurchData, setLocalChurchData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [recentMembers, setRecentMembers] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [churchComparison, setChurchComparison] = useState([]);
  const [transferStats, setTransferStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [pastorCandidates, setPastorCandidates] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignChurch, setAssignChurch] = useState(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignMsg, setAssignMsg] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    message: "",
  });
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: "", message: "" });
  const [resourceMsg, setResourceMsg] = useState("");
  const [resourceLoading, setResourceLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const churchesListLink = districtId
    ? `/churches?scope=district&district_id=${districtId}`
    : "/churches?scope=district";

  useEffect(() => {
    fetchDashboardData();
  }, [districtId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stats - scoped to this district if drilling down
      const statsUrl = districtId
        ? `/dashboard/stats/?church_id=${districtId}`
        : "/dashboard/stats/";
      const statsResponse = await api.get(statsUrl);
      setStats({
        totalMembers: statsResponse.data.total_members || 0,
        totalOfferings: statsResponse.data.total_offerings || 0,
        totalChurches: statsResponse.data.total_churches || 0,
        totalEvents: statsResponse.data.total_events || 0,
        totalLocals: statsResponse.data.locals || 0,
        pendingApprovals: statsResponse.data.pending_approvals || 0,
        monthlyGrowth: statsResponse.data.monthly_growth || 0,
        weeklyAttendance: statsResponse.data.weekly_attendance || 0,
      });

      // Fetch district name if drilling down
      if (districtId) {
        try {
          const districtResponse = await api.get(`/churches/${districtId}/`);
          setDistrictName(districtResponse.data.name || "");
        } catch (e) {
          console.error("Could not fetch district details", e);
        }
      }

      // Fetch local churches - scoped to this district if id provided
      const localsUrl = districtId
        ? `/locals/?parent_id=${districtId}`
        : "/locals/";
      const localsResponse = await api.get(localsUrl);
      const localsData = localsResponse.data.results || localsResponse.data;
      setLocalChurchData(Array.isArray(localsData) ? localsData : []);

      // Fetch monthly data
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

      // Fetch church comparison for district-wide report
      try {
        const comparisonUrl = districtId
          ? `/reports/church-comparison/?district_id=${districtId}`
          : "/reports/church-comparison/";
        const comparisonResponse = await api.get(comparisonUrl);
        setChurchComparison(comparisonResponse.data.churches || []);
      } catch (e) {
        setChurchComparison([]);
      }

      // Fetch transfer statistics in district scope
      try {
        const transferStatsUrl = districtId
          ? `/transfers/stats/?district_id=${districtId}`
          : "/transfers/stats/";
        const transferStatsResponse = await api.get(transferStatsUrl);
        setTransferStats(
          transferStatsResponse.data || {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
          },
        );
      } catch (e) {
        setTransferStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
      }

      // Fetch pastor assignment candidates
      try {
        const [membersResp, leadersResp] = await Promise.all([
          api.get("/members/?role=local_member&limit=200"),
          api.get("/members/?role=local_leader&limit=200"),
        ]);
        const members = extractListData(membersResp.data);
        const leaders = extractListData(leadersResp.data);
        const merged = [
          ...(Array.isArray(leaders) ? leaders : []),
          ...(Array.isArray(members) ? members : []),
        ];
        const uniqueMap = new Map();
        merged.forEach((u) => {
          if (u?.id && !uniqueMap.has(u.id)) {
            uniqueMap.set(u.id, u);
          }
        });
        setPastorCandidates(Array.from(uniqueMap.values()));
      } catch (e) {
        setPastorCandidates([]);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setStats({
        totalMembers: 0,
        totalOfferings: 0,
        totalChurches: 0,
        totalEvents: 0,
        totalLocals: 0,
        pendingApprovals: 0,
        monthlyGrowth: 0,
        weeklyAttendance: 0,
      });
      setLocalChurchData([]);
      setChartData(generateMonthlyData());
      setRecentMembers([]);
      setRecentEvents([]);
      setChurchComparison([]);
      setTransferStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
      setPastorCandidates([]);
    } finally {
      setLoading(false);
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
      offerings: Math.floor(Math.random() * 200000) + 100000,
      attendance: Math.floor(Math.random() * 250) + 150,
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: "TZS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAssignPastor = async (e) => {
    e.preventDefault();
    if (!assignChurch?.id || !assignUserId) return;
    setAssignLoading(true);
    setAssignMsg("");
    try {
      const response = await api.post(
        `/churches/${assignChurch.id}/assign-pastor/`,
        {
          user_id: assignUserId,
        },
      );
      setAssignMsg(
        response.data.message ||
          (language === "sw" ? "Imefanikiwa" : "Success"),
      );
      await fetchDashboardData();
    } catch (err) {
      setAssignMsg(
        err.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kumteua mchungaji"
            : "Failed to assign pastor"),
      );
    } finally {
      setAssignLoading(false);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setBroadcastLoading(true);
    setBroadcastMsg("");
    try {
      const response = await api.post("/notifications/broadcast/", {
        ...broadcastForm,
        target_role: "local_leader",
      });
      setBroadcastMsg(
        response.data.message ||
          (language === "sw" ? "Ujumbe umetumwa" : "Broadcast sent"),
      );
      setBroadcastForm({ title: "", message: "" });
    } catch (err) {
      setBroadcastMsg(
        err.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kutuma ujumbe"
            : "Failed to send broadcast"),
      );
    } finally {
      setBroadcastLoading(false);
    }
  };

  const handleResourceRequest = async (e) => {
    e.preventDefault();
    setResourceLoading(true);
    setResourceMsg("");
    try {
      const response = await api.post("/resource-requests/", resourceForm);
      setResourceMsg(
        response.data.message ||
          (language === "sw" ? "Ombi limetumwa" : "Request sent"),
      );
      setResourceForm({ title: "", message: "" });
    } catch (err) {
      setResourceMsg(
        err.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kutuma ombi"
            : "Failed to send request"),
      );
    } finally {
      setResourceLoading(false);
    }
  };

  const handleExport = async (fileFormat) => {
    try {
      const response = await api.get(
        `/reports/export/district/?file_format=${fileFormat}`,
        {
          responseType: "blob",
        },
      );
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `district-report.${fileFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export failed", err);
    }
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
      title: language === "sw" ? "Makanisa" : "Churches",
      value: stats.totalChurches,
      icon: <FaChurch />,
      color: "bg-purple-500",
      subValue: `${stats.totalLocals} ${language === "sw" ? "Makanisa" : "Churches"}`,
      subLabel: true,
    },
    {
      title: language === "sw" ? "Mahudhurio" : "Attendance",
      value: stats.weeklyAttendance,
      icon: <FaUsers />,
      color: "bg-orange-500",
      change: "+5%",
      trend: "up",
    },
  ];

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
        {districtId && (
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-primary-600 hover:text-primary-700 mb-2 flex items-center space-x-1"
          >
            <span>←</span>
            <span>{language === "sw" ? "Rudi Nyuma" : "Go Back"}</span>
          </button>
        )}
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          {districtName
            ? districtName
            : language === "sw"
              ? "Dashibodi ya Wilaya"
              : "District Dashboard"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {districtId
            ? language === "sw"
              ? `Taarifa za wilaya hii — makanisa ${stats.totalLocals}`
              : `District details — ${stats.totalLocals} churches`
            : language === "sw"
              ? `Karibu kwenye Wilaya yako, ${user?.full_name || user?.username}`
              : `Welcome to your District, ${user?.full_name || user?.username}`}
        </p>
      </div>

      {/* Select Church */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw" ? "Chagua Kanisa" : "Select Church"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === "sw"
              ? "Bonyeza kanisa ili kuona taarifa zake"
              : "Click a church to view its details"}
          </p>
        </div>
        {localChurchData.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            {language === "sw"
              ? "Hakuna makanisa yaliyopatikana"
              : "No churches found"}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {localChurchData.map((church) => (
              <button
                key={church.id}
                onClick={() => navigate(`/dashboard/church/${church.id}`)}
                className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 border border-transparent hover:border-primary-400 transition text-left w-full"
              >
                <div className="bg-primary-100 dark:bg-primary-900/40 p-2 rounded-full">
                  <FaChurch className="text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {church.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {church.pastor
                      ? `${language === "sw" ? "Mhubiri" : "Pastor"}: ${church.pastor}`
                      : language === "sw"
                        ? "Kanisa"
                        : "Church"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 text-right">
          <Link
            to={churchesListLink}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {language === "sw" ? "Tazama Makanisa Yote" : "View All Churches"} →
          </Link>
        </div>
      </div>

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
                {card.subLabel && (
                  <p className="text-xs text-gray-400 mt-1">{card.subValue}</p>
                )}
                {card.change && (
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
                )}
              </div>
              <div className={`${card.color} p-3 rounded-full text-white`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Approvals Alert */}
      {stats.pendingApprovals > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FaEye className="text-yellow-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {language === "sw"
                  ? `Una ${stats.pendingApprovals} maombi ya wanachama yanayosubiri idhini katika wilaya yako.`
                  : `You have ${stats.pendingApprovals} pending member registration approvals in your district.`}
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

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Monthly Offerings Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Matoleo ya Kila Mwezi" : "Monthly Offerings"}
          </h2>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
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
          )}
        </div>

        {/* Attendance Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw"
              ? "Mahudhurio ya Kila Mwezi"
              : "Monthly Attendance"}
          </h2>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
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
          )}
        </div>
      </div>

      {/* Local Churches in District */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw"
              ? "Makanisa katika Wilaya Yako"
              : "Churches in Your District"}
          </h2>
          <Link
            to="/churches"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {language === "sw" ? "Tazama Zote" : "View All"} →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Kanisa" : "Church"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Mhubiri" : "Pastor"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Wanachama" : "Members"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Mahudhurio" : "Attendance"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Matoleo" : "Offerings"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Kitendo" : "Action"}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {localChurchData.map((church) => (
                <tr
                  key={church.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  onClick={() => navigate(`/dashboard/church/${church.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {church.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {church.pastor || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {church.members}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {church.attendance || church.members}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {formatCurrency(church.offerings || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/church/${church.id}`);
                      }}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {language === "sw" ? "Tazama" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {localChurchData.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            {language === "sw"
              ? "Hakuna makanisa yaliyopatikana"
              : "No churches found"}
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-1 gap-8">
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
                className="flex items-center justify-between py-2 border-b dark:border-gray-700"
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
      </div>

      {/* Upcoming Events */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
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
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(event.start_date).toLocaleDateString()}
                </p>
                <Link
                  to={`/events/${event.id}`}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  {language === "sw" ? "Tazama" : "View"} →
                </Link>
              </div>
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

      {/* Transfer Statistics */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw" ? "Takwimu za Uhamisho" : "Transfer Statistics"}
          </h2>
          <FaExchangeAlt className="text-gray-400" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {transferStats.total}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {language === "sw" ? "Jumla" : "Total"}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
            <p className="text-xl font-bold text-yellow-600">
              {transferStats.pending}
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              {language === "sw" ? "Inasubiri" : "Pending"}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
            <p className="text-xl font-bold text-green-600">
              {transferStats.approved}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              {language === "sw" ? "Imekubaliwa" : "Approved"}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
            <p className="text-xl font-bold text-red-600">
              {transferStats.rejected}
            </p>
            <p className="text-xs text-red-700 dark:text-red-300">
              {language === "sw" ? "Imekataliwa" : "Rejected"}
            </p>
          </div>
        </div>
      </div>

      {/* Church Comparison Report */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw"
              ? "Ulinganisho wa Makanisa"
              : "Church Comparison Report"}
          </h2>
          <FaChartBar className="text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">
                  {language === "sw" ? "Kanisa" : "Church"}
                </th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">
                  {language === "sw" ? "Mchungaji" : "Pastor"}
                </th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-300 uppercase">
                  {language === "sw" ? "Wanachama" : "Members"}
                </th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-300 uppercase">
                  {language === "sw" ? "Idara" : "Departments"}
                </th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-300 uppercase">
                  {language === "sw" ? "Matukio" : "Events"}
                </th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-300 uppercase">
                  {language === "sw" ? "Matoleo" : "Offerings"}
                </th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-300 uppercase">
                  {language === "sw" ? "Yanayosubiri" : "Pending"}
                </th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 dark:text-gray-300 uppercase">
                  {language === "sw" ? "Kitendo" : "Action"}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {churchComparison.map((church) => (
                <tr key={church.church_id}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {church.church_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                    {church.pastor_name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-300">
                    {church.members_count}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-300">
                    {church.departments_count}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-300">
                    {church.events_count}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">
                    {formatCurrency(church.offerings_total)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-yellow-600">
                    {church.pending_registrations}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => {
                        const selected = localChurchData.find(
                          (c) => c.id === church.church_id,
                        );
                        setAssignChurch(
                          selected || {
                            id: church.church_id,
                            name: church.church_name,
                          },
                        );
                        setShowAssignModal(true);
                      }}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {language === "sw" ? "Teua Mchungaji" : "Assign Pastor"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* District Actions */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-bold text-gray-900 dark:text-white">
              {language === "sw"
                ? "Tuma Ujumbe kwa Wachungaji"
                : "Broadcast to Pastors"}
            </h3>
            <FaBell className="text-gray-400" />
          </div>
          <form onSubmit={handleBroadcast} className="space-y-3">
            <input
              type="text"
              value={broadcastForm.title}
              onChange={(e) =>
                setBroadcastForm({ ...broadcastForm, title: e.target.value })
              }
              placeholder={language === "sw" ? "Kichwa" : "Title"}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
            <textarea
              value={broadcastForm.message}
              onChange={(e) =>
                setBroadcastForm({ ...broadcastForm, message: e.target.value })
              }
              placeholder={language === "sw" ? "Ujumbe" : "Message"}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              required
            />
            <button
              type="submit"
              disabled={broadcastLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {broadcastLoading
                ? language === "sw"
                  ? "Inatuma..."
                  : "Sending..."
                : language === "sw"
                  ? "Tuma"
                  : "Send"}
            </button>
          </form>
          {broadcastMsg && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {broadcastMsg}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-bold text-gray-900 dark:text-white">
              {language === "sw"
                ? "Omba Rasilimali kwa Mkoa"
                : "Request Resources from Region"}
            </h3>
            <FaPaperPlane className="text-gray-400" />
          </div>
          <form onSubmit={handleResourceRequest} className="space-y-3">
            <input
              type="text"
              value={resourceForm.title}
              onChange={(e) =>
                setResourceForm({ ...resourceForm, title: e.target.value })
              }
              placeholder={
                language === "sw" ? "Kichwa cha Ombi" : "Request Title"
              }
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
            <textarea
              value={resourceForm.message}
              onChange={(e) =>
                setResourceForm({ ...resourceForm, message: e.target.value })
              }
              placeholder={language === "sw" ? "Maelezo" : "Details"}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              required
            />
            <button
              type="submit"
              disabled={resourceLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {resourceLoading
                ? language === "sw"
                  ? "Inatuma..."
                  : "Sending..."
                : language === "sw"
                  ? "Tuma Ombi"
                  : "Send Request"}
            </button>
          </form>
          {resourceMsg && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {resourceMsg}
            </p>
          )}
        </div>
      </div>

      {/* Export District Reports */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-md font-bold text-gray-900 dark:text-white">
            {language === "sw"
              ? "Pakua Ripoti za Wilaya"
              : "Export District Reports"}
          </h3>
          <FaDownload className="text-gray-400" />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport("pdf")}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
          >
            PDF
          </button>
          <button
            onClick={() => handleExport("excel")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
          >
            Excel
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            CSV
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/members/add"
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
        <Link
          to="/approvals"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center hover:shadow-lg transition"
        >
          <FaUserCog className="text-2xl text-indigo-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === "sw" ? "Idhinisha Maombi" : "Approve Registrations"}
          </p>
        </Link>
      </div>

      {/* Assign Pastor Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {language === "sw" ? "Teua Mchungaji" : "Assign Pastor"}
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignMsg("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {(language === "sw" ? "Kanisa" : "Church") + ": "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {assignChurch?.name || "-"}
              </span>
            </p>
            <form onSubmit={handleAssignPastor} className="space-y-3">
              <select
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">
                  {language === "sw" ? "Chagua mtumiaji" : "Select user"}
                </option>
                {pastorCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {(candidate.full_name || candidate.username) +
                      " - " +
                      (candidate.church_name || "")}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={assignLoading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {assignLoading
                  ? language === "sw"
                    ? "Inahifadhi..."
                    : "Saving..."
                  : language === "sw"
                    ? "Teua"
                    : "Assign"}
              </button>
            </form>
            {assignMsg && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {assignMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* DashboardCards component */}
      <div className="mt-8">
        <DashboardCards stats={stats} loading={loading} />
      </div>
    </div>
  );
};

export default DistrictDashboard;

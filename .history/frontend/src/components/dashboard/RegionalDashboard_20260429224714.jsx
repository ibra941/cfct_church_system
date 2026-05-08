import { useEffect, useState } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaBell,
  FaCalendarAlt,
  FaChartBar,
  FaChartLine,
  FaChurch,
  FaDonate,
  FaDownload,
  FaExchangeAlt,
  FaEye,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaUserCog,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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
  normalizeOfferingSummary,
} from "../../utils/apiTransforms";
import DashboardCards from "./DashboardCards";

const RegionalDashboard = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: regionId } = useParams();
  const [regionName, setRegionName] = useState("");
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalOfferings: 0,
    totalChurches: 0,
    totalEvents: 0,
    totalDistricts: 0,
    totalLocals: 0,
    pendingApprovals: 0,
    monthlyGrowth: 0,
    attendanceRate: 0,
  });
  const [districtData, setDistrictData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [offeringChartData, setOfferingChartData] = useState([]);
  const [recentMembers, setRecentMembers] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [topChurches, setTopChurches] = useState([]);
  const [districtComparison, setDistrictComparison] = useState([]);
  const [districtLeaders, setDistrictLeaders] = useState([]);
  const [transferStats, setTransferStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [regionalFinancial, setRegionalFinancial] = useState({
    grand_total: 0,
    by_district: [],
    by_type: [],
  });
  const [loading, setLoading] = useState(true);

  // Modals / panels
  const [showBroadcastPanel, setShowBroadcastPanel] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    message: "",
    target_role: "district_leader",
  });
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetChurch, setAssignTargetChurch] = useState(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMsg, setAssignMsg] = useState("");
  const [districtCandidates, setDistrictCandidates] = useState([]);

  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: "", message: "" });
  const [resourceSending, setResourceSending] = useState(false);
  const [resourceMsg, setResourceMsg] = useState("");
  const churchesListLink = regionId
    ? `/churches?scope=regional&region_id=${regionId}`
    : "/churches?scope=regional";

  useEffect(() => {
    fetchDashboardData();
  }, [regionId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stats - scoped to this region if drilling down
      const statsUrl = regionId
        ? `/dashboard/stats/?church_id=${regionId}`
        : "/dashboard/stats/";
      const statsResponse = await api.get(statsUrl);
      setStats({
        totalMembers: statsResponse.data.total_members || 0,
        totalOfferings: statsResponse.data.total_offerings || 0,
        totalChurches: statsResponse.data.total_churches || 0,
        totalEvents: statsResponse.data.total_events || 0,
        totalDistricts: statsResponse.data.districts || 0,
        totalLocals: statsResponse.data.locals || 0,
        pendingApprovals: statsResponse.data.pending_approvals || 0,
        monthlyGrowth: statsResponse.data.monthly_growth || 0,
        attendanceRate: statsResponse.data.attendance_rate || 0,
      });

      // Fetch region name if drilling down
      if (regionId) {
        try {
          const regionResponse = await api.get(`/churches/${regionId}/`);
          setRegionName(regionResponse.data.name || "");
        } catch (e) {
          console.error("Could not fetch region details", e);
        }
      }

      // Fetch districts - scoped to this region if id provided
      const districtsUrl = regionId
        ? `/districts/?parent_id=${regionId}`
        : "/districts/";
      const districtsResponse = await api.get(districtsUrl);
      const districtsData =
        districtsResponse.data.results || districtsResponse.data || [];
      setDistrictData(Array.isArray(districtsData) ? districtsData : []);

      // Fetch monthly data
      const monthlyResponse = await api.get("/finance/monthly-summary/");
      const monthlyData = normalizeMonthlyChartData(monthlyResponse.data);
      setChartData(
        monthlyData.length > 0 ? monthlyData : generateMonthlyData(),
      );

      // Fetch offering by type
      try {
        const offeringTypeResponse = await api.get("/offerings/summary/");
        const normalizedSummary = normalizeOfferingSummary(
          offeringTypeResponse.data,
        );
        setOfferingChartData(
          normalizedSummary.length > 0
            ? normalizedSummary
            : generateOfferingTypeData(),
        );
      } catch (e) {
        setOfferingChartData(generateOfferingTypeData());
      }

      // Fetch recent members
      const membersResponse = await api.get("/members/?limit=5");
      const membersData = extractListData(membersResponse.data);
      setRecentMembers(Array.isArray(membersData) ? membersData : []);

      // Fetch upcoming events
      const eventsResponse = await api.get("/events/?upcoming=true&limit=5");
      const eventsData = extractListData(eventsResponse.data);
      setRecentEvents(Array.isArray(eventsData) ? eventsData : []);

      // Fetch top churches by offerings
      try {
        const topChurchesResponse = await api.get("/churches/top/?limit=5");
        const topChurchesData = extractListData(topChurchesResponse.data);
        setTopChurches(Array.isArray(topChurchesData) ? topChurchesData : []);
      } catch (e) {
        setTopChurches([]);
      }

      // Fetch district comparison (grouped stats per district)
      try {
        const distCompUrl = regionId
          ? `/reports/district-comparison/?region_id=${regionId}`
          : "/reports/district-comparison/";
        const distCompResponse = await api.get(distCompUrl);
        setDistrictComparison(distCompResponse.data.districts || []);
      } catch (e) {
        setDistrictComparison([]);
      }

      // Fetch district leaders
      try {
        const dlResponse = await api.get(
          "/members/?role=district_leader&limit=20",
        );
        const dlData = extractListData(dlResponse.data);
        setDistrictLeaders(Array.isArray(dlData) ? dlData : []);
      } catch (e) {
        setDistrictLeaders([]);
      }

      // Fetch transfer stats
      try {
        const tsUrl = regionId
          ? `/transfers/stats/?region_id=${regionId}`
          : "/transfers/stats/";
        const tsResponse = await api.get(tsUrl);
        setTransferStats(
          tsResponse.data || { total: 0, pending: 0, approved: 0, rejected: 0 },
        );
      } catch (e) {
        setTransferStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
      }

      // Fetch regional financial summary
      try {
        const rfUrl = regionId
          ? `/reports/regional-financial/?region_id=${regionId}`
          : "/reports/regional-financial/";
        const rfResponse = await api.get(rfUrl);
        setRegionalFinancial(
          rfResponse.data || { grand_total: 0, by_district: [], by_type: [] },
        );
      } catch (e) {
        setRegionalFinancial({ grand_total: 0, by_district: [], by_type: [] });
      }

      // Fetch district leader candidates
      try {
        const unapprovedResponse = await api.get(
          "/users/?role=district_leader&is_approved=false",
        );
        const approvedResponse = await api.get("/users/?role=district_leader");
        const merged = [
          ...extractListData(unapprovedResponse.data),
          ...extractListData(approvedResponse.data),
        ];
        const uniqueMap = new Map();
        merged.forEach((candidate) => {
          if (candidate?.id && !uniqueMap.has(candidate.id)) {
            uniqueMap.set(candidate.id, candidate);
          }
        });
        setDistrictCandidates(Array.from(uniqueMap.values()));
      } catch (e) {
        setDistrictCandidates([]);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setStats({
        totalMembers: 0,
        totalOfferings: 0,
        totalChurches: 0,
        totalEvents: 0,
        totalDistricts: 0,
        totalLocals: 0,
        pendingApprovals: 0,
        monthlyGrowth: 0,
        attendanceRate: 0,
      });
      setDistrictData([]);
      setChartData(generateMonthlyData());
      setOfferingChartData(generateOfferingTypeData());
      setTopChurches([
        { id: 1, name: "CFCT Kati", offerings: 0, members: 0 },
        { id: 2, name: "CFCT Kaskazini", offerings: 0, members: 0 },
        { id: 3, name: "CFCT Kusini", offerings: 0, members: 0 },
      ]);
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
      offerings: Math.floor(Math.random() * 300000) + 150000,
      attendance: Math.floor(Math.random() * 400) + 150,
    }));
  };

  const generateOfferingTypeData = () => {
    return [
      {
        name: language === "sw" ? "Zaka" : "Tithe",
        value: 0,
        color: "#3b82f6",
      },
      {
        name: language === "sw" ? "Sadaka" : "Offering",
        value: 0,
        color: "#10b981",
      },
      {
        name: language === "sw" ? "Jengo" : "Building",
        value: 0,
        color: "#f59e0b",
      },
      {
        name: language === "sw" ? "Misheni" : "Mission",
        value: 0,
        color: "#ef4444",
      },
    ];
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: "TZS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleBroadcastSend = async (e) => {
    e.preventDefault();
    setBroadcastSending(true);
    setBroadcastMsg("");
    try {
      await api.post("/notifications/broadcast/", broadcastForm);
      setBroadcastMsg(
        language === "sw"
          ? "Ujumbe umetumwa."
          : "Message broadcast successfully.",
      );
      setBroadcastForm({
        title: "",
        message: "",
        target_role: "district_leader",
      });
    } catch (err) {
      setBroadcastMsg(
        language === "sw" ? "Hitilafu imetokea." : "Failed to send broadcast.",
      );
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleAssignDistrictLeader = async (e) => {
    e.preventDefault();
    if (!assignTargetChurch || !assignUserId) return;
    setAssignLoading(true);
    setAssignMsg("");
    try {
      const res = await api.post(
        `/churches/${assignTargetChurch.id}/assign-district-leader/`,
        { user_id: assignUserId },
      );
      setAssignMsg(
        res.data.message || (language === "sw" ? "Imefanikiwa." : "Success."),
      );
      setAssignUserId("");
    } catch (err) {
      setAssignMsg(
        err.response?.data?.error ||
          (language === "sw" ? "Hitilafu imetokea." : "An error occurred."),
      );
    } finally {
      setAssignLoading(false);
    }
  };

  const handleResourceRequest = async (e) => {
    e.preventDefault();
    setResourceSending(true);
    setResourceMsg("");
    try {
      await api.post("/resource-requests/", resourceForm);
      setResourceMsg(
        language === "sw" ? "Ombi limetumwa." : "Resource request sent.",
      );
      setResourceForm({ title: "", message: "" });
    } catch (err) {
      setResourceMsg(
        language === "sw" ? "Hitilafu imetokea." : "Failed to send request.",
      );
    } finally {
      setResourceSending(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const resp = await api.get(
        `/reports/export/regional/?file_format=${format}`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `regional_report.${format}`);
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
      change: "+5%",
      trend: "up",
    },
    {
      title: language === "sw" ? "Makanisa" : "Churches",
      value: stats.totalChurches,
      icon: <FaChurch />,
      color: "bg-purple-500",
      subValue: `${stats.totalDistricts} ${language === "sw" ? "Wilaya" : "Districts"}, ${stats.totalLocals} ${language === "sw" ? "Makanisa" : "Churches"}`,
      subLabel: true,
    },
    {
      title: language === "sw" ? "Matukio" : "Events",
      value: stats.totalEvents,
      icon: <FaCalendarAlt />,
      color: "bg-yellow-500",
      change: "+2",
      trend: "up",
    },
  ];

  return (
    <div>
      {/* Title and Welcome - at the very top */}
      <div className="mb-6">
        {regionId && (
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-primary-600 hover:text-primary-700 mb-2 flex items-center space-x-1"
          >
            <span>←</span>
            <span>{language === "sw" ? "Rudi Nyuma" : "Go Back"}</span>
          </button>
        )}
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          {regionName
            ? regionName
            : language === "sw"
              ? "Dashibodi ya Mkoa"
              : "Regional Dashboard"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {regionId
            ? language === "sw"
              ? `Taarifa za mkoa huu — wilaya ${stats.totalDistricts}, makanisa ${stats.totalLocals}`
              : `Region details — ${stats.totalDistricts} districts, ${stats.totalLocals} churches`
            : language === "sw"
              ? `Karibu kwenye Mkoa wako, ${user?.full_name || user?.username}`
              : `Welcome to your Region, ${user?.full_name || user?.username}`}
        </p>
      </div>

      {/* Select District */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw" ? "Chagua Wilaya" : "Select District"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === "sw"
              ? "Bonyeza wilaya ili kuona taarifa zake"
              : "Click a district to view its details"}
          </p>
        </div>
        {districtData.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            {language === "sw"
              ? "Hakuna wilaya zilizopatikana"
              : "No districts found"}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {districtData.map((district) => (
              <button
                key={district.id}
                onClick={() => navigate(`/dashboard/district/${district.id}`)}
                className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 border border-transparent hover:border-primary-400 transition text-left w-full"
              >
                <div className="bg-primary-100 dark:bg-primary-900/40 p-2 rounded-full">
                  <FaMapMarkerAlt className="text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {district.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {language === "sw" ? "Wilaya" : "District"}
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

      {/* Attendance Rate Card */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm opacity-90">
              {language === "sw"
                ? "Wastani wa Mahudhurio"
                : "Average Attendance Rate"}
            </p>
            <p className="text-white text-3xl font-bold mt-1">
              {stats.attendanceRate}%
            </p>
            <p className="text-white text-xs opacity-75 mt-1">
              {language === "sw"
                ? "Kutoka makanisa yote mkoani"
                : "Across all churches in region"}
            </p>
          </div>
          <div className="w-24 h-24">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="white"
                strokeWidth="10"
                strokeDasharray={`${stats.attendanceRate * 2.827}, 282.7`}
              />
            </svg>
            <div className="text-white text-center text-sm -mt-10">
              {stats.attendanceRate}%
            </div>
          </div>
        </div>
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
                  ? `Una ${stats.pendingApprovals} maombi ya wanachama yanayosubiri idhini katika mkoa wako.`
                  : `You have ${stats.pendingApprovals} pending member registration approvals in your region.`}
              </p>
            </div>
            <div className="ml-auto">
              <a
                href="/approvals"
                className="text-sm text-yellow-600 hover:text-yellow-700 dark:text-yellow-400"
              >
                {language === "sw" ? "Tazama" : "View"} →
              </a>
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

        {/* Offerings by Type */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Matoleo kwa Aina" : "Offerings by Type"}
          </h2>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={offeringChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {offeringChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Districts Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw"
              ? "Wilaya katika Mkoa Wako"
              : "Districts in Your Region"}
          </h2>
          <div className="space-y-3">
            {districtData.map((district) => (
              <button
                key={district.id}
                onClick={() => navigate(`/dashboard/district/${district.id}`)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 border border-transparent hover:border-primary-400 transition text-left"
              >
                <div className="flex items-center space-x-3">
                  <FaMapMarkerAlt className="text-primary-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {district.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {district.churches}{" "}
                      {language === "sw" ? "makanisa" : "churches"} •{" "}
                      {district.members}{" "}
                      {language === "sw" ? "wanachama" : "members"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">
                    {formatCurrency(district.offerings || 0)}
                  </p>
                  <span className="text-xs text-primary-600">
                    {language === "sw" ? "Tazama" : "View"} →
                  </span>
                </div>
              </button>
            ))}
            {districtData.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                {language === "sw"
                  ? "Hakuna wilaya zilizopatikana"
                  : "No districts found"}
              </p>
            )}
          </div>
        </div>

        {/* Top Churches */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw"
              ? "Makanisa Bora kwa Matoleo"
              : "Top Churches by Offerings"}
          </h2>
          <div className="space-y-3">
            {topChurches.map((church, index) => (
              <div
                key={church.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <span className="font-bold text-primary-600">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {church.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {church.members}{" "}
                      {language === "sw" ? "wanachama" : "members"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">
                    {formatCurrency(church.offerings)}
                  </p>
                </div>
              </div>
            ))}
            {topChurches.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                {language === "sw"
                  ? "Hakuna data ya makanisa"
                  : "No church data available"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Members */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === "sw" ? "Wanachama Wapya" : "Recent Members"}
            </h2>
            <a
              href="/members"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {language === "sw" ? "Tazama Zote" : "View All"} →
            </a>
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
                <span className="text-xs text-gray-400">
                  {new Date(member.created_at).toLocaleDateString()}
                </span>
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
            <a
              href="/events"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {language === "sw" ? "Tazama Zote" : "View All"} →
            </a>
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
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <a
          href="/members/add"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center hover:shadow-lg transition"
        >
          <FaUserPlus className="text-2xl text-primary-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === "sw" ? "Ongeza Mwanachama" : "Add Member"}
          </p>
        </a>
        <a
          href="/offerings/add"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center hover:shadow-lg transition"
        >
          <FaDonate className="text-2xl text-green-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === "sw" ? "Rekodi Mchango" : "Record Offering"}
          </p>
        </a>
        <a
          href="/events/add"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center hover:shadow-lg transition"
        >
          <FaCalendarAlt className="text-2xl text-yellow-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === "sw" ? "Panga Tukio" : "Plan Event"}
          </p>
        </a>
        <a
          href="/reports"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center hover:shadow-lg transition"
        >
          <FaChartLine className="text-2xl text-purple-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === "sw" ? "Ripoti" : "Reports"}
          </p>
        </a>
      </div>

      {/* Export Reports */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw" ? "Pakua Ripoti" : "Export Reports"}
          </h2>
          <FaDownload className="text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {language === "sw"
            ? "Pakua ripoti ya mkoa wako katika muundo unaopendelea"
            : "Download your regional report in your preferred format"}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <FaDownload />
            <span>PDF</span>
          </button>
          <button
            onClick={() => handleExport("xlsx")}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <FaDownload />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <FaDownload />
            <span>CSV</span>
          </button>
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
          {[
            {
              label: language === "sw" ? "Jumla" : "Total",
              value: transferStats.total,
              color: "text-gray-700 dark:text-gray-200",
            },
            {
              label: language === "sw" ? "Inasubiri" : "Pending",
              value: transferStats.pending,
              color: "text-yellow-600",
            },
            {
              label: language === "sw" ? "Zilizoidhinishwa" : "Approved",
              value: transferStats.approved,
              color: "text-green-600",
            },
            {
              label: language === "sw" ? "Zilizokataliwa" : "Rejected",
              value: transferStats.rejected,
              color: "text-red-600",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center"
            >
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {item.label}
              </p>
            </div>
          ))}
        </div>
        {transferStats.pending > 0 && (
          <div className="mt-3 text-right">
            <Link
              to="/transfers"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {language === "sw" ? "Simamia Uhamisho" : "Manage Transfers"} →
            </Link>
          </div>
        )}
      </div>

      {/* District Performance Comparison */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw"
              ? "Ulinganisho wa Wilaya"
              : "District Performance Comparison"}
          </h2>
          <FaChartBar className="text-gray-400" />
        </div>
        {districtComparison.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            {language === "sw"
              ? "Hakuna data ya wilaya"
              : "No district data available"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">
                    {language === "sw" ? "Wilaya" : "District"}
                  </th>
                  <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">
                    {language === "sw" ? "Makanisa" : "Churches"}
                  </th>
                  <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">
                    {language === "sw" ? "Wanachama" : "Members"}
                  </th>
                  <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">
                    {language === "sw" ? "Wapya (Mwezi)" : "New (Month)"}
                  </th>
                  <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">
                    {language === "sw" ? "Matoleo" : "Offerings"}
                  </th>
                  <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">
                    {language === "sw" ? "Matukio" : "Events"}
                  </th>
                  <th className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">
                    {language === "sw" ? "Maombi Yanayosubiri" : "Pending Regs"}
                  </th>
                  <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">
                    {language === "sw" ? "Kiongozi" : "Leader"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {districtComparison.map((d) => (
                  <tr
                    key={d.district_id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      <button
                        onClick={() =>
                          navigate(`/dashboard/district/${d.district_id}`)
                        }
                        className="hover:text-primary-600"
                      >
                        {d.district_name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {d.local_churches_count}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {d.members_count}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      +{d.new_members_this_month}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(d.offerings_total)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {d.events_count}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {d.pending_registrations > 0 ? (
                        <span className="text-yellow-600 font-semibold">
                          {d.pending_registrations}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {d.district_leader_name || (
                        <span className="text-gray-400 italic">
                          {language === "sw" ? "Hajapatikana" : "Unassigned"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Regional Financial Summary */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw"
              ? "Muhtasari wa Fedha za Mkoa"
              : "Regional Financial Summary"}
          </h2>
          <FaMoneyBillWave className="text-gray-400" />
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === "sw" ? "Jumla ya Matoleo" : "Total Offerings"}
          </p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(regionalFinancial.grand_total)}
          </p>
        </div>
        {regionalFinancial.by_district.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
              {language === "sw"
                ? "Matoleo kwa Wilaya"
                : "Offerings by District"}
            </h3>
            <div className="space-y-2">
              {regionalFinancial.by_district.map((d) => (
                <div
                  key={d.district_id}
                  className="flex items-center justify-between py-2 border-b dark:border-gray-700"
                >
                  <span className="text-gray-900 dark:text-white text-sm">
                    {d.district_name}
                  </span>
                  <span className="text-green-600 font-medium text-sm">
                    {formatCurrency(d.total_offerings)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {regionalFinancial.by_type.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
              {language === "sw" ? "Matoleo kwa Aina" : "Offerings by Type"}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {regionalFinancial.by_type.map((t) => (
                <div
                  key={t.type}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {t.type}
                  </p>
                  <p className="text-green-600 font-semibold mt-1">
                    {formatCurrency(t.total)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* District Leaders */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw" ? "Viongozi wa Wilaya" : "District Leaders"}
          </h2>
          <FaUserCog className="text-gray-400" />
        </div>
        {districtLeaders.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            {language === "sw"
              ? "Hakuna viongozi wa wilaya"
              : "No district leaders found"}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {districtLeaders.map((leader) => (
              <div
                key={leader.id}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                    <FaUsers className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {leader.full_name || leader.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {leader.email}
                    </p>
                    {leader.phone && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {leader.phone}
                      </p>
                    )}
                    {leader.church_name && (
                      <p className="text-xs text-primary-600 mt-1">
                        {leader.church_name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 text-right">
          <button
            onClick={() => setShowAssignModal(true)}
            className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            {language === "sw"
              ? "Teua Kiongozi wa Wilaya"
              : "Assign District Leader"}
          </button>
        </div>
      </div>

      {/* Broadcast Notification Panel */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw"
              ? "Tuma Ujumbe kwa Viongozi"
              : "Broadcast to District Leaders"}
          </h2>
          <FaBell className="text-gray-400" />
        </div>
        {!showBroadcastPanel ? (
          <button
            onClick={() => setShowBroadcastPanel(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm"
          >
            {language === "sw" ? "Tunga Ujumbe" : "Compose Message"}
          </button>
        ) : (
          <form onSubmit={handleBroadcastSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === "sw" ? "Kichwa cha Ujumbe" : "Title"}
              </label>
              <input
                type="text"
                value={broadcastForm.title}
                onChange={(e) =>
                  setBroadcastForm({ ...broadcastForm, title: e.target.value })
                }
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === "sw" ? "Ujumbe" : "Message"}
              </label>
              <textarea
                rows={4}
                value={broadcastForm.message}
                onChange={(e) =>
                  setBroadcastForm({
                    ...broadcastForm,
                    message: e.target.value,
                  })
                }
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === "sw" ? "Watumie kwa" : "Send to"}
              </label>
              <select
                value={broadcastForm.target_role}
                onChange={(e) =>
                  setBroadcastForm({
                    ...broadcastForm,
                    target_role: e.target.value,
                  })
                }
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="district_leader">
                  {language === "sw"
                    ? "Viongozi wa Wilaya"
                    : "District Leaders"}
                </option>
                <option value="local_leader">
                  {language === "sw" ? "Wachungaji" : "Pastors"}
                </option>
                <option value="all">
                  {language === "sw" ? "Wote" : "All"}
                </option>
              </select>
            </div>
            {broadcastMsg && (
              <p className="text-sm text-green-600">{broadcastMsg}</p>
            )}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={broadcastSending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm disabled:opacity-50"
              >
                {broadcastSending
                  ? language === "sw"
                    ? "Inatuma..."
                    : "Sending..."
                  : language === "sw"
                    ? "Tuma"
                    : "Send"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBroadcastPanel(false);
                  setBroadcastMsg("");
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
              >
                {language === "sw" ? "Ghairi" : "Cancel"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Request Resources from Zone */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw"
              ? "Omba Rasilimali kutoka Kanda"
              : "Request Resources from Zone"}
          </h2>
          <FaChurch className="text-gray-400" />
        </div>
        {!showResourceModal ? (
          <button
            onClick={() => setShowResourceModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
          >
            {language === "sw" ? "Tuma Ombi" : "Send Request"}
          </button>
        ) : (
          <form onSubmit={handleResourceRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === "sw" ? "Kichwa cha Ombi" : "Request Title"}
              </label>
              <input
                type="text"
                value={resourceForm.title}
                onChange={(e) =>
                  setResourceForm({ ...resourceForm, title: e.target.value })
                }
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === "sw" ? "Maelezo" : "Details"}
              </label>
              <textarea
                rows={3}
                value={resourceForm.message}
                onChange={(e) =>
                  setResourceForm({ ...resourceForm, message: e.target.value })
                }
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            {resourceMsg && (
              <p className="text-sm text-green-600">{resourceMsg}</p>
            )}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={resourceSending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
              >
                {resourceSending
                  ? language === "sw"
                    ? "Inatuma..."
                    : "Sending..."
                  : language === "sw"
                    ? "Tuma"
                    : "Send"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResourceModal(false);
                  setResourceMsg("");
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
              >
                {language === "sw" ? "Ghairi" : "Cancel"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Assign District Leader Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {language === "sw"
                ? "Teua Kiongozi wa Wilaya"
                : "Assign District Leader"}
            </h2>
            <form onSubmit={handleAssignDistrictLeader} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === "sw" ? "Chagua Wilaya" : "Select District"}
                </label>
                <select
                  value={assignTargetChurch?.id || ""}
                  onChange={(e) =>
                    setAssignTargetChurch(
                      districtData.find(
                        (d) => String(d.id) === e.target.value,
                      ) || null,
                    )
                  }
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">
                    {language === "sw" ? "-- Chagua --" : "-- Select --"}
                  </option>
                  {districtData.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === "sw" ? "Chagua Mtumiaji" : "Select User"}
                </label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">
                    {language === "sw" ? "Chagua mtumiaji" : "Select user"}
                  </option>
                  {districtCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {(candidate.full_name || candidate.username) +
                        " - " +
                        (candidate.church_name || "-")}
                    </option>
                  ))}
                </select>
              </div>
              {assignMsg && (
                <p className="text-sm text-green-600">{assignMsg}</p>
              )}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={assignLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm disabled:opacity-50"
                >
                  {assignLoading
                    ? language === "sw"
                      ? "Inahifadhi..."
                      : "Saving..."
                    : language === "sw"
                      ? "Teua"
                      : "Assign"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignMsg("");
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
                >
                  {language === "sw" ? "Funga" : "Close"}
                </button>
              </div>
            </form>
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

export default RegionalDashboard;

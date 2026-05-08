import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FaArrowDown,
  FaArrowUp,
  FaBullhorn,
  FaCalendarAlt,
  FaCheck,
  FaChurch,
  FaCog,
  FaDatabase,
  FaDonate,
  FaDownload,
  FaEye,
  FaHeartbeat,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaTimes,
  FaUsers,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
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

const NationalDashboard = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Core stats
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalOfferings: 0,
    totalChurches: 0,
    totalEvents: 0,
    totalZones: 0,
    totalRegions: 0,
    totalDistricts: 0,
    pendingApprovals: 0,
    monthlyGrowth: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [offeringChartData, setOfferingChartData] = useState([]);
  const [recentMembers, setRecentMembers] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Zone management
  const [zones, setZones] = useState([]);
  const [zoneComparison, setZoneComparison] = useState([]);

  // National financials
  const [nationalFinancial, setNationalFinancial] = useState({
    grand_total: 0,
    by_type: [],
    by_zone: [],
    monthly: [],
    forecast_next_month: 0,
  });

  // National budget
  const [nationalBudget, setNationalBudget] = useState({
    zones: [],
    total_budget: 0,
    total_members: 0,
    total_offerings: 0,
  });
  const [budgetInput, setBudgetInput] = useState("100000000");

  // Zone leader approvals / assignment
  const [pendingZoneApprovals, setPendingZoneApprovals] = useState([]);
  const [zoneCandidates, setZoneCandidates] = useState([]);
  const [assignZoneId, setAssignZoneId] = useState("");
  const [assignUserId, setAssignUserId] = useState("");

  // System health
  const [systemHealth, setSystemHealth] = useState(null);

  // Broadcast / announcement
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    message: "",
    target_role: "zone_leader",
  });
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
  });

  // Church creation
  const [createChurchForm, setCreateChurchForm] = useState({
    name: "",
    church_type: "zone",
    parent_church: "",
    location: "",
  });
  const [allChurches, setAllChurches] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsResponse = await api.get("/dashboard/stats/");
      setStats({
        totalMembers: statsResponse.data.total_members || 0,
        totalOfferings: statsResponse.data.total_offerings || 0,
        totalChurches: statsResponse.data.total_churches || 0,
        totalEvents: statsResponse.data.total_events || 0,
        totalZones: statsResponse.data.zones || 0,
        totalRegions: statsResponse.data.regions || 0,
        totalDistricts: statsResponse.data.districts || 0,
        pendingApprovals: statsResponse.data.pending_approvals || 0,
        monthlyGrowth: statsResponse.data.monthly_growth || 0,
      });

      const monthlyResponse = await api.get("/finance/monthly-summary/");
      const monthlyData = normalizeMonthlyChartData(monthlyResponse.data);
      setChartData(
        monthlyData.length > 0 ? monthlyData : generateMonthlyData(),
      );

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
      } catch {
        setOfferingChartData(generateOfferingTypeData());
      }

      const membersResponse = await api.get("/members/?limit=5");
      setRecentMembers(extractListData(membersResponse.data) || []);

      const eventsResponse = await api.get("/events/?upcoming=true&limit=5");
      setRecentEvents(extractListData(eventsResponse.data) || []);

      try {
        const zonesResponse = await api.get("/zones/");
        const zonesData =
          zonesResponse.data.results || zonesResponse.data || [];
        setZones(Array.isArray(zonesData) ? zonesData : []);
      } catch {
        setZones([]);
      }

      try {
        const zoneCompResponse = await api.get("/reports/zone-comparison/");
        setZoneComparison(zoneCompResponse.data?.zones || []);
      } catch {
        setZoneComparison([]);
      }

      try {
        const finResponse = await api.get("/reports/national-financial/");
        setNationalFinancial(
          finResponse.data || {
            grand_total: 0,
            by_type: [],
            by_zone: [],
            monthly: [],
            forecast_next_month: 0,
          },
        );
      } catch {
        setNationalFinancial({
          grand_total: 0,
          by_type: [],
          by_zone: [],
          monthly: [],
          forecast_next_month: 0,
        });
      }

      try {
        const budgetResponse = await api.get(
          `/reports/national-budget/?total_budget=${budgetInput}`,
        );
        setNationalBudget(
          budgetResponse.data || {
            zones: [],
            total_budget: 0,
            total_members: 0,
            total_offerings: 0,
          },
        );
      } catch {
        setNationalBudget({
          zones: [],
          total_budget: 0,
          total_members: 0,
          total_offerings: 0,
        });
      }

      try {
        const pendingResponse = await api.get(
          "/users/pending-zone-registrations/",
        );
        setPendingZoneApprovals(extractListData(pendingResponse.data));
      } catch {
        setPendingZoneApprovals([]);
      }

      try {
        const candidatesResponse = await api.get("/users/?role=zone_leader");
        setZoneCandidates(extractListData(candidatesResponse.data));
      } catch {
        setZoneCandidates([]);
      }

      try {
        const healthResponse = await api.get("/system/health/");
        setSystemHealth(healthResponse.data);
      } catch {
        setSystemHealth(null);
      }

      try {
        const allChurchesResponse = await api.get("/churches/?limit=500");
        setAllChurches(extractListData(allChurchesResponse.data) || []);
      } catch {
        setAllChurches([]);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setStats({
        totalMembers: 0,
        totalOfferings: 0,
        totalChurches: 0,
        totalEvents: 0,
        totalZones: 0,
        totalRegions: 0,
        totalDistricts: 0,
        pendingApprovals: 0,
        monthlyGrowth: 0,
      });
      setChartData(generateMonthlyData());
      setOfferingChartData(generateOfferingTypeData());
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = () =>
    [
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
    ].map((month) => ({ month, offerings: 0, members: 0 }));

  const generateOfferingTypeData = () => [
    { name: language === "sw" ? "Zaka" : "Tithe", value: 0, color: "#3b82f6" },
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
    {
      name: language === "sw" ? "Nyingine" : "Other",
      value: 0,
      color: "#8b5cf6",
    },
  ];

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: "TZS",
      minimumFractionDigits: 0,
    }).format(amount || 0);

  // --- Handlers ---

  const handleZoneApproval = async (userId, action) => {
    try {
      const endpoint =
        action === "approve"
          ? `/users/${userId}/approve-zone-registration/`
          : `/users/${userId}/reject-zone-registration/`;
      await api.post(
        endpoint,
        action === "reject" ? { reason: "Not approved at national level" } : {},
      );
      toast.success(
        language === "sw"
          ? "Ombi limefanyiwa kazi"
          : "Zone leader registration updated",
      );
      fetchDashboardData();
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          (language === "sw" ? "Imeshindikana" : "Request failed"),
      );
    }
  };

  const handleAssignZoneLeader = async () => {
    if (!assignZoneId || !assignUserId) {
      toast.error(
        language === "sw" ? "Chagua kanda na mtumiaji" : "Select zone and user",
      );
      return;
    }
    try {
      const response = await api.post(
        `/churches/${assignZoneId}/assign-zone-leader/`,
        { user_id: assignUserId },
      );
      toast.success(response.data?.message || "Success");
      setAssignZoneId("");
      setAssignUserId("");
      fetchDashboardData();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed");
    }
  };

  const handleExport = async (fmt) => {
    try {
      const response = await api.get(
        `/reports/export/national/?file_format=${fmt}`,
        { responseType: "blob" },
      );
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute(
        "download",
        `national-report.${fmt === "excel" ? "xlsx" : fmt}`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error(
        language === "sw"
          ? "Imeshindikana kuhamisha ripoti"
          : "Failed to export report",
      );
    }
  };

  const handleSystemBackup = async () => {
    try {
      const response = await api.get("/system/export-backup/", {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", "cfct-system-backup.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success(
        language === "sw"
          ? "Nakala ya mfumo imepakuliwa"
          : "System backup downloaded",
      );
    } catch {
      toast.error(
        language === "sw"
          ? "Imeshindikana kupakua nakala"
          : "Failed to download system backup",
      );
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!noticeForm.title || !noticeForm.message) {
      toast.error(
        language === "sw" ? "Jaza sehemu zote" : "Fill in all fields",
      );
      return;
    }
    try {
      await api.post("/notifications/broadcast/", { ...noticeForm });
      toast.success(language === "sw" ? "Taarifa imetumwa" : "Broadcast sent");
      setNoticeForm({ title: "", message: "", target_role: "zone_leader" });
    } catch {
      toast.error(
        language === "sw"
          ? "Imeshindikana kutuma taarifa"
          : "Failed to send broadcast",
      );
    }
  };

  const handleSystemAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.message) {
      toast.error(
        language === "sw" ? "Jaza sehemu zote" : "Fill in all fields",
      );
      return;
    }
    try {
      await api.post("/notifications/broadcast/", {
        ...announcementForm,
        target_role: "all",
      });
      toast.success(
        language === "sw"
          ? "Tangazo limetumwa kwa wote"
          : "System-wide announcement sent",
      );
      setAnnouncementForm({ title: "", message: "" });
    } catch {
      toast.error(
        language === "sw"
          ? "Imeshindikana kutuma tangazo"
          : "Failed to send announcement",
      );
    }
  };

  const handleCreateChurch = async (e) => {
    e.preventDefault();
    if (!createChurchForm.name || !createChurchForm.church_type) {
      toast.error(
        language === "sw" ? "Jaza sehemu zote" : "Fill in all required fields",
      );
      return;
    }
    try {
      const payload = {
        name: createChurchForm.name,
        church_type: createChurchForm.church_type,
        location: createChurchForm.location,
      };
      if (createChurchForm.parent_church)
        payload.parent_church = parseInt(createChurchForm.parent_church, 10);
      await api.post("/churches/", payload);
      toast.success(
        language === "sw" ? "Kanisa limeundwa" : "Church created successfully",
      );
      setCreateChurchForm({
        name: "",
        church_type: "zone",
        parent_church: "",
        location: "",
      });
      fetchDashboardData();
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ||
          error?.response?.data?.name?.[0] ||
          "Failed to create church",
      );
    }
  };

  const handleRefreshBudget = async () => {
    try {
      const budgetResponse = await api.get(
        `/reports/national-budget/?total_budget=${budgetInput}`,
      );
      setNationalBudget(
        budgetResponse.data || {
          zones: [],
          total_budget: 0,
          total_members: 0,
          total_offerings: 0,
        },
      );
      toast.success(
        language === "sw" ? "Mipango imesasishwa" : "Budget allocation updated",
      );
    } catch {
      toast.error("Failed to load budget allocation");
    }
  };

  const statCards = [
    {
      title: language === "sw" ? "Wanachama" : "Members",
      value: stats.totalMembers,
      icon: <FaUsers />,
      color: "bg-blue-500",
      change: stats.monthlyGrowth > 0 ? `+${stats.monthlyGrowth}%` : null,
      trend: "up",
    },
    {
      title: language === "sw" ? "Matoleo" : "Offerings",
      value: formatCurrency(stats.totalOfferings),
      icon: <FaDonate />,
      color: "bg-green-500",
    },
    {
      title: language === "sw" ? "Makanisa" : "Churches",
      value: stats.totalChurches,
      icon: <FaChurch />,
      color: "bg-purple-500",
      subValue: `${stats.totalZones} ${language === "sw" ? "Kanda" : "Zones"}, ${stats.totalRegions} ${language === "sw" ? "Mikoa" : "Regions"}`,
      subLabel: true,
    },
    {
      title: language === "sw" ? "Matukio" : "Events",
      value: stats.totalEvents,
      icon: <FaCalendarAlt />,
      color: "bg-yellow-500",
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          {language === "sw" ? "Dashibodi ya Taifa" : "National Dashboard"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {language === "sw"
            ? `Karibu, ${user?.full_name || user?.username}. Simamia mfumo wote wa kanisa la taifa.`
            : `Welcome, ${user?.full_name || user?.username}. Full system-wide access and management.`}
        </p>
      </div>

      {/* Pending Alerts */}
      {(stats.pendingApprovals > 0 || pendingZoneApprovals.length > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <FaEye className="text-yellow-500 mr-3" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {language === "sw"
                ? `Una ${stats.pendingApprovals} maombi ya wanachama na ${pendingZoneApprovals.length} maombi ya viongozi wa kanda yanayosubiri idhini.`
                : `You have ${stats.pendingApprovals} member registrations and ${pendingZoneApprovals.length} zone leader registrations awaiting approval.`}
            </p>
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
                      {language === "sw" ? "mwezi uliopita" : "from last month"}
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

      {/* Zone Comparison Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw"
              ? "Ulinganisho wa Kanda"
              : "Zone Performance Comparison"}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              <FaDownload size={12} /> CSV
            </button>
            <button
              onClick={() => handleExport("excel")}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              <FaDownload size={12} /> Excel
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              <FaDownload size={12} /> PDF
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                  {language === "sw" ? "Kanda" : "Zone"}
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                  {language === "sw" ? "Mikoa" : "Regions"}
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                  {language === "sw" ? "Wilaya" : "Districts"}
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                  {language === "sw" ? "Makanisa" : "Locals"}
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                  {language === "sw" ? "Wanachama" : "Members"}
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                  {language === "sw" ? "Matoleo" : "Offerings"}
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                  {language === "sw" ? "Matukio" : "Events"}
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                  {language === "sw" ? "Kiongozi" : "Zone Leader"}
                </th>
              </tr>
            </thead>
            <tbody>
              {zoneComparison.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-500">
                    {language === "sw" ? "Hakuna data" : "No data available"}
                  </td>
                </tr>
              ) : (
                zoneComparison.map((zone) => (
                  <tr
                    key={zone.zone_id}
                    className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  >
                    <td className="px-4 py-2 font-medium">
                      <button
                        onClick={() =>
                          navigate(`/dashboard/zone/${zone.zone_id}`)
                        }
                        className="text-primary-600 hover:underline"
                      >
                        {zone.zone_name}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                      {zone.regions_count}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                      {zone.districts_count}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                      {zone.locals_count}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                      {zone.members_count?.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(zone.offerings_total)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                      {zone.events_count}
                    </td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                      {zone.zone_leader_name || (
                        <span className="text-red-400 text-xs">
                          Not assigned
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* National Financial Summary + Monthly Chart */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw"
              ? "Muhtasari wa Fedha za Taifa"
              : "National Financial Summary"}
          </h2>
          <div className="mb-4 space-y-2">
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {language === "sw" ? "Jumla ya Matoleo" : "Total Offerings"}
              </span>
              <span className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(nationalFinancial.grand_total)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {language === "sw"
                  ? "Utabiri - Mwezi Ujao"
                  : "Forecast (Next Month)"}
              </span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(nationalFinancial.forecast_next_month)}
              </span>
            </div>
          </div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-2">
            {language === "sw" ? "Kwa Kanda" : "Breakdown by Zone"}
          </h3>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {nationalFinancial.by_zone.length === 0 ? (
              <p className="text-gray-500 text-sm">
                {language === "sw" ? "Hakuna data" : "No data"}
              </p>
            ) : (
              nationalFinancial.by_zone.map((z, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-1 border-b dark:border-gray-700"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {z.zone_name}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(z.total_offerings)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw"
              ? "Matoleo ya Kila Mwezi"
              : "Monthly Offerings Trend"}
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
      </div>

      {/* National Budget Allocation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex-1">
            {language === "sw"
              ? "Mgawanyo wa Bajeti ya Taifa"
              : "National Budget Allocation"}
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              {language === "sw" ? "Bajeti (TZS):" : "Total Budget (TZS):"}
            </label>
            <input
              type="number"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="w-36 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handleRefreshBudget}
              className="px-3 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
            >
              {language === "sw" ? "Hesabu" : "Calculate"}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                  {language === "sw" ? "Kanda" : "Zone"}
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                  {language === "sw" ? "Wanachama" : "Members"}
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                  {language === "sw" ? "Matoleo" : "Offerings"}
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                  % {language === "sw" ? "Mgawo" : "Share"}
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">
                  {language === "sw" ? "Mgawo Uliopendekezwa" : "Recommended"}
                </th>
              </tr>
            </thead>
            <tbody>
              {!nationalBudget.zones?.length ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-500">
                    {language === "sw" ? "Hakuna data" : "No data"}
                  </td>
                </tr>
              ) : (
                nationalBudget.zones.map((z, idx) => (
                  <tr
                    key={idx}
                    className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  >
                    <td className="px-4 py-2 text-gray-900 dark:text-white">
                      {z.zone_name}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                      {z.members?.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(z.offerings_total)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                      {z.recommended_share}%
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-primary-600 dark:text-primary-400">
                      {formatCurrency(z.recommended_allocation)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zones Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw" ? "Kanda Zote" : "All Zones"}
          </h2>
          <Link
            to="/churches?scope=national"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {language === "sw" ? "Tazama Makanisa Yote" : "View All Churches"} →
          </Link>
        </div>
        {zones.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            {language === "sw" ? "Hakuna kanda" : "No zones found"}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((zone) => (
              <button
                key={zone.id}
                onClick={() => navigate(`/dashboard/zone/${zone.id}`)}
                className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 border border-transparent hover:border-primary-500 transition text-left w-full"
              >
                <div className="bg-primary-100 dark:bg-primary-900/40 p-2 rounded-full">
                  <FaMapMarkerAlt className="text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {zone.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {language === "sw" ? "Kanda" : "Zone"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zone Leader Approvals + Assignment */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw"
              ? "Maombi ya Viongozi wa Kanda"
              : "Pending Zone Leader Registrations"}
            {pendingZoneApprovals.length > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                {pendingZoneApprovals.length}
              </span>
            )}
          </h2>
          {pendingZoneApprovals.length === 0 ? (
            <p className="text-gray-500 text-sm">
              {language === "sw"
                ? "Hakuna maombi yanayosubiri"
                : "No pending registrations"}
            </p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {pendingZoneApprovals.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {u.full_name || u.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {u.email} · {u.church?.name || "No church"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleZoneApproval(u.id, "approve")}
                      className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded"
                      title="Approve"
                    >
                      <FaCheck size={12} />
                    </button>
                    <button
                      onClick={() => handleZoneApproval(u.id, "reject")}
                      className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded"
                      title="Reject"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw"
              ? "Teua Kiongozi wa Kanda"
              : "Assign Zone Leader"}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === "sw" ? "Chagua Kanda" : "Select Zone"}
              </label>
              <select
                value={assignZoneId}
                onChange={(e) => setAssignZoneId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
              >
                <option value="">
                  {language === "sw"
                    ? "-- Chagua Kanda --"
                    : "-- Select Zone --"}
                </option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
              >
                <option value="">
                  {language === "sw"
                    ? "-- Chagua Mtumiaji --"
                    : "-- Select User --"}
                </option>
                {zoneCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || c.username} ({c.email})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAssignZoneLeader}
              className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold"
            >
              {language === "sw" ? "Teua Kiongozi" : "Assign Zone Leader"}
            </button>
          </div>
        </div>
      </div>

      {/* System Health */}
      {systemHealth && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FaHeartbeat className="text-green-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === "sw" ? "Hali ya Mfumo" : "System Health"}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {language === "sw" ? "Watumiaji Wote" : "Total Users"}
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {systemHealth.users?.total}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Active: {systemHealth.users?.active}
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {language === "sw" ? "Makanisa" : "Churches"}
              </p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                {systemHealth.churches?.total}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Zones: {systemHealth.churches?.zones} | Regions:{" "}
                {systemHealth.churches?.regions}
              </p>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {language === "sw" ? "Maombi Yanayosubiri" : "Pending Ops"}
              </p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {(systemHealth.operations?.pending_registrations || 0) +
                  (systemHealth.operations?.pending_transfers || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Reg: {systemHealth.operations?.pending_registrations} |
                Transfers: {systemHealth.operations?.pending_transfers}
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {language === "sw" ? "Wapya Wiki Hii" : "New This Week"}
              </p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {systemHealth.users?.new_this_week}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Month: {systemHealth.users?.new_this_month}
              </p>
            </div>
          </div>
          {(systemHealth.churches?.locals_without_leader > 0 ||
            systemHealth.churches?.zones_without_leader > 0) && (
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded">
              <p className="text-sm text-orange-700 dark:text-orange-300">
                ⚠️ {systemHealth.churches?.zones_without_leader}{" "}
                {language === "sw"
                  ? "kanda bila kiongozi"
                  : "zones without leader"}
                ,&nbsp;
                {systemHealth.churches?.locals_without_leader}{" "}
                {language === "sw"
                  ? "makanisa ya mitaa bila mchungaji"
                  : "local churches without pastor"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Broadcast + System Announcement */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaBullhorn className="text-primary-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === "sw"
                ? "Tuma Ujumbe kwa Viongozi"
                : "Broadcast to Leaders"}
            </h2>
          </div>
          <form onSubmit={handleBroadcast} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === "sw" ? "Wapokeaji" : "Target Audience"}
              </label>
              <select
                value={noticeForm.target_role}
                onChange={(e) =>
                  setNoticeForm({ ...noticeForm, target_role: e.target.value })
                }
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
              >
                <option value="zone_leader">
                  {language === "sw" ? "Viongozi wa Kanda" : "Zone Leaders"}
                </option>
                <option value="regional_leader">
                  {language === "sw" ? "Viongozi wa Mkoa" : "Regional Leaders"}
                </option>
                <option value="district_leader">
                  {language === "sw"
                    ? "Viongozi wa Wilaya"
                    : "District Leaders"}
                </option>
                <option value="local_leader">
                  {language === "sw" ? "Wachungaji" : "Local Leaders"}
                </option>
              </select>
            </div>
            <input
              type="text"
              value={noticeForm.title}
              onChange={(e) =>
                setNoticeForm({ ...noticeForm, title: e.target.value })
              }
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
              placeholder={
                language === "sw" ? "Kichwa cha ujumbe" : "Message title"
              }
            />
            <textarea
              value={noticeForm.message}
              onChange={(e) =>
                setNoticeForm({ ...noticeForm, message: e.target.value })
              }
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
              placeholder={
                language === "sw"
                  ? "Andika ujumbe hapa..."
                  : "Write message here..."
              }
            />
            <button
              type="submit"
              className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold"
            >
              {language === "sw" ? "Tuma Ujumbe" : "Send Broadcast"}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaShieldAlt className="text-red-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === "sw"
                ? "Tangazo la Mfumo Wote"
                : "System-Wide Announcement"}
            </h2>
          </div>
          <form onSubmit={handleSystemAnnouncement} className="space-y-3">
            <input
              type="text"
              value={announcementForm.title}
              onChange={(e) =>
                setAnnouncementForm({
                  ...announcementForm,
                  title: e.target.value,
                })
              }
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
              placeholder={
                language === "sw" ? "Kichwa cha tangazo" : "Announcement title"
              }
            />
            <textarea
              value={announcementForm.message}
              onChange={(e) =>
                setAnnouncementForm({
                  ...announcementForm,
                  message: e.target.value,
                })
              }
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
              placeholder={
                language === "sw"
                  ? "Tangazo kwa wanachama wote..."
                  : "Announcement to all members..."
              }
            />
            <button
              type="submit"
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
            >
              {language === "sw" ? "Tuma kwa Wote" : "Send to All Members"}
            </button>
          </form>
        </div>
      </div>

      {/* Create Church */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FaChurch className="text-purple-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw" ? "Unda Kanisa Jipya" : "Create New Church/Unit"}
          </h2>
        </div>
        <form
          onSubmit={handleCreateChurch}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === "sw" ? "Jina" : "Name"} *
            </label>
            <input
              type="text"
              value={createChurchForm.name}
              onChange={(e) =>
                setCreateChurchForm({
                  ...createChurchForm,
                  name: e.target.value,
                })
              }
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
              placeholder={language === "sw" ? "Jina la kanisa" : "Church name"}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === "sw" ? "Aina" : "Type"} *
            </label>
            <select
              value={createChurchForm.church_type}
              onChange={(e) =>
                setCreateChurchForm({
                  ...createChurchForm,
                  church_type: e.target.value,
                })
              }
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
            >
              <option value="zone">
                {language === "sw" ? "Kanda" : "Zone"}
              </option>
              <option value="region">
                {language === "sw" ? "Mkoa" : "Region"}
              </option>
              <option value="district">
                {language === "sw" ? "Wilaya" : "District"}
              </option>
              <option value="local">
                {language === "sw" ? "Kanisa la Mtaa" : "Local Church"}
              </option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === "sw" ? "Kanisa Mama" : "Parent Church"}
            </label>
            <select
              value={createChurchForm.parent_church}
              onChange={(e) =>
                setCreateChurchForm({
                  ...createChurchForm,
                  parent_church: e.target.value,
                })
              }
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
            >
              <option value="">
                {language === "sw" ? "-- Hiari --" : "-- None (optional) --"}
              </option>
              {allChurches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.church_type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === "sw" ? "Mahali" : "Location"}
            </label>
            <input
              type="text"
              value={createChurchForm.location}
              onChange={(e) =>
                setCreateChurchForm({
                  ...createChurchForm,
                  location: e.target.value,
                })
              }
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
              placeholder={language === "sw" ? "Mahali pa kanisa" : "Location"}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
            >
              {language === "sw" ? "Unda Kanisa" : "Create Church"}
            </button>
          </div>
        </form>
      </div>

      {/* Offerings Pie + Recent Members */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Matoleo kwa Aina" : "Offerings by Type"}
          </h2>
          <ResponsiveContainer width="100%" height={280}>
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
        </div>

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
                <span className="text-xs text-gray-400">
                  {member.created_at
                    ? new Date(member.created_at).toLocaleDateString()
                    : ""}
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
      </div>

      {/* Admin Tools */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FaCog className="text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw" ? "Zana za Usimamizi" : "Admin & System Tools"}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/audit-logs"
            className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition text-center"
          >
            <FaEye className="text-2xl text-blue-500 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {language === "sw" ? "Kumbukumbu za Ukaguzi" : "Audit Logs"}
            </span>
          </Link>
          <Link
            to="/cms"
            className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition text-center"
          >
            <FaCog className="text-2xl text-purple-500 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {language === "sw" ? "Maudhui ya Tovuti" : "CMS / Site Settings"}
            </span>
          </Link>
          <Link
            to="/users"
            className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition text-center"
          >
            <FaUsers className="text-2xl text-green-500 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {language === "sw" ? "Simamia Watumiaji" : "Manage Users"}
            </span>
          </Link>
          <button
            onClick={handleSystemBackup}
            className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition text-center"
          >
            <FaDatabase className="text-2xl text-red-500 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {language === "sw"
                ? "Pakua Nakala ya Mfumo"
                : "System Data Export"}
            </span>
          </button>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
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
              className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4 py-2 border-b dark:border-gray-700 min-w-0"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {event.title}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {event.description?.substring(0, 60) || ""}...
                </p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                {event.start_date
                  ? new Date(event.start_date).toLocaleDateString()
                  : ""}
              </span>
            </div>
          ))}
          {recentEvents.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              {language === "sw" ? "Hakuna matukio" : "No upcoming events"}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <DashboardCards stats={stats} loading={loading} />
      </div>
    </div>
  );
};

export default NationalDashboard;

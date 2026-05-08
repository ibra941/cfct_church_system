import { useEffect, useState } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaChartLine,
  FaChurch,
  FaDonate,
  FaEye,
  FaMapMarkerAlt,
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
  const [loading, setLoading] = useState(true);

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
      setChartData(monthlyData.length > 0 ? monthlyData : generateMonthlyData());

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
            to="/churches"
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

      {/* DashboardCards component */}
      <div className="mt-8">
        <DashboardCards stats={stats} loading={loading} />
      </div>
    </div>
  );
};

export default RegionalDashboard;

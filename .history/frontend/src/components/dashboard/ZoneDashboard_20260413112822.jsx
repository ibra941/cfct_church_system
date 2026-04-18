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
import { useNavigate, useParams } from "react-router-dom";
import {
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
import DashboardCards from "./DashboardCards";
import PendingApprovalsPanel from "./PendingApprovalsPanel";

const ZoneDashboard = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: zoneId } = useParams();
  const [zoneName, setZoneName] = useState("");
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalOfferings: 0,
    totalChurches: 0,
    totalEvents: 0,
    totalRegions: 0,
    totalDistricts: 0,
    pendingApprovals: 0,
    monthlyGrowth: 0,
  });
  const [regionData, setRegionData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [recentMembers, setRecentMembers] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [zoneId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stats - scoped to specific zone if drilling down
      const statsUrl = zoneId
        ? `/dashboard/stats/?church_id=${zoneId}`
        : "/dashboard/stats/";
      const statsResponse = await api.get(statsUrl);
      setStats({
        totalMembers: statsResponse.data.total_members || 0,
        totalOfferings: statsResponse.data.total_offerings || 0,
        totalChurches: statsResponse.data.total_churches || 0,
        totalEvents: statsResponse.data.total_events || 0,
        totalRegions: statsResponse.data.regions || 0,
        totalDistricts: statsResponse.data.districts || 0,
        pendingApprovals: statsResponse.data.pending_approvals || 0,
        monthlyGrowth: statsResponse.data.monthly_growth || 12,
      });

      // Fetch zone name if drilling down
      if (zoneId) {
        try {
          const zoneResponse = await api.get(`/churches/${zoneId}/`);
          setZoneName(zoneResponse.data.name || "");
        } catch (e) {
          console.error("Could not fetch zone details", e);
        }
      }

      // Fetch regions - scoped to this zone if id provided
      const regionsUrl = zoneId ? `/regions/?parent_id=${zoneId}` : "/regions/";
      const regionsResponse = await api.get(regionsUrl);
      const regionsData = regionsResponse.data.results || regionsResponse.data;
      setRegionData(Array.isArray(regionsData) ? regionsData : []);

      // Fetch monthly data
      const monthlyResponse = await api.get("/finance/monthly-summary/");
      setChartData(monthlyResponse.data || generateMonthlyData());

      // Fetch recent members
      const membersResponse = await api.get("/members/?limit=5");
      const membersData = membersResponse.data.results || membersResponse.data;
      setRecentMembers(Array.isArray(membersData) ? membersData : []);

      // Fetch upcoming events
      const eventsResponse = await api.get("/events/?upcoming=true&limit=5");
      const eventsData = eventsResponse.data.results || eventsResponse.data;
      setRecentEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setStats({
        totalMembers: 0,
        totalOfferings: 0,
        totalChurches: 0,
        totalEvents: 0,
        totalRegions: 0,
        totalDistricts: 0,
        pendingApprovals: 0,
        monthlyGrowth: 0,
      });
      setRegionData([]);
      setChartData(generateMonthlyData());
      setRecentMembers([]);
      setRecentEvents([]);
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
      offerings: Math.floor(Math.random() * 500000) + 200000,
      attendance: Math.floor(Math.random() * 500) + 200,
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
      change: "+6%",
      trend: "up",
    },
    {
      title: language === "sw" ? "Makanisa" : "Churches",
      value: stats.totalChurches,
      icon: <FaChurch />,
      color: "bg-purple-500",
      subValue: `${stats.totalRegions} ${language === "sw" ? "Mikoa" : "Regions"}, ${stats.totalDistricts} ${language === "sw" ? "Wilaya" : "Districts"}`,
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Zone Dashboard Header */}
      <div className="mb-6">
        {zoneId && (
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-primary-600 hover:text-primary-700 mb-2 flex items-center space-x-1"
          >
            <span>←</span>
            <span>{language === "sw" ? "Rudi Nyuma" : "Go Back"}</span>
          </button>
        )}
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          {zoneName
            ? zoneName
            : language === "sw"
              ? "Dashibodi ya Kanda"
              : "Zone Dashboard"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {zoneId
            ? language === "sw"
              ? `Taarifa za kanda hii — mikoa ${stats.totalRegions}, wilaya ${stats.totalDistricts}`
              : `Zone details — ${stats.totalRegions} regions, ${stats.totalDistricts} districts`
            : language === "sw"
              ? `Karibu ${user?.full_name || user?.username}, kanda yako ina ${stats.totalRegions} mikoa`
              : `Welcome ${user?.full_name || user?.username}, your zone has ${stats.totalRegions} regions`}
        </p>
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
                  ? `Una ${stats.pendingApprovals} maombi ya wanachama yanayosubiri idhini katika kanda yako.`
                  : `You have ${stats.pendingApprovals} pending member registration approvals in your zone.`}
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

      <PendingApprovalsPanel />

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

        {/* Select Region */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {language === "sw" ? "Chagua Mkoa" : "Select Region"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {language === "sw"
              ? "Bonyeza mkoa ili kuona taarifa zake"
              : "Click a region to view its details"}
          </p>
          <div className="space-y-3">
            {regionData.map((region) => (
              <button
                key={region.id}
                onClick={() => navigate(`/dashboard/region/${region.id}`)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 border border-transparent hover:border-primary-400 transition text-left"
              >
                <div className="flex items-center space-x-3">
                  <FaMapMarkerAlt className="text-primary-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {region.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === "sw" ? "Mkoa" : "Region"}
                    </p>
                  </div>
                </div>
                <span className="text-primary-600 text-sm">→</span>
              </button>
            ))}
            {regionData.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                {language === "sw"
                  ? "Hakuna mikoa iliyopatikana"
                  : "No regions found"}
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

export default ZoneDashboard;

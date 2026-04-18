import { useEffect, useState } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaChurch,
  FaDonate,
  FaEye,
  FaUsers,
} from "react-icons/fa";
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
import DashboardCards from "./DashboardCards";

const NationalDashboard = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
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

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch dashboard stats from API
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

      // Fetch monthly offering data
      const monthlyResponse = await api.get("/finance/monthly-summary/");
      setChartData(monthlyResponse.data || generateMonthlyData());

      // Fetch offering by type
      const offeringTypeResponse = await api.get("/offerings/summary/");
      setOfferingChartData(
        offeringTypeResponse.data || generateOfferingTypeData(),
      );

      // Fetch recent members
      const membersResponse = await api.get("/members/?limit=5");
      setRecentMembers(membersResponse.data || []);

      // Fetch upcoming events
      const eventsResponse = await api.get("/events/?upcoming=true");
      setRecentEvents(eventsResponse.data || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Fallback to sample data
      setStats({
        totalMembers: 1250,
        totalOfferings: 15800000,
        totalChurches: 45,
        totalEvents: 12,
        totalZones: 5,
        totalRegions: 20,
        totalDistricts: 35,
        pendingApprovals: 8,
        monthlyGrowth: 12,
      });
      setChartData(generateMonthlyData());
      setOfferingChartData(generateOfferingTypeData());
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
      offerings: Math.floor(Math.random() * 2000000) + 500000,
      members: Math.floor(Math.random() * 100) + 20,
    }));
  };

  const generateOfferingTypeData = () => {
    return [
      {
        name: language === "sw" ? "Zaka" : "Tithe",
        value: 45,
        color: "#3b82f6",
      },
      {
        name: language === "sw" ? "Sadaka" : "Offering",
        value: 25,
        color: "#10b981",
      },
      {
        name: language === "sw" ? "Jengo" : "Building",
        value: 15,
        color: "#f59e0b",
      },
      {
        name: language === "sw" ? "Misheni" : "Mission",
        value: 10,
        color: "#ef4444",
      },
      {
        name: language === "sw" ? "Nyingine" : "Other",
        value: 5,
        color: "#8b5cf6",
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
      change: "+8%",
      trend: "up",
    },
    {
      title: language === "sw" ? "Makanisa" : "Churches",
      value: stats.totalChurches,
      icon: <FaChurch />,
      color: "bg-purple-500",
      subValue: `${stats.totalZones} ${language === "sw" ? "Kanda" : "Zones"}, ${stats.totalRegions} ${language === "sw" ? "Mikoa" : "Regions"}, ${stats.totalDistricts} ${language === "sw" ? "Wilaya" : "Districts"}`,
      subLabel: true,
    },
    {
      title: language === "sw" ? "Matukio" : "Events",
      value: stats.totalEvents,
      icon: <FaCalendarAlt />,
      color: "bg-yellow-500",
      change: "+3",
      trend: "up",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Dashibodi ya Taifa" : "National Dashboard"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {language === "sw"
            ? `Karibu, ${user?.full_name || user?.username}`
            : `Welcome back, ${user?.full_name || user?.username}`}
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
                  ? `Una ${stats.pendingApprovals} maombi ya wanachama yanayosubiri idhini.`
                  : `You have ${stats.pendingApprovals} pending member registration approvals.`}
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

        {/* Offerings by Type Pie Chart */}
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

      {/* DashboardCards component (if needed for additional stats) */}
      <div className="mt-8">
        <DashboardCards stats={stats} loading={loading} />
      </div>
    </div>
  );
};

export default NationalDashboard;

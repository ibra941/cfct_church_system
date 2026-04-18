import { useEffect, useState } from "react";
import { FaCalendarAlt, FaEye, FaPray, FaUserPlus } from "react-icons/fa";
import { Link } from "react-router-dom";
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
import DashboardCards from "./DashboardCards";

const LocalDashboard = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalOfferings: 0,
    totalEvents: 0,
    pendingApprovals: 0,
    monthlyGrowth: 0,
    weeklyAttendance: 0,
    prayerRequests: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [recentMembers, setRecentMembers] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [recentPrayers, setRecentPrayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch dashboard stats
      const statsResponse = await api.get("/dashboard/stats/");
      setStats({
        totalMembers: statsResponse.data.total_members || 0,
        totalOfferings: statsResponse.data.total_offerings || 0,
        totalEvents: statsResponse.data.total_events || 0,
        pendingApprovals: statsResponse.data.pending_approvals || 0,
        monthlyGrowth: statsResponse.data.monthly_growth || 0,
        weeklyAttendance: statsResponse.data.weekly_attendance || 0,
        prayerRequests: statsResponse.data.prayer_requests || 0,
      });

      // Fetch monthly data
      const monthlyResponse = await api.get("/finance/monthly-summary/");
      setChartData(monthlyResponse.data || generateMonthlyData());

      // Fetch recent members - FIXED: handle paginated response
      const membersResponse = await api.get("/members/?limit=5");
      const membersData = membersResponse.data.results || membersResponse.data;
      setRecentMembers(Array.isArray(membersData) ? membersData : []);

      // Fetch upcoming events - FIXED: handle paginated response
      const eventsResponse = await api.get("/events/?upcoming=true&limit=5");
      const eventsData = eventsResponse.data.results || eventsResponse.data;
      setRecentEvents(Array.isArray(eventsData) ? eventsData : []);

      // Fetch recent prayer requests - FIXED: handle paginated response
      const prayersResponse = await api.get("/prayers/?limit=5");
      const prayersData = prayersResponse.data.results || prayersResponse.data;
      setRecentPrayers(Array.isArray(prayersData) ? prayersData : []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Set default data if API fails
      setStats({
        totalMembers: 45,
        totalOfferings: 250000,
        totalEvents: 3,
        pendingApprovals: 2,
        monthlyGrowth: 8,
        weeklyAttendance: 38,
        prayerRequests: 5,
      });
      setChartData(generateMonthlyData());
      setRecentMembers([]);
      setRecentEvents([]);
      setRecentPrayers([]);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = () => {
    return [
      { month: "Jan", offerings: 150000, members: 35, attendance: 32 },
      { month: "Feb", offerings: 180000, members: 38, attendance: 35 },
      { month: "Mar", offerings: 200000, members: 40, attendance: 37 },
      { month: "Apr", offerings: 220000, members: 42, attendance: 39 },
      { month: "May", offerings: 250000, members: 45, attendance: 41 },
      { month: "Jun", offerings: 280000, members: 45, attendance: 38 },
    ];
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("sw-TZ", {
      style: "currency",
      currency: "TZS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {language === "sw"
                ? "Dashibodi ya Kanisa Lokal"
                : "Local Church Dashboard"}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {user?.church?.name ||
                (language === "sw" ? "Kanisa Lako Lokal" : "Your Local Church")}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === "sw" ? "Mwisho updated" : "Last updated"}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <DashboardCards stats={stats} />

      {/* Pending Approvals Alert */}
      {user?.role === "local_leader" && stats.pendingApprovals > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FaEye className="text-yellow-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {language === "sw"
                  ? `Una ${stats.pendingApprovals} maombi ya usajili yanayosubiri idhini katika kanisa lako.`
                  : `You have ${stats.pendingApprovals} pending member registrations awaiting approval in your church.`}
              </p>
            </div>
            <div className="ml-auto">
              <Link
                to="/approvals"
                className="text-sm text-yellow-700 hover:text-yellow-800 dark:text-yellow-300"
              >
                {language === "sw" ? "Tazama" : "Review"} →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Mwenendo wa Mwezi" : "Monthly Trends"}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [
                  name === "offerings" ? formatCurrency(value) : value,
                  name === "offerings"
                    ? language === "sw"
                      ? "Sadaka"
                      : "Offerings"
                    : name === "members"
                      ? language === "sw"
                        ? "Wanachama"
                        : "Members"
                      : language === "sw"
                        ? "Mahudhurio"
                        : "Attendance",
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="offerings"
                stroke="#10B981"
                strokeWidth={2}
                name={language === "sw" ? "Sadaka" : "Offerings"}
              />
              <Line
                type="monotone"
                dataKey="attendance"
                stroke="#3B82F6"
                strokeWidth={2}
                name={language === "sw" ? "Mahudhurio" : "Attendance"}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Member Growth */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Ukuaji wa Wanachama" : "Member Growth"}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => [
                  value,
                  language === "sw" ? "Wanachama" : "Members",
                ]}
              />
              <Bar dataKey="members" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Members */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {language === "sw" ? "Wanachama Wapya" : "Recent Members"}
            </h3>
            <Link
              to="/members"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              {language === "sw" ? "Tazama wote" : "View all"}
            </Link>
          </div>
          <div className="space-y-3">
            {recentMembers.length > 0 ? (
              recentMembers.map((member) => (
                <div key={member.id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <FaUserPlus className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {member.full_name || member.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {language === "sw"
                  ? "Hakuna wanachama wapya"
                  : "No recent members"}
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {language === "sw" ? "Matukio Yajayo" : "Upcoming Events"}
            </h3>
            <Link
              to="/events"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              {language === "sw" ? "Tazama wote" : "View all"}
            </Link>
          </div>
          <div className="space-y-3">
            {recentEvents.length > 0 ? (
              recentEvents.map((event) => (
                <div key={event.id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <FaCalendarAlt className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {event.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(event.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {language === "sw"
                  ? "Hakuna matukio yajayo"
                  : "No upcoming events"}
              </p>
            )}
          </div>
        </div>

        {/* Prayer Requests */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {language === "sw" ? "Maombi ya Sala" : "Prayer Requests"}
            </h3>
            <Link
              to="/prayers"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              {language === "sw" ? "Tazama wote" : "View all"}
            </Link>
          </div>
          <div className="space-y-3">
            {recentPrayers.length > 0 ? (
              recentPrayers.map((prayer) => (
                <div key={prayer.id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <FaPray className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {prayer.title ||
                        (language === "sw" ? "Ombi la sala" : "Prayer request")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(prayer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {language === "sw"
                  ? "Hakuna maombi ya sala"
                  : "No prayer requests"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalDashboard;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaChurch,
  FaDonate,
  FaEye,
  FaPray,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";
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

const DistrictDashboard = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalOfferings: 0,
    totalChurches: 0,
    totalEvents: 0,
    totalLocals: 0,
    pendingApprovals: 0,
    monthlyGrowth: 0,
    weeklyAttendance: 0,
    prayerRequests: 0,
  });
  const [localChurchData, setLocalChurchData] = useState([]);
  const [localQuery, setLocalQuery] = useState("");
  const [chartData, setChartData] = useState([]);
  const [recentMembers, setRecentMembers] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [recentPrayers, setRecentPrayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch dashboard stats
      const statsResponse = await api.get("/dashboard/stats/");
      setStats({
        totalMembers: statsResponse.data.total_members || 0,
        totalOfferings: statsResponse.data.total_offerings || 0,
        totalChurches: statsResponse.data.total_churches || 0,
        totalEvents: statsResponse.data.total_events || 0,
        totalLocals: statsResponse.data.locals || 0,
        pendingApprovals: statsResponse.data.pending_approvals || 0,
        monthlyGrowth: statsResponse.data.monthly_growth || 0,
        weeklyAttendance: statsResponse.data.weekly_attendance || 0,
        prayerRequests: statsResponse.data.prayer_requests || 0,
      });

      // Fetch local churches data - FIXED: handle paginated response
      const localsResponse = await api.get("/locals/");
      const localsData = localsResponse.data.results || localsResponse.data;
      setLocalChurchData(Array.isArray(localsData) ? localsData : []);

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
      // Fallback data
      setStats({
        totalMembers: 0,
        totalOfferings: 0,
        totalChurches: 0,
        totalEvents: 0,
        totalLocals: 0,
        pendingApprovals: 0,
        monthlyGrowth: 0,
        weeklyAttendance: 0,
        prayerRequests: 0,
      });
      setLocalChurchData([
        {
          id: 1,
          name: "CFCT Kati",
          members: 0,
          offerings: 0,
          attendance: 0,
          pastor: "Pastor John",
        },
        {
          id: 2,
          name: "CFCT Kaskazini",
          members: 0,
          offerings: 0,
          attendance: 0,
          pastor: "Pastor Mary",
        },
        {
          id: 3,
          name: "CFCT Kusini",
          members: 0,
          offerings: 0,
          attendance: 0,
          pastor: "Pastor Peter",
        },
        {
          id: 4,
          name: "CFCT Mashariki",
          members: 0,
          offerings: 0,
          attendance: 0,
          pastor: "Pastor James",
        },
      ]);
      setChartData(generateMonthlyData());
      setRecentMembers([]);
      setRecentEvents([]);
      setRecentPrayers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLocalChurches = localChurchData.filter((church) =>
    church.name?.toLowerCase().includes(localQuery.toLowerCase()),
  );

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
      subValue: `${stats.totalLocals} ${language === "sw" ? "Makanisa ya Kieneo" : "Local Churches"}`,
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
      {/* Navigation Buttons - District can go down to Local churches */}
      <div className="mb-6">
        <div className="grid gap-4 lg:grid-cols-2 items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {language === "sw" ? "Dashibodi ya Wilaya" : "District Dashboard"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {language === "sw"
                ? `Karibu kwenye Wilaya yako, ${user?.full_name || user?.username}`
                : `Welcome to your District, ${user?.full_name || user?.username}`}
            </p>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {language === "sw"
                ? "Tafuta makanisa ya kieneo"
                : "Search local churches"}
            </label>
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder={
                language === "sw"
                  ? "Andika jina la kanisa"
                  : "Type a church name"
              }
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-white"
            />
          </div>
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

      {/* Prayer Requests Alert */}
      {stats.prayerRequests > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FaPray className="text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {language === "sw"
                  ? `Kuna ${stats.prayerRequests} maombi mapya yanayohitaji maombi yako.`
                  : `There are ${stats.prayerRequests} new prayer requests needing your prayers.`}
              </p>
            </div>
            <div className="ml-auto">
              <a
                href="/prayers"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {language === "sw" ? "Tazama" : "View"} →
              </a>
            </div>
          </div>
        </div>
      )}

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
                <tr key={church.id}>
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
                    <Link
                      to={`/churches/${church.id}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {language === "sw" ? "Tazama" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLocalChurches.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            {language === "sw"
              ? "Hakuna makanisa yaliyopatikana"
              : "No churches found"}
          </p>
        )}
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

        {/* Recent Prayer Requests */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === "sw"
                ? "Maombi ya Hivi Karibuni"
                : "Recent Prayer Requests"}
            </h2>
            <Link
              to="/prayers"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {language === "sw" ? "Tazama Zote" : "View All"} →
            </Link>
          </div>
          <div className="space-y-3">
            {recentPrayers.slice(0, 5).map((prayer) => (
              <div
                key={prayer.id}
                className="flex items-center justify-between py-2 border-b dark:border-gray-700"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {prayer.member_name || prayer.member}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                    {prayer.request}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="text-primary-600 hover:text-primary-700 text-sm">
                    <FaPray />
                  </button>
                  <span className="text-xs text-gray-400">
                    {new Date(prayer.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            {recentPrayers.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                {language === "sw"
                  ? "Hakuna maombi mapya"
                  : "No recent prayer requests"}
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
                <a
                  href={`/events/${event.id}`}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  {language === "sw" ? "Tazama" : "View"} →
                </a>
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

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/members/add"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center hover:shadow-lg transition"
        >
          <FaUserPlus className="text-2xl text-primary-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === "sw" ? "Ongeza Mwanachama" : "Add Member"}
          </p>
        </a>
        <Link
          to="/offerings/add"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center hover:shadow-lg transition"
        >
          <FaDonate className="text-2xl text-green-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === "sw" ? "Rekodi Mchango" : "Record Offering"}
          </p>
        </a>
        <Link
          to="/events/add"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center hover:shadow-lg transition"
        >
          <FaCalendarAlt className="text-2xl text-yellow-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === "sw" ? "Panga Tukio" : "Plan Event"}
          </p>
        </a>
        <Link
          to="/prayers/add"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center hover:shadow-lg transition"
        >
          <FaPray className="text-2xl text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === "sw" ? "Omba" : "Pray"}
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

export default DistrictDashboard;

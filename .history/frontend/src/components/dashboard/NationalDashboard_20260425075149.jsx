import { useEffect, useState } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaChurch,
  FaDonate,
  FaEye,
  FaMapMarkerAlt,
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
  const [zones, setZones] = useState([]);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [churches, setChurches] = useState([]);
  const [filters, setFilters] = useState({
    zoneId: "",
    regionId: "",
    districtId: "",
    churchName: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [
    filters.zoneId,
    filters.regionId,
    filters.districtId,
    filters.churchName,
  ]);

  useEffect(() => {
    fetchZones();
  }, []);

  useEffect(() => {
    fetchRegions(filters.zoneId);
  }, [filters.zoneId]);

  useEffect(() => {
    fetchDistricts(filters.zoneId, filters.regionId);
  }, [filters.zoneId, filters.regionId]);

  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (filters.zoneId) params.set("zone_id", filters.zoneId);
    if (filters.regionId) params.set("region_id", filters.regionId);
    if (filters.districtId) params.set("district_id", filters.districtId);
    if (filters.churchName.trim())
      params.set("church_name", filters.churchName.trim());
    return params;
  };

  const withParams = (path, extraParams = {}) => {
    const params = buildFilterParams();
    Object.entries(extraParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  };

  const fetchZones = async () => {
    const zonesResponse = await api.get("/zones/");
    const zonesData = zonesResponse.data.results || zonesResponse.data || [];
    setZones(Array.isArray(zonesData) ? zonesData : []);
  };

  const fetchRegions = async (zoneId) => {
    const endpoint = zoneId ? `/regions/?zone_id=${zoneId}` : "/regions/";
    const response = await api.get(endpoint);
    const data = response.data.results || response.data || [];
    setRegions(Array.isArray(data) ? data : []);
  };

  const fetchDistricts = async (zoneId, regionId) => {
    const params = new URLSearchParams();
    if (zoneId) params.set("zone_id", zoneId);
    if (regionId) params.set("region_id", regionId);
    const query = params.toString();
    const endpoint = query ? `/districts/?${query}` : "/districts/";
    const response = await api.get(endpoint);
    const data = response.data.results || response.data || [];
    setDistricts(Array.isArray(data) ? data : []);
  };

  const handleFilterChange = (key, value) => {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      return next;
    });
  };

  const clearFilters = () => {
    setFilters({
      zoneId: "",
      regionId: "",
      districtId: "",
      churchName: "",
    });
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch dashboard stats from API
      const statsResponse = await api.get(withParams("/dashboard/stats/"));
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
      } catch (error) {
        console.log("Offerings summary endpoint not available yet");
        setOfferingChartData(generateOfferingTypeData());
      }

      // Fetch recent members
      const membersResponse = await api.get(
        withParams("/members/", { limit: 5 }),
      );
      const membersData = extractListData(membersResponse.data);
      setRecentMembers(Array.isArray(membersData) ? membersData : []);

      // Fetch upcoming events
      const eventsResponse = await api.get(
        withParams("/events/", { upcoming: true }),
      );
      const eventsData = extractListData(eventsResponse.data);
      setRecentEvents(Array.isArray(eventsData) ? eventsData : []);

      const churchesResponse = await api.get(
        withParams("/churches/", { church_type: "local" }),
      );
      const churchesData = extractListData(churchesResponse.data);
      setChurches(Array.isArray(churchesData) ? churchesData : []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Fallback to sample data
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
      setChurches([]);
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
      {
        name: language === "sw" ? "Nyingine" : "Other",
        value: 0,
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
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          {language === "sw" ? "Dashibodi ya Taifa" : "National Dashboard"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {language === "sw"
            ? `Karibu tena, ${user?.full_name || user?.username}. Hapa unaweza kusimamia kanisa lote.`
            : `Welcome back, ${user?.full_name || user?.username}. Manage and monitor the entire church from here.`}
        </p>
      </div>

      {/* Church Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === "sw" ? "Chuja Makanisa" : "Filter Churches"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === "sw"
                ? "Chuja kwa kanda, mkoa, wilaya au jina la kanisa. Unaweza kutumia chujio kimoja au mchanganyiko wake."
                : "Filter by zone, region, district, or church name. Each filter works alone or together."}
            </p>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {language === "sw" ? "Futa Vichujio" : "Clear Filters"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {language === "sw" ? "Kanda" : "Zone"}
            </span>
            <select
              value={filters.zoneId}
              onChange={(event) =>
                handleFilterChange("zoneId", event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">
                {language === "sw" ? "Kanda zote" : "All zones"}
              </option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {language === "sw" ? "Mkoa" : "Region"}
            </span>
            <select
              value={filters.regionId}
              onChange={(event) =>
                handleFilterChange("regionId", event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">
                {language === "sw" ? "Mikoa yote" : "All regions"}
              </option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {language === "sw" ? "Wilaya" : "District"}
            </span>
            <select
              value={filters.districtId}
              onChange={(event) =>
                handleFilterChange("districtId", event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">
                {language === "sw" ? "Wilaya zote" : "All districts"}
              </option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {language === "sw" ? "Jina la Kanisa" : "Church Name"}
            </span>
            <input
              type="text"
              value={filters.churchName}
              onChange={(event) =>
                handleFilterChange("churchName", event.target.value)
              }
              placeholder={
                language === "sw" ? "Tafuta kanisa" : "Search church name"
              }
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </label>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {language === "sw" ? "Kanda" : "Zones"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === "sw"
              ? "Bonyeza kanda ili kuona taarifa zake zote"
              : "Click a zone to view its detailed information"}
          </p>
        </div>
        {zones.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            {language === "sw"
              ? "Hakuna kanda zilizopatikana"
              : "No zones found"}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((zone) => (
              <button
                key={zone.id}
                onClick={() => navigate(`/dashboard/zone/${zone.id}`)}
                className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-500 border border-transparent transition text-left w-full"
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
        <div className="mt-4 text-right">
          <Link
            to="/churches"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {language === "sw" ? "Tazama Makanisa Yote" : "View All Churches"} →
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === "sw"
                ? "Makanisa Yaliyopatikana"
                : "Matched Churches"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === "sw"
                ? `${stats.totalChurches} makanisa ya ndani yanalingana na chujio lako.`
                : `${stats.totalChurches} local churches match the current filters.`}
            </p>
          </div>
        </div>

        {churches.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            {language === "sw"
              ? "Hakuna makanisa yanayolingana na chujio lako"
              : "No churches match the current filters"}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {churches.slice(0, 9).map((church) => (
              <div
                key={church.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <p className="font-semibold text-gray-900 dark:text-white">
                  {church.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {church.city ||
                    (language === "sw" ? "Hakuna mji" : "No city")}
                </p>
              </div>
            ))}
          </div>
        )}
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

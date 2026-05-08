import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FaCalendarAlt,
  FaChurch,
  FaPhone,
  FaPray,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../services/api";

const MemberDashboard = () => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [submittingPrayer, setSubmittingPrayer] = useState(false);
  const [data, setData] = useState({
    member: null,
    church: null,
    leaders: [],
    departments: [],
    events: { upcoming: [], past: [] },
    prayers: [],
  });
  const [prayerText, setPrayerText] = useState("");

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get("/dashboard/member/");
      setData(response.data || {});
    } catch (error) {
      toast.error(
        language === "sw"
          ? "Imeshindikana kupata dashibodi ya mwanachama"
          : "Failed to load member dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const statusLabel = (status) => {
    if (status === "approved")
      return language === "sw" ? "Imekubaliwa" : "Approved";
    if (status === "pending")
      return language === "sw" ? "Inasubiri" : "Pending";
    if (status === "rejected")
      return language === "sw" ? "Imekataliwa" : "Rejected";
    return language === "sw" ? "Haijaombwa" : "Not Applied";
  };

  const statusClassName = (status) => {
    if (status === "approved") return "bg-green-100 text-green-800";
    if (status === "pending") return "bg-yellow-100 text-yellow-800";
    if (status === "rejected") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-700";
  };

  const applyDepartment = async (departmentId) => {
    try {
      await api.post(`/departments/${departmentId}/apply/`);
      toast.success(
        language === "sw"
          ? "Ombi la kujiunga na idara limetumwa"
          : "Department application submitted",
      );
      fetchDashboard();
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kutuma ombi"
            : "Failed to submit application"),
      );
    }
  };

  const registerEvent = async (eventId) => {
    try {
      await api.post(`/events/${eventId}/register/`);
      toast.success(
        language === "sw"
          ? "Umesajiliwa kwenye tukio"
          : "Event registration successful",
      );
      fetchDashboard();
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kusajili tukio"
            : "Failed to register event"),
      );
    }
  };

  const submitPrayer = async (e) => {
    e.preventDefault();
    if (!prayerText.trim()) {
      toast.error(
        language === "sw"
          ? "Andika ombi la maombi kwanza"
          : "Please enter your prayer request",
      );
      return;
    }

    setSubmittingPrayer(true);
    try {
      await api.post("/prayers/", { request: prayerText.trim() });
      setPrayerText("");
      toast.success(
        language === "sw"
          ? "Ombi la maombi limetumwa kwa viongozi"
          : "Prayer request sent to church leaders",
      );
      fetchDashboard();
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ||
          (language === "sw"
            ? "Imeshindikana kutuma ombi"
            : "Failed to submit prayer request"),
      );
    } finally {
      setSubmittingPrayer(false);
    }
  };

  const upcomingEvents = useMemo(() => data?.events?.upcoming || [], [data]);
  const pastEvents = useMemo(() => data?.events?.past || [], [data]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Dashibodi ya Mwanachama" : "Member Dashboard"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {language === "sw" ? "Kanisa" : "Church"}: {data?.church?.name || "-"}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FaUserTie className="text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {language === "sw" ? "Taarifa za Viongozi" : "Leader Information"}
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {(data?.leaders || []).map((leader) => (
            <div
              key={leader.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <p className="font-semibold text-gray-900 dark:text-white">
                {leader.full_name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {leader.role}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                {leader.email || "-"}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center mt-1">
                <FaPhone className="mr-2" />
                {leader.phone || "-"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FaPray className="text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {language === "sw" ? "Ombi la Maombi" : "Prayer Request"}
            </h2>
          </div>
          <form onSubmit={submitPrayer} className="space-y-3">
            <textarea
              rows="4"
              className="input"
              value={prayerText}
              onChange={(e) => setPrayerText(e.target.value)}
              placeholder={
                language === "sw"
                  ? "Andika ombi lako la maombi hapa"
                  : "Write your prayer request here"
              }
            />
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={submittingPrayer}
            >
              {submittingPrayer
                ? language === "sw"
                  ? "Inatuma..."
                  : "Submitting..."
                : language === "sw"
                  ? "Tuma Ombi"
                  : "Send Request"}
            </button>
          </form>
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
            {(data?.prayers || []).map((prayer) => (
              <div
                key={prayer.id}
                className="text-sm border-b border-gray-100 dark:border-gray-700 pb-2"
              >
                <p className="text-gray-800 dark:text-gray-200">
                  {prayer.request}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(prayer.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FaUsers className="text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {language === "sw" ? "Idara" : "Departments"}
            </h2>
          </div>
          <div className="space-y-3">
            {(data?.departments || []).map((dept) => (
              <div
                key={dept.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {dept.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {dept.leader_name || "-"}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${statusClassName(dept.status)}`}
                  >
                    {statusLabel(dept.status)}
                  </span>
                </div>
                {dept.status !== "approved" && (
                  <button
                    onClick={() => applyDepartment(dept.id)}
                    className="mt-3 text-sm btn-secondary"
                  >
                    {language === "sw" ? "Omba Kujiunga" : "Apply to Join"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FaCalendarAlt className="text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {language === "sw" ? "Matukio ya Kanisa" : "Church Events"}
          </h2>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          {language === "sw" ? "Yanayokuja" : "Upcoming"}
        </h3>
        <div className="grid md:grid-cols-2 gap-3 mb-5">
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
            >
              <p className="font-medium text-gray-900 dark:text-white">
                {event.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(event.start_date).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                {event.description}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {event.venue || "-"}
                </span>
                <button
                  onClick={() => registerEvent(event.id)}
                  disabled={event.registration_status === "registered"}
                  className="btn-primary text-sm"
                >
                  {event.registration_status === "registered"
                    ? language === "sw"
                      ? "Umesajiliwa"
                      : "Registered"
                    : language === "sw"
                      ? "Jisajili"
                      : "Register"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          {language === "sw" ? "Yaliyopita" : "Past"}
        </h3>
        <div className="space-y-2">
          {pastEvents.map((event) => (
            <div
              key={event.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
            >
              <p className="font-medium text-gray-900 dark:text-white">
                {event.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(event.start_date).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex items-center space-x-3">
        <FaChurch className="text-primary-600" />
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {language === "sw"
            ? "Maudhui yote yamechujwa kulingana na kanisa ulilochagua wakati wa usajili."
            : "All dashboard information is filtered by the church selected during registration."}
        </p>
      </div>
    </div>
  );
};

export default MemberDashboard;

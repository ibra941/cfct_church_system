import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaChurch,
  FaDonate,
  FaPhone,
  FaPray,
  FaUser,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../services/api";

const MemberDashboard = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { id: memberId } = useParams();
  // When memberId is set, a leader is viewing another member (read-only)
  const isLeaderView = !!memberId;
  const [loading, setLoading] = useState(true);
  const [submittingPrayer, setSubmittingPrayer] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [submittingOffering, setSubmittingOffering] = useState(false);
  const [data, setData] = useState({
    member: null,
    church: null,
    pastor: null,
    departments: [],
    events: { upcoming: [], past: [] },
    prayers: [],
    offerings: [],
    offering_summary: {},
    activities: [],
  });
  const [prayerText, setPrayerText] = useState("");
  const [contactForm, setContactForm] = useState({
    full_name: "",
    email: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [offeringForm, setOfferingForm] = useState({
    offering_type: "offering",
    amount: "",
    payment_method: "cash",
    notes: "",
  });

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const url = memberId
        ? `/dashboard/member/?user_id=${memberId}`
        : "/dashboard/member/";
      const response = await api.get(url);
      const payload = response.data || {};
      setData(payload);
      setContactForm({
        full_name: payload?.member?.full_name || "",
        email: payload?.member?.email || "",
        phone: payload?.member?.phone || "",
      });
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
  }, [memberId]);

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

  const updateContact = async (e) => {
    e.preventDefault();
    setSavingContact(true);
    try {
      await api.patch("/auth/me/update/", contactForm);
      toast.success(
        language === "sw"
          ? "Taarifa za mawasiliano zimehifadhiwa"
          : "Contact information updated",
      );
      fetchDashboard();
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ||
          (language === "sw"
            ? "Imeshindikana kuhifadhi taarifa"
            : "Failed to update contact information"),
      );
    } finally {
      setSavingContact(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.current_password || !passwordForm.new_password) {
      toast.error(
        language === "sw"
          ? "Jaza nenosiri la sasa na jipya"
          : "Enter current and new password",
      );
      return;
    }

    setChangingPassword(true);
    try {
      await api.post("/auth/change-password/", passwordForm);
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      toast.success(
        language === "sw"
          ? "Nenosiri limebadilishwa"
          : "Password changed successfully",
      );
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message = Array.isArray(detail) ? detail[0] : detail;
      toast.error(
        message ||
          (language === "sw"
            ? "Imeshindikana kubadilisha nenosiri"
            : "Failed to change password"),
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const submitOffering = async (e) => {
    e.preventDefault();
    if (!offeringForm.amount) {
      toast.error(language === "sw" ? "Weka kiasi" : "Enter amount");
      return;
    }

    setSubmittingOffering(true);
    try {
      await api.post("/offerings/", {
        offering_type: offeringForm.offering_type,
        amount: Number(offeringForm.amount),
        payment_method: offeringForm.payment_method,
        notes: offeringForm.notes,
        member: data?.member?.id,
      });
      setOfferingForm({
        offering_type: "offering",
        amount: "",
        payment_method: "cash",
        notes: "",
      });
      toast.success(
        language === "sw"
          ? "Mchango umewasilishwa"
          : "Offering submitted successfully",
      );
      fetchDashboard();
    } catch (error) {
      toast.error(
        error?.response?.data?.non_field_errors ||
          (language === "sw"
            ? "Imeshindikana kuwasilisha mchango"
            : "Failed to submit offering"),
      );
    } finally {
      setSubmittingOffering(false);
    }
  };

  const upcomingEvents = useMemo(() => data?.events?.upcoming || [], [data]);
  const pastEvents = useMemo(() => data?.events?.past || [], [data]);
  const activities = useMemo(() => data?.activities || [], [data]);
  const offeringSummary = data?.offering_summary || {};

  const backDashboardPath =
    user?.role === "local_leader"
      ? "/dashboard/church"
      : user?.role === "district_leader"
        ? "/dashboard/district"
        : user?.role === "regional_leader"
          ? "/dashboard/regional"
          : user?.role === "zone_leader"
            ? "/dashboard/zone"
            : user?.role === "national_leader"
              ? "/dashboard/national"
              : null;

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
        {isLeaderView ? (
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 mb-3"
          >
            <FaArrowLeft className="mr-2" />
            {language === "sw" ? "Rudi Nyuma" : "Go Back"}
          </button>
        ) : (
          backDashboardPath && (
            <Link
              to={backDashboardPath}
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 mb-3"
            >
              <FaArrowLeft className="mr-2" />
              {language === "sw"
                ? "Rudi Dashibodi Kuu"
                : "Back to Leader Dashboard"}
            </Link>
          )
        )}
        {isLeaderView && (
          <div className="mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
            {language === "sw"
              ? `Unaangalia dashibodi ya: ${data?.member?.full_name || data?.member?.username || "Mwanachama"}`
              : `Viewing dashboard for: ${data?.member?.full_name || data?.member?.username || "Member"}`}
          </div>
        )}
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
            {language === "sw" ? "Taarifa za Mchungaji" : "Pastor Information"}
          </h2>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">
              {language === "sw" ? "Kanisa" : "Church"}:
            </span>{" "}
            {data?.church?.name || "-"}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">
              {language === "sw" ? "Mchungaji" : "Pastor"}:
            </span>{" "}
            {data?.pastor?.name || "-"}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Email:</span>{" "}
            {data?.pastor?.email || "-"}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
            <FaPhone className="mr-2" />
            <span className="font-semibold mr-1">
              {language === "sw" ? "Simu" : "Phone"}:
            </span>
            {data?.pastor?.phone || "-"}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FaUser className="text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {language === "sw" ? "Menyu ya Mipangilio" : "Settings Menu"}
            </h2>
          </div>
          <form onSubmit={updateContact} className="space-y-3 mb-6">
            <input
              className="input"
              placeholder={language === "sw" ? "Jina Kamili" : "Full Name"}
              value={contactForm.full_name}
              onChange={(e) =>
                setContactForm((prev) => ({
                  ...prev,
                  full_name: e.target.value,
                }))
              }
            />
            <input
              className="input"
              placeholder="Email"
              value={contactForm.email}
              onChange={(e) =>
                setContactForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
            <input
              className="input"
              placeholder={language === "sw" ? "Namba ya Simu" : "Phone Number"}
              value={contactForm.phone}
              onChange={(e) =>
                setContactForm((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
            <button
              className="btn-secondary w-full"
              type="submit"
              disabled={savingContact}
            >
              {savingContact
                ? language === "sw"
                  ? "Inahifadhi..."
                  : "Saving..."
                : language === "sw"
                  ? "Hifadhi Mawasiliano"
                  : "Save Contact Info"}
            </button>
          </form>

          <form onSubmit={changePassword} className="space-y-3">
            <input
              type="password"
              className="input"
              placeholder={
                language === "sw" ? "Nenosiri la Sasa" : "Current Password"
              }
              value={passwordForm.current_password}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  current_password: e.target.value,
                }))
              }
            />
            <input
              type="password"
              className="input"
              placeholder={
                language === "sw" ? "Nenosiri Jipya" : "New Password"
              }
              value={passwordForm.new_password}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  new_password: e.target.value,
                }))
              }
            />
            <input
              type="password"
              className="input"
              placeholder={
                language === "sw"
                  ? "Thibitisha Nenosiri Jipya"
                  : "Confirm New Password"
              }
              value={passwordForm.confirm_password}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  confirm_password: e.target.value,
                }))
              }
            />
            <button
              className="btn-primary w-full"
              type="submit"
              disabled={changingPassword}
            >
              {changingPassword
                ? language === "sw"
                  ? "Inabadilisha..."
                  : "Changing..."
                : language === "sw"
                  ? "Badilisha Nenosiri"
                  : "Change Password"}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FaDonate className="text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {language === "sw" ? "Changia Kanisa" : "Contribute Offerings"}
            </h2>
          </div>
          <form onSubmit={submitOffering} className="space-y-3 mb-5">
            <select
              className="input"
              value={offeringForm.offering_type}
              onChange={(e) =>
                setOfferingForm((prev) => ({
                  ...prev,
                  offering_type: e.target.value,
                }))
              }
            >
              <option value="tithe">
                {language === "sw" ? "Zaka" : "Tithe"}
              </option>
              <option value="offering">
                {language === "sw" ? "Sadaka" : "Offering"}
              </option>
              <option value="building">
                {language === "sw" ? "Jengo" : "Building"}
              </option>
              <option value="mission">
                {language === "sw" ? "Misheni" : "Mission"}
              </option>
            </select>
            <input
              type="number"
              step="0.01"
              className="input"
              placeholder={language === "sw" ? "Kiasi" : "Amount"}
              value={offeringForm.amount}
              onChange={(e) =>
                setOfferingForm((prev) => ({ ...prev, amount: e.target.value }))
              }
            />
            <select
              className="input"
              value={offeringForm.payment_method}
              onChange={(e) =>
                setOfferingForm((prev) => ({
                  ...prev,
                  payment_method: e.target.value,
                }))
              }
            >
              <option value="cash">
                {language === "sw" ? "Taslimu" : "Cash"}
              </option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online</option>
            </select>
            <textarea
              rows="2"
              className="input"
              placeholder={
                language === "sw" ? "Maelezo (hiari)" : "Notes (optional)"
              }
              value={offeringForm.notes}
              onChange={(e) =>
                setOfferingForm((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
            <button
              className="btn-primary w-full"
              type="submit"
              disabled={submittingOffering}
            >
              {submittingOffering
                ? language === "sw"
                  ? "Inawasilisha..."
                  : "Submitting..."
                : language === "sw"
                  ? "Wasilisha Mchango"
                  : "Submit Offering"}
            </button>
          </form>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-100 dark:bg-gray-700 p-3 text-sm">
              <p className="text-gray-500 dark:text-gray-300">Tithe</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {offeringSummary.tithe || 0}
              </p>
            </div>
            <div className="rounded-lg bg-gray-100 dark:bg-gray-700 p-3 text-sm">
              <p className="text-gray-500 dark:text-gray-300">Offering</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {offeringSummary.offering || 0}
              </p>
            </div>
            <div className="rounded-lg bg-gray-100 dark:bg-gray-700 p-3 text-sm">
              <p className="text-gray-500 dark:text-gray-300">Building</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {offeringSummary.building || 0}
              </p>
            </div>
            <div className="rounded-lg bg-gray-100 dark:bg-gray-700 p-3 text-sm">
              <p className="text-gray-500 dark:text-gray-300">Mission</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {offeringSummary.mission || 0}
              </p>
            </div>
          </div>
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
                    disabled={dept.status === "pending"}
                    className="mt-3 text-sm btn-secondary"
                  >
                    {dept.status === "pending"
                      ? language === "sw"
                        ? "Ombi Linasubiri"
                        : "Request Pending"
                      : language === "sw"
                        ? "Omba Kujiunga"
                        : "Apply to Join"}
                  </button>
                )}
                {dept.status === "rejected" && dept.review_notes && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {language === "sw" ? "Sababu:" : "Reason:"}{" "}
                    {dept.review_notes}
                  </p>
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
              {event.images?.[0] && (
                <img
                  src={event.images[0]}
                  alt={event.title}
                  className="w-full h-32 object-cover rounded mt-3"
                />
              )}
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

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {language === "sw" ? "Rekodi ya Shughuli" : "Activity Record"}
        </h2>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {activities.map((activity, index) => (
            <div
              key={`${activity.type}-${activity.created_at}-${index}`}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
            >
              <p className="font-medium text-gray-900 dark:text-white">
                {activity.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {activity.description}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(activity.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === "sw"
                ? "Hakuna rekodi bado"
                : "No activity records yet"}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {language === "sw" ? "Rekodi za Matoleo" : "Offering Records"}
        </h2>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {(data?.offerings || []).map((offering) => (
            <div
              key={offering.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
            >
              <p className="font-medium text-gray-900 dark:text-white">
                {offering.offering_type_display} - {offering.amount}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {offering.payment_method} | {offering.receipt_no || "-"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(offering.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          {(data?.offerings || []).length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === "sw"
                ? "Hakuna matoleo yaliyorekodiwa"
                : "No offerings recorded yet"}
            </p>
          )}
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

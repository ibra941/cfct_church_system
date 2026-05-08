import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FaCheck,
  FaEye,
  FaPray,
  FaTimes,
  FaUserFriends,
  FaUsers,
} from "react-icons/fa";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const RegisterApproval = () => {
  const { language } = useLanguage();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvImportResult, setCsvImportResult] = useState(null);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [duplicateData, setDuplicateData] = useState({
    duplicate_email_groups: [],
    duplicate_phone_groups: [],
  });
  const [selectedPrimaryByGroup, setSelectedPrimaryByGroup] = useState({});
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchRegistrations();
    fetchDuplicates();
  }, []);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const response = await api.get("/members/registrations/pending/");
      const data = response.data?.results || response.data || [];
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      toast.error(
        language === "sw"
          ? "Hitilafu kupata maombi"
          : "Error fetching requests",
      );
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDuplicates = async () => {
    setDuplicatesLoading(true);
    try {
      const response = await api.get("/members/registrations/duplicates/");
      setDuplicateData({
        duplicate_email_groups: response.data?.duplicate_email_groups || [],
        duplicate_phone_groups: response.data?.duplicate_phone_groups || [],
      });
    } catch (error) {
      console.error(error);
      setDuplicateData({
        duplicate_email_groups: [],
        duplicate_phone_groups: [],
      });
      toast.error(
        language === "sw"
          ? "Imeshindikana kupata rekodi zenye marudio"
          : "Failed to fetch duplicate records",
      );
    } finally {
      setDuplicatesLoading(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      toast.error(
        language === "sw"
          ? "Chagua faili la CSV kwanza"
          : "Select a CSV file first",
      );
      return;
    }

    setImportingCsv(true);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const response = await api.post(
        "/members/registrations/import/csv/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      setCsvImportResult(response.data);
      toast.success(
        language === "sw"
          ? "Uingizaji wa CSV umefanikiwa"
          : "CSV import completed",
      );
      setCsvFile(null);
      fetchRegistrations();
      fetchDuplicates();
    } catch (error) {
      console.error(error);
      toast.error(
        language === "sw"
          ? "Uingizaji wa CSV umeshindikana"
          : "CSV import failed",
      );
    } finally {
      setImportingCsv(false);
    }
  };

  const handleMerge = async (primaryUserId, duplicateUserId) => {
    try {
      await api.post("/members/registrations/merge-duplicates/", {
        primary_user_id: primaryUserId,
        duplicate_user_id: duplicateUserId,
      });
      toast.success(
        language === "sw"
          ? "Mchanganyo wa rekodi umefanikiwa"
          : "Duplicate merge completed",
      );
      fetchDuplicates();
      fetchRegistrations();
    } catch (error) {
      console.error(error);
      toast.error(
        language === "sw"
          ? "Imeshindikana kuunganisha rekodi"
          : "Failed to merge records",
      );
    }
  };

  const renderDuplicateGroup = (group, type) => {
    const groupKeyValue = type === "email" ? group.email : group.phone;
    const groupKey = `${type}-${groupKeyValue}`;
    const members = group.members || [];
    if (members.length < 2) return null;

    const selectedPrimary = selectedPrimaryByGroup[groupKey] || members[0]?.id;

    return (
      <div
        key={groupKey}
        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">
              {type === "email"
                ? "Email"
                : language === "sw"
                  ? "Simu"
                  : "Phone"}
              :
            </span>{" "}
            {groupKeyValue}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              {language === "sw"
                ? "Hifadhi kama rekodi kuu"
                : "Keep as primary"}
            </label>
            <select
              value={selectedPrimary}
              onChange={(e) =>
                setSelectedPrimaryByGroup((prev) => ({
                  ...prev,
                  [groupKey]: Number(e.target.value),
                }))
              }
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800"
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name || member.username || `#${member.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          {members.map((member) => {
            const isPrimary = member.id === selectedPrimary;
            return (
              <div
                key={member.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-gray-50 dark:bg-gray-900 rounded px-3 py-2"
              >
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {member.full_name || member.username || `User ${member.id}`}
                </div>
                {isPrimary ? (
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 w-fit">
                    {language === "sw" ? "Rekodi kuu" : "Primary"}
                  </span>
                ) : (
                  <button
                    onClick={() => handleMerge(selectedPrimary, member.id)}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-xs"
                  >
                    {language === "sw"
                      ? "Unganisha kwenye rekodi kuu"
                      : "Merge into primary"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleApproval = async (id, action, reason = "") => {
    try {
      await api.post(`/members/registrations/${id}/${action}/`, {
        rejection_reason: reason || "",
      });
      toast.success(
        language === "sw"
          ? `Ombi lime${action === "approve" ? "kubaliwa" : "kataliwa"}`
          : `Request ${action === "approve" ? "approved" : "rejected"}`,
      );
      fetchRegistrations();
      setShowRejectModal(false);
      setRejectReason("");
    } catch (error) {
      toast.error(
        language === "sw" ? "Hitilafu imetokea" : "An error occurred",
      );
    }
  };

  const handleRejectClick = (id) => {
    setSelectedId(id);
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (!rejectReason.trim()) {
      toast.error(
        language === "sw"
          ? "Sababu ya kukataa inahitajika"
          : "Rejection reason is required",
      );
      return;
    }
    if (selectedId) {
      handleApproval(selectedId, "reject", rejectReason);
    }
  };

  const viewDetails = (registration) => {
    const normalizedRegistration = {
      ...registration,
      personal_info: registration.personal_info || {
        full_name: registration.full_name || "",
        email: registration.email || "",
        phone: registration.phone || "",
      },
      guardian_info: registration.guardian_info || {},
      spiritual_info: registration.spiritual_info || {},
    };
    setSelectedRegistration(normalizedRegistration);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        color: "bg-yellow-100 text-yellow-800",
        label: language === "sw" ? "Inasubiri" : "Pending",
      },
      approved: {
        color: "bg-green-100 text-green-800",
        label: language === "sw" ? "Imekubaliwa" : "Approved",
      },
      rejected: {
        color: "bg-red-100 text-red-800",
        label: language === "sw" ? "Imekataliwa" : "Rejected",
      },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatLabel = (key) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  const renderInfoSection = (title, icon, data) => {
    const entries = Object.entries(data || {}).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== "";
    });

    if (entries.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b pb-2">
          {icon}
          {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map(([key, value]) => (
            <div key={key}>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatLabel(key)}
              </p>
              <p className="font-medium break-words">
                {Array.isArray(value) ? value.join(", ") : String(value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {language === "sw" ? "Uingizaji wa CSV" : "CSV Import"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {language === "sw"
            ? "Safu zinazohitajika: full_name, email, phone. Hiari: neighborhood, church_id"
            : "Required columns: full_name, email, phone. Optional: neighborhood, church_id"}
        </p>
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-900"
          />
          <button
            onClick={handleCsvImport}
            disabled={importingCsv}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {importingCsv
              ? language === "sw"
                ? "Inaingiza..."
                : "Importing..."
              : language === "sw"
                ? "Ingiza CSV"
                : "Import CSV"}
          </button>
        </div>

        {csvImportResult && (
          <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              {language === "sw" ? "Zilizoundwa" : "Created"}:{" "}
              {csvImportResult.created_count || 0}
              {" | "}
              {language === "sw" ? "Zilirukwa" : "Skipped"}:{" "}
              {csvImportResult.skipped_count || 0}
            </p>
            {(csvImportResult.errors || []).length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-red-600 dark:text-red-400">
                  {language === "sw"
                    ? "Makosa ya uingizaji:"
                    : "Import errors:"}
                </p>
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  {(csvImportResult.errors || [])
                    .slice(0, 5)
                    .map((err, index) => (
                      <li key={`${err.row}-${index}`}>
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Idhini ya Wanachama" : "Member Approvals"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {language === "sw"
            ? `Una ${registrations.length} maombi yanayosubiri idhini`
            : `You have ${registrations.length} pending approval requests`}
        </p>
      </div>

      {registrations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {language === "sw"
              ? "Hakuna maombi ya idhini"
              : "No pending approvals"}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {language === "sw"
              ? "Maombi yote ya wanachama yamekaguliwa"
              : "All member registration requests have been reviewed"}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {language === "sw" ? "Jina" : "Name"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {language === "sw" ? "Simu" : "Phone"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {language === "sw" ? "Kanisa" : "Church"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {language === "sw" ? "Tarehe" : "Date"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {language === "sw" ? "Hali" : "Status"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {language === "sw" ? "Kitendo" : "Action"}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {registrations.map((reg) => (
                  <tr
                    key={reg.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {reg.personal_info?.full_name || reg.full_name || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-300">
                        {reg.personal_info?.email || reg.email || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-300">
                        {reg.personal_info?.phone || reg.phone || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-300">
                        {reg.preferred_church_name || reg.church_name || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-300">
                        {new Date(reg.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(reg.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => viewDetails(reg)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        title={
                          language === "sw" ? "Tazama maelezo" : "View details"
                        }
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleApproval(reg.id, "approve")}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition"
                        disabled={reg.status !== "pending"}
                      >
                        <FaCheck className="inline mr-1" />
                        {language === "sw" ? "Kubali" : "Approve"}
                      </button>
                      <button
                        onClick={() => handleRejectClick(reg.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition"
                        disabled={reg.status !== "pending"}
                      >
                        <FaTimes className="inline mr-1" />
                        {language === "sw" ? "Kataa" : "Reject"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {language === "sw" ? "Rekodi zenye marudio" : "Duplicate Records"}
          </h2>
          <button
            onClick={fetchDuplicates}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {language === "sw" ? "Pakua upya" : "Refresh"}
          </button>
        </div>

        {duplicatesLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === "sw"
              ? "Inatafuta marudio..."
              : "Loading duplicates..."}
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {language === "sw" ? "Marudio ya email" : "Email duplicates"}
              </h3>
              {(duplicateData.duplicate_email_groups || []).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === "sw"
                    ? "Hakuna marudio ya email"
                    : "No duplicate emails found"}
                </p>
              ) : (
                <div className="space-y-3">
                  {(duplicateData.duplicate_email_groups || []).map((group) =>
                    renderDuplicateGroup(group, "email"),
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {language === "sw" ? "Marudio ya simu" : "Phone duplicates"}
              </h3>
              {(duplicateData.duplicate_phone_groups || []).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === "sw"
                    ? "Hakuna marudio ya simu"
                    : "No duplicate phones found"}
                </p>
              ) : (
                <div className="space-y-3">
                  {(duplicateData.duplicate_phone_groups || []).map((group) =>
                    renderDuplicateGroup(group, "phone"),
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 sticky top-0 bg-white dark:bg-gray-800 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {language === "sw"
                    ? "Maelezo ya Mwanachama"
                    : "Member Details"}
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <FaTimes size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <FaUsers className="mr-2 text-primary-600" />
                  {language === "sw"
                    ? "Taarifa Binafsi"
                    : "Personal Information"}
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  {selectedRegistration.personal_info &&
                  Object.keys(selectedRegistration.personal_info).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(selectedRegistration.personal_info).map(
                        ([key, value]) => (
                          <div key={key}>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {formatLabel(key)}
                            </p>
                            <p className="text-gray-900 dark:text-white break-words">
                              {value === null || value === undefined
                                ? "-"
                                : Array.isArray(value)
                                  ? value.join(", ")
                                  : value === ""
                                    ? "-"
                                    : String(value)}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === "sw"
                        ? "Hakuna taarifa binafsi"
                        : "No personal information"}
                    </p>
                  )}
                </div>
              </div>

              {/* Guardian Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <FaUserFriends className="mr-2 text-primary-600" />
                  {language === "sw"
                    ? "Taarifa za Mlezi"
                    : "Guardian Information"}
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  {selectedRegistration.guardian_info &&
                  Object.keys(selectedRegistration.guardian_info).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(selectedRegistration.guardian_info).map(
                        ([key, value]) => (
                          <div key={key}>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {formatLabel(key)}
                            </p>
                            <p className="text-gray-900 dark:text-white break-words">
                              {value === null || value === undefined
                                ? "-"
                                : Array.isArray(value)
                                  ? value.join(", ")
                                  : value === ""
                                    ? "-"
                                    : String(value)}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === "sw"
                        ? "Hakuna taarifa za mlezi"
                        : "No guardian information"}
                    </p>
                  )}
                </div>
              </div>

              {/* Spiritual Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <FaPray className="mr-2 text-primary-600" />
                  {language === "sw"
                    ? "Taarifa za Kiroho"
                    : "Spiritual Information"}
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  {selectedRegistration.spiritual_info &&
                  Object.keys(selectedRegistration.spiritual_info).length >
                    0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(selectedRegistration.spiritual_info).map(
                        ([key, value]) => (
                          <div key={key}>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {formatLabel(key)}
                            </p>
                            <p className="text-gray-900 dark:text-white break-words">
                              {value === null || value === undefined
                                ? "-"
                                : Array.isArray(value)
                                  ? value.join(", ")
                                  : value === ""
                                    ? "-"
                                    : String(value)}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === "sw"
                        ? "Hakuna taarifa za kiroho"
                        : "No spiritual information"}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white dark:bg-gray-800">
                <button
                  onClick={() => {
                    handleApproval(selectedRegistration.id, "approve");
                    setShowDetailsModal(false);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition"
                >
                  <FaCheck className="inline mr-2" />
                  {language === "sw" ? "Kubali" : "Approve"}
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleRejectClick(selectedRegistration.id);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
                >
                  <FaTimes className="inline mr-2" />
                  {language === "sw" ? "Kataa" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {language === "sw" ? "Sababu ya Kukataa" : "Rejection Reason"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {language === "sw"
                  ? "Tafadhali toa sababu ya kukataa ombi hili"
                  : "Please provide a reason for rejecting this request"}
              </p>
              <textarea
                className="input"
                rows="4"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={language === "sw" ? "Sababu..." : "Reason..."}
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                    setSelectedId(null);
                  }}
                  className="btn-secondary"
                >
                  {language === "sw" ? "Ghairi" : "Cancel"}
                </button>
                <button
                  onClick={confirmReject}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                  {language === "sw" ? "Kataa" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterApproval;

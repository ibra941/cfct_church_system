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
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const RegisterApproval = () => {
  const { language } = useLanguage();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const response = await api.get("/members/registrations/pending/");
      setRegistrations(response.data);
    } catch (error) {
      console.error(error);
      toast.error(
        language === "sw"
          ? "Hitilafu kupata maombi"
          : "Error fetching requests",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (id, action, reason = "") => {
    try {
      await api.post(`/members/registrations/${id}/${action}/`, {
        rejection_reason: reason,
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
    if (selectedId) {
      handleApproval(selectedId, "reject", rejectReason);
    }
  };

  const viewDetails = (registration) => {
    setSelectedRegistration(registration);
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

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-4">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4">
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
                            {reg.personal_info?.full_name ||
                              reg.full_name ||
                              "-"}
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
                            {reg.preferred_church_name ||
                              reg.church_name ||
                              "-"}
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
                              language === "sw"
                                ? "Tazama maelezo"
                                : "View details"
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
        </main>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {language === "sw"
                    ? "Maelezo ya Mwanachama"
                    : "Member Details"}
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Personal Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b pb-2">
                  <FaUsers className="inline mr-2 text-primary-600" />
                  {language === "sw"
                    ? "Taarifa Binafsi"
                    : "Personal Information"}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === "sw" ? "Jina Kamili" : "Full Name"}
                    </p>
                    <p className="font-medium">
                      {selectedRegistration.personal_info?.full_name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Email
                    </p>
                    <p className="font-medium">
                      {selectedRegistration.personal_info?.email || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === "sw" ? "Simu" : "Phone"}
                    </p>
                    <p className="font-medium">
                      {selectedRegistration.personal_info?.phone || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === "sw" ? "Kitongoji" : "Neighborhood"}
                    </p>
                    <p className="font-medium">
                      {selectedRegistration.personal_info?.neighborhood || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Guardian Information */}
              {(selectedRegistration.guardian_info?.guardian_name ||
                selectedRegistration.guardian_info?.guardian_phone) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b pb-2">
                    <FaUserFriends className="inline mr-2 text-primary-600" />
                    {language === "sw"
                      ? "Taarifa za Mlezi"
                      : "Guardian Information"}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {language === "sw" ? "Jina la Mlezi" : "Guardian Name"}
                      </p>
                      <p className="font-medium">
                        {selectedRegistration.guardian_info?.guardian_name ||
                          "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {language === "sw" ? "Simu ya Mlezi" : "Guardian Phone"}
                      </p>
                      <p className="font-medium">
                        {selectedRegistration.guardian_info?.guardian_phone ||
                          "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {language === "sw" ? "Uhusiano" : "Relationship"}
                      </p>
                      <p className="font-medium">
                        {selectedRegistration.guardian_info?.relationship ||
                          "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Spiritual Information */}
              {(selectedRegistration.spiritual_info?.date_of_birth ||
                selectedRegistration.spiritual_info?.spiritual_gifts) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b pb-2">
                    <FaPray className="inline mr-2 text-primary-600" />
                    {language === "sw"
                      ? "Taarifa za Kiroho"
                      : "Spiritual Information"}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {language === "sw"
                          ? "Tarehe ya Kuzaliwa"
                          : "Date of Birth"}
                      </p>
                      <p className="font-medium">
                        {selectedRegistration.spiritual_info?.date_of_birth ||
                          "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {language === "sw"
                          ? "Tarehe ya Kuzaliwa Kiroho"
                          : "Christian Birth Date"}
                      </p>
                      <p className="font-medium">
                        {selectedRegistration.spiritual_info
                          ?.christian_birth_date || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {language === "sw"
                          ? "Vipawa vya Kiroho"
                          : "Spiritual Gifts"}
                      </p>
                      <p className="font-medium">
                        {selectedRegistration.spiritual_info?.spiritual_gifts?.join(
                          ", ",
                        ) || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {language === "sw"
                          ? "Maslahi ya Huduma"
                          : "Ministry Interests"}
                      </p>
                      <p className="font-medium">
                        {selectedRegistration.spiritual_info?.ministry_interests?.join(
                          ", ",
                        ) || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    handleApproval(selectedRegistration.id, "approve");
                    setShowDetailsModal(false);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                >
                  <FaCheck className="inline mr-2" />
                  {language === "sw" ? "Kubali" : "Approve"}
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleRejectClick(selectedRegistration.id);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
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

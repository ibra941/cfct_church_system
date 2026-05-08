import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaArrowLeft } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const DepartmentDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [department, setDepartment] = useState(null);
  const [myRequest, setMyRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const isLocalMember = user?.role === "local_member";

  const fetchDepartment = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/departments/${id}/`);
      setDepartment(response.data || null);
    } catch (error) {
      toast.error(
        language === "sw"
          ? "Imeshindikana kupata taarifa za idara"
          : "Failed to load department details",
      );
      setDepartment(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRequest = async () => {
    if (!isLocalMember) return;
    try {
      const response = await api.get("/departments/my-requests/");
      const items = response.data?.results || response.data || [];
      const found = (Array.isArray(items) ? items : []).find(
        (item) => String(item.department) === String(id),
      );
      setMyRequest(found || null);
    } catch {
      setMyRequest(null);
    }
  };

  useEffect(() => {
    fetchDepartment();
    fetchMyRequest();
  }, [id]);

  const joinStatus = useMemo(() => {
    if (!isLocalMember) return null;
    if (myRequest?.status) return myRequest.status;

    const members = Array.isArray(department?.members)
      ? department.members
      : [];
    const approved = members.some(
      (item) => item.member === user?.id && item.is_active !== false,
    );
    return approved ? "approved" : "not_applied";
  }, [department?.members, isLocalMember, myRequest?.status, user?.id]);

  const sendJoinRequest = async () => {
    setRequesting(true);
    try {
      const response = await api.post(`/departments/${id}/apply/`);
      setMyRequest(response?.data || null);
      toast.success(
        language === "sw"
          ? "Ombi la kujiunga limetumwa"
          : "Join request submitted",
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kutuma ombi"
            : "Failed to submit request"),
      );
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          {language === "sw" ? "Idara haijapatikana" : "Department not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/departments"
          className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
        >
          <FaArrowLeft className="mr-2" />
          {language === "sw" ? "Rudi Idara" : "Back to Departments"}
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {department.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {department.church_name || department.church}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {language === "sw" ? "Wanachama wa Idara" : "Department Members"}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full md:min-w-[980px] divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {language === "sw" ? "Jina" : "Name"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {language === "sw" ? "Nafasi" : "Position"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {language === "sw" ? "Simu" : "Phone"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {Array.isArray(department.members) &&
              department.members.length > 0 ? (
                department.members.map((memberRow) => (
                  <tr key={memberRow.id}>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {memberRow.member_name || memberRow.member_username}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {memberRow.role_display || memberRow.role}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {memberRow.member_email || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {memberRow.member_phone || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {language === "sw"
                      ? "Hakuna wanachama wa idara bado"
                      : "No department members yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Activities Summary — visible to all */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {language === "sw"
              ? "Muhtasari wa Shughuli"
              : "Department Activities Summary"}
          </h3>
          {isLocalMember && joinStatus !== "approved" ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              {language === "sw"
                ? "Jiunge na idara hii ili kuona muhtasari wa shughuli."
                : "Join this department to view the activities summary."}
            </p>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {department.activities_summary ||
                department.objectives ||
                (language === "sw"
                  ? "Hakuna muhtasari wa shughuli uliowekwa"
                  : "No activities summary has been set")}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {language === "sw"
              ? "Maelezo, Sheria na Sera"
              : "Description, Rules and Policies"}
          </h3>
          {isLocalMember && joinStatus !== "approved" ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              {language === "sw"
                ? "Jiunge na idara hii ili kuona maelezo, sheria na sera."
                : "Join this department to view the description, rules and policies."}
            </p>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {department.policies ||
                department.description ||
                (language === "sw"
                  ? "Hakuna maelezo ya sera yaliyowekwa"
                  : "No rules/policies have been set")}
            </p>
          )}
        </div>
      </div>

      {isLocalMember && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {language === "sw" ? "Kujiunga na Idara" : "Join Department"}
          </h3>
          {joinStatus === "approved" ? (
            <span className="inline-block px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
              {language === "sw" ? "Tayari umejiunga" : "Already joined"}
            </span>
          ) : joinStatus === "pending" ? (
            <span className="inline-block px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
              {language === "sw" ? "Ombi linasubiri" : "Request pending"}
            </span>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={sendJoinRequest}
              disabled={requesting}
            >
              {requesting
                ? language === "sw"
                  ? "Inatuma..."
                  : "Submitting..."
                : language === "sw"
                  ? "Tuma Ombi la Kujiunga"
                  : "Send Join Request"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DepartmentDetails;

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaEdit, FaPlus, FaTrash, FaUsers } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const Departments = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [departments, setDepartments] = useState([]);
  const [churches, setChurches] = useState([]);
  const [potentialLeaders, setPotentialLeaders] = useState([]);
  const [myRequestsByDepartment, setMyRequestsByDepartment] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    church: "",
    leader: "",
    meeting_day: "",
    meeting_time: "",
    objectives: "",
  });

  const canManageDepartments = [
    "national_leader",
    "zone_leader",
    "regional_leader",
    "district_leader",
    "local_leader",
  ].includes(user?.role);
  const isLocalLeader = user?.role === "local_leader";
  const isLocalMember = user?.role === "local_member";

  useEffect(() => {
    fetchDepartments();
    if (canManageDepartments) {
      fetchChurches();
      fetchPotentialLeaders();
    }
    if (isLocalMember) {
      fetchMyRequests();
    }
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/departments/");
      const data = response.data?.results || response.data || [];
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchChurches = async () => {
    try {
      const response = await api.get("/churches/");
      const data = response.data?.results || response.data || [];
      setChurches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setChurches([]);
    }
  };

  const fetchPotentialLeaders = async () => {
    try {
      const leaderResponse = await api.get("/users/");
      const data = leaderResponse.data?.results || leaderResponse.data || [];
      const users = Array.isArray(data) ? data : [];
      setPotentialLeaders(
        users.filter((item) => {
          if (!item?.id) return false;
          if (isLocalLeader && user?.church && item?.church !== user.church) {
            return false;
          }
          return [
            "local_leader",
            "district_leader",
            "regional_leader",
            "zone_leader",
            "national_leader",
          ].includes(item.role);
        }),
      );
    } catch (error) {
      console.error(error);
      setPotentialLeaders([]);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const response = await api.get("/departments/my-requests/");
      const data = response.data?.results || response.data || [];
      const requests = Array.isArray(data) ? data : [];
      const requestsMap = requests.reduce((acc, item) => {
        if (item?.department) {
          acc[item.department] = item;
        }
        return acc;
      }, {});
      setMyRequestsByDepartment(requestsMap);
    } catch (error) {
      console.error(error);
      setMyRequestsByDepartment({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        description: (formData.description || "").trim(),
        meeting_day: formData.meeting_day || "",
        meeting_time: formData.meeting_time || null,
        objectives: (formData.objectives || "").trim(),
        leader: formData.leader || null,
      };

      if (isLocalLeader) {
        payload.church = user?.church;
      }

      if (editingDept) {
        await api.put(`/departments/${editingDept.id}/`, payload);
      } else {
        await api.post("/departments/", payload);
      }
      fetchDepartments();
      setShowModal(false);
      resetForm();
      toast.success(
        editingDept
          ? language === "sw"
            ? "Idara imehaririwa"
            : "Department updated"
          : language === "sw"
            ? "Idara imeongezwa"
            : "Department added",
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.detail ||
          (language === "sw"
            ? "Imeshindikana kuhifadhi idara"
            : "Failed to save department"),
      );
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        language === "sw"
          ? "Una hakika unataka kufuta idara hii?"
          : "Are you sure you want to delete this department?",
      )
    ) {
      try {
        await api.delete(`/departments/${id}/`);
        fetchDepartments();
        toast.success(
          language === "sw" ? "Idara imefutwa" : "Department deleted",
        );
      } catch (error) {
        console.error(error);
        toast.error(
          language === "sw"
            ? "Imeshindikana kufuta idara"
            : "Failed to delete department",
        );
      }
    }
  };

  const handleRequestJoin = async (departmentId) => {
    try {
      const response = await api.post(`/departments/${departmentId}/apply/`);
      const requestData = response?.data;
      setMyRequestsByDepartment((prev) => ({
        ...prev,
        [departmentId]: requestData,
      }));
      toast.success(
        language === "sw"
          ? "Ombi la kujiunga limetumwa"
          : "Join request submitted",
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kutuma ombi"
            : "Failed to submit request"),
      );
    }
  };

  const getRequestStatus = (dept) => {
    const requestObj = myRequestsByDepartment[dept.id];
    if (requestObj?.status) return requestObj.status;

    const isApprovedMember = Array.isArray(dept.members)
      ? dept.members.some(
          (member) => member.member === user?.id && member.is_active !== false,
        )
      : false;

    return isApprovedMember ? "approved" : null;
  };

  const resetForm = () => {
    setEditingDept(null);
    setFormData({
      name: "",
      description: "",
      church: "",
      leader: "",
      meeting_day: "",
      meeting_time: "",
      objectives: "",
    });
  };

  const meetingDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Idara" : "Departments"}
        </h1>
        {canManageDepartments && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <FaPlus />
            <span>{language === "sw" ? "Ongeza Idara" : "Add Department"}</span>
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  <FaUsers className="text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {dept.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {dept.church_name || dept.church}
                  </p>
                </div>
              </div>
              {canManageDepartments && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingDept(dept);
                      setFormData({
                        name: dept.name || "",
                        description: dept.description || "",
                        church: dept.church || "",
                        leader: dept.leader || "",
                        meeting_day: dept.meeting_day || "",
                        meeting_time: dept.meeting_time || "",
                        objectives: dept.objectives || "",
                      });
                      setShowModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FaTrash />
                  </button>
                </div>
              )}
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              {dept.description ||
                (language === "sw" ? "Hakuna maelezo" : "No description")}
            </p>
            {dept.leader_name && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {language === "sw" ? "Kiongozi" : "Leader"}: {dept.leader_name}
              </p>
            )}
            {(dept.leader_phone || dept.leader_email) && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === "sw" ? "Mawasiliano" : "Contact"}:{" "}
                {dept.leader_phone || "-"}
                {dept.leader_email ? ` | ${dept.leader_email}` : ""}
              </p>
            )}
            {dept.meeting_day && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === "sw" ? "Mkutano" : "Meeting"}: {dept.meeting_day}{" "}
                {dept.meeting_time ? `@ ${dept.meeting_time}` : ""}
              </p>
            )}
            {isLocalMember && (
              <div className="mt-4">
                {(() => {
                  const status = getRequestStatus(dept);
                  if (status === "approved") {
                    return (
                      <span className="inline-block px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        {language === "sw" ? "Umejiunga" : "Joined"}
                      </span>
                    );
                  }
                  if (status === "pending") {
                    return (
                      <span className="inline-block px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        {language === "sw"
                          ? "Ombi linasubiri"
                          : "Request pending"}
                      </span>
                    );
                  }
                  if (status === "rejected") {
                    return (
                      <button
                        onClick={() => handleRequestJoin(dept.id)}
                        className="btn-secondary text-xs"
                      >
                        {language === "sw"
                          ? "Omba tena kujiunga"
                          : "Request to join again"}
                      </button>
                    );
                  }
                  return (
                    <button
                      onClick={() => handleRequestJoin(dept.id)}
                      className="btn-primary text-xs"
                    >
                      {language === "sw" ? "Omba kujiunga" : "Request to join"}
                    </button>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {language === "sw"
              ? "Hakuna idara zilizopo"
              : "No departments found"}
          </p>
        </div>
      )}

      {/* Modal for Add/Edit */}
      {showModal && canManageDepartments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingDept
                  ? language === "sw"
                    ? "Hariri Idara"
                    : "Edit Department"
                  : language === "sw"
                    ? "Ongeza Idara"
                    : "Add Department"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Jina la Idara" : "Department Name"}
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                {!isLocalLeader && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Kanisa" : "Church"}
                    </label>
                    <select
                      className="input"
                      value={formData.church}
                      onChange={(e) =>
                        setFormData({ ...formData, church: e.target.value })
                      }
                      required
                    >
                      <option value="">
                        {language === "sw" ? "Chagua Kanisa" : "Select Church"}
                      </option>
                      {churches.map((church) => (
                        <option key={church.id} value={church.id}>
                          {church.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw"
                      ? "Kiongozi wa Idara"
                      : "Department Leader"}
                  </label>
                  <select
                    className="input"
                    value={formData.leader}
                    onChange={(e) =>
                      setFormData({ ...formData, leader: e.target.value })
                    }
                  >
                    <option value="">
                      {language === "sw" ? "Chagua kiongozi" : "Select leader"}
                    </option>
                    {potentialLeaders.map((leader) => (
                      <option key={leader.id} value={leader.id}>
                        {leader.full_name || leader.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Maelezo" : "Description"}
                  </label>
                  <textarea
                    className="input"
                    rows="3"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Siku ya Mkutano" : "Meeting Day"}
                  </label>
                  <select
                    className="input"
                    value={formData.meeting_day}
                    onChange={(e) =>
                      setFormData({ ...formData, meeting_day: e.target.value })
                    }
                  >
                    <option value="">
                      {language === "sw" ? "Chagua Siku" : "Select Day"}
                    </option>
                    {meetingDays.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Muda wa Mkutano" : "Meeting Time"}
                  </label>
                  <input
                    type="time"
                    className="input"
                    value={formData.meeting_time}
                    onChange={(e) =>
                      setFormData({ ...formData, meeting_time: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Malengo" : "Objectives"}
                  </label>
                  <textarea
                    className="input"
                    rows="2"
                    value={formData.objectives}
                    onChange={(e) =>
                      setFormData({ ...formData, objectives: e.target.value })
                    }
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    {language === "sw" ? "Ghairi" : "Cancel"}
                  </button>
                  <button type="submit" className="btn-primary">
                    {language === "sw" ? "Hifadhi" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;

import { useEffect, useState } from "react";
import { FaEdit, FaPlus, FaTrash, FaUsers } from "react-icons/fa";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const Departments = () => {
  const { language } = useLanguage();
  const [departments, setDepartments] = useState([]);
  const [churches, setChurches] = useState([]);
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

  useEffect(() => {
    fetchDepartments();
    fetchChurches();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}/`, formData);
      } else {
        await api.post("/departments/", formData);
      }
      fetchDepartments();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error(error);
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
      } catch (error) {
        console.error(error);
      }
    }
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
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <FaPlus />
          <span>{language === "sw" ? "Ongeza Idara" : "Add Department"}</span>
        </button>
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
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingDept(dept);
                    setFormData(dept);
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
            {dept.meeting_day && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === "sw" ? "Mkutano" : "Meeting"}: {dept.meeting_day}{" "}
                {dept.meeting_time ? `@ ${dept.meeting_time}` : ""}
              </p>
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
      {showModal && (
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

import { useEffect, useState } from "react";
import { FaEdit, FaPlus, FaTrash } from "react-icons/fa";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const Churches = () => {
  const { language } = useLanguage();
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChurch, setEditingChurch] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    church_type: "local",
    parent_church: "",
    address: "",
    city: "",
    region: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    fetchChurches();
  }, []);

  const fetchChurches = async () => {
    try {
      const response = await api.get("/churches/");
      // Handle paginated response - API returns {count, next, previous, results}
      const churchesData = response.data.results || response.data;
      setChurches(churchesData);
      console.log("Churches loaded:", churchesData.length);
    } catch (error) {
      console.error("Error fetching churches:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingChurch) {
        await api.put(`/churches/${editingChurch.id}/`, formData);
      } else {
        await api.post("/churches/", formData);
      }
      fetchChurches();
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
          ? "Una hakika unataka kufuta kanisa hili?"
          : "Are you sure you want to delete this church?",
      )
    ) {
      try {
        await api.delete(`/churches/${id}/`);
        fetchChurches();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const resetForm = () => {
    setEditingChurch(null);
    setFormData({
      name: "",
      code: "",
      church_type: "local",
      parent_church: "",
      address: "",
      city: "",
      region: "",
      phone: "",
      email: "",
    });
  };

  const churchTypes = [
    { value: "national", label: language === "sw" ? "Taifa" : "National" },
    { value: "zone", label: language === "sw" ? "Kanda" : "Zone" },
    { value: "region", label: language === "sw" ? "Mkoa" : "Region" },
    { value: "district", label: language === "sw" ? "Wilaya" : "District" },
    { value: "local", label: language === "sw" ? "Kanisa" : "Local" },
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
          {language === "sw" ? "Makanisa" : "Churches"}
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <FaPlus />
          <span>{language === "sw" ? "Ongeza Kanisa" : "Add Church"}</span>
        </button>
      </div>

      {churches.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {language === "sw"
              ? "Hakuna makanisa yaliyopatikana. Tafadhali ongeza kanisa."
              : "No churches found. Please add a church."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Jina" : "Name"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Aina" : "Type"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Mahali" : "Location"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Vitendo" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {churches.map((church) => (
                <tr key={church.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {church.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700">
                      {church.church_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {church.code || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {church.city || church.region || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        setEditingChurch(church);
                        setFormData(church);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(church.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </table>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingChurch
                  ? language === "sw"
                    ? "Hariri Kanisa"
                    : "Edit Church"
                  : language === "sw"
                    ? "Ongeza Kanisa"
                    : "Add Church"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Jina" : "Name"}
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
                    Code
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Aina ya Kanisa" : "Church Type"}
                  </label>
                  <select
                    className="input"
                    value={formData.church_type}
                    onChange={(e) =>
                      setFormData({ ...formData, church_type: e.target.value })
                    }
                  >
                    {churchTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Anwani" : "Address"}
                  </label>
                  <textarea
                    className="input"
                    rows="2"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Jiji" : "City"}
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Mkoa" : "Region"}
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.region}
                      onChange={(e) =>
                        setFormData({ ...formData, region: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Simu
                    </label>
                    <input
                      type="tel"
                      className="input"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      className="input"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
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

export default Churches;
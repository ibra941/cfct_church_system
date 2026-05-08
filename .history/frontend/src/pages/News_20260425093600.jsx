import { format } from "date-fns";
import { useEffect, useState } from "react";
import { FaCalendarAlt, FaEdit, FaEye, FaPlus, FaTrash } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const News = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    category: "",
    status: "draft",
    featured_image: null,
  });
  const canManageNews = [
    "national_leader",
    "zone_leader",
    "regional_leader",
    "district_leader",
    "local_leader",
  ].includes(user?.role);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await api.get("/news/");
      const data = response.data?.results || response.data || [];
      setNews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null && formData[key] !== undefined) {
        formDataToSend.append(key, formData[key]);
      }
    });

    try {
      if (editingNews) {
        await api.put(`/news/${editingNews.id}/`, formDataToSend);
      } else {
        await api.post("/news/", formDataToSend);
      }
      fetchNews();
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
          ? "Una hakika unataka kufuta habari hii?"
          : "Are you sure you want to delete this news?",
      )
    ) {
      try {
        await api.delete(`/news/${id}/`);
        fetchNews();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const resetForm = () => {
    setEditingNews(null);
    setFormData({
      title: "",
      content: "",
      excerpt: "",
      category: "",
      status: "draft",
      featured_image: null,
    });
    setSelectedImage(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file));
      setFormData({ ...formData, featured_image: file });
    }
  };

  const statusOptions = [
    { value: "draft", label: language === "sw" ? "Rasimu" : "Draft" },
    {
      value: "published",
      label: language === "sw" ? "Imechapishwa" : "Published",
    },
    {
      value: "archived",
      label: language === "sw" ? "Imehifadhiwa" : "Archived",
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Habari na Matukio" : "News & Events"}
        </h1>
        {canManageNews && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <FaPlus />
            <span>{language === "sw" ? "Ongeza Habari" : "Add News"}</span>
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
          >
            {item.featured_image && (
              <img
                src={item.featured_image}
                alt={item.title}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {item.title}
                </h3>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    item.status === "published"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : item.status === "draft"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-3">
                {item.excerpt || item.content?.substring(0, 100)}...
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center space-x-1">
                  <FaCalendarAlt />
                  <span>{format(new Date(item.created_at), "dd/MM/yyyy")}</span>
                </span>
                <div className="flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-800">
                    <FaEye />
                  </button>
                  {canManageNews && item.author === user?.id && (
                    <>
                      <button
                        onClick={() => {
                          setEditingNews(item);
                          setFormData(item);
                          setShowModal(true);
                        }}
                        className="text-green-600 hover:text-green-800"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {news.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {language === "sw" ? "Hakuna habari zilizopo" : "No news found"}
          </p>
        </div>
      )}

      {/* Modal for Add/Edit */}
      {showModal && canManageNews && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingNews
                  ? language === "sw"
                    ? "Hariri Habari"
                    : "Edit News"
                  : language === "sw"
                    ? "Ongeza Habari"
                    : "Add News"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Kichwa" : "Title"}
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Muhtasari" : "Excerpt"}
                  </label>
                  <textarea
                    className="input"
                    rows="2"
                    value={formData.excerpt}
                    onChange={(e) =>
                      setFormData({ ...formData, excerpt: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Maudhui" : "Content"}
                  </label>
                  <textarea
                    className="input"
                    rows="5"
                    required
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Picha" : "Image"}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="input"
                  />
                  {selectedImage && (
                    <img
                      src={selectedImage}
                      alt="Preview"
                      className="mt-2 h-32 object-cover rounded"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Hali" : "Status"}
                    </label>
                    <select
                      className="input"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
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

export default News;

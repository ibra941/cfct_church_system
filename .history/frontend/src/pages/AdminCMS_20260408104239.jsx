import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaEdit, FaPlus, FaSave, FaTrash } from "react-icons/fa";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const AdminCMS = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("homepage");
  const [homepageContent, setHomepageContent] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const [contactInfo, setContactInfo] = useState([]);
  const [footerLinks, setFooterLinks] = useState([]);
  const [siteSettings, setSiteSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [homepageRes, socialRes, contactRes, footerRes, settingsRes] =
        await Promise.all([
          api.get("/cms/homepage/"),
          api.get("/cms/social-links/"),
          api.get("/cms/contact-info/"),
          api.get("/cms/footer-links/"),
          api.get("/cms/settings/"),
        ]);

      // ✅ FIX: Handle paginated responses - extract results array if it exists
      setHomepageContent(homepageRes.data.results || homepageRes.data);
      setSocialLinks(socialRes.data.results || socialRes.data);
      setContactInfo(contactRes.data.results || contactRes.data);
      setFooterLinks(footerRes.data.results || footerRes.data);
      setSiteSettings(settingsRes.data.results || settingsRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load CMS data");
      // Set empty arrays on error
      setHomepageContent([]);
      setSocialLinks([]);
      setContactInfo([]);
      setFooterLinks([]);
      setSiteSettings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id, data, type) => {
    try {
      await api.put(`/cms/${type}/${id}/`, data);
      toast.success("Content updated successfully");
      fetchAllData();
      setEditingItem(null);
    } catch (error) {
      toast.error("Failed to update content");
    }
  };

  const handleAdd = async (data, type) => {
    try {
      await api.post(`/cms/${type}/`, data);
      toast.success("Item added successfully");
      fetchAllData();
      setShowModal(false);
      setFormData({});
    } catch (error) {
      toast.error("Failed to add item");
    }
  };

  const handleDelete = async (id, type) => {
    if (
      window.confirm(
        language === "sw" ? "Una hakika unataka kufuta?" : "Are you sure?",
      )
    ) {
      try {
        await api.delete(`/cms/${type}/${id}/`);
        toast.success("Item deleted successfully");
        fetchAllData();
      } catch (error) {
        toast.error("Failed to delete item");
      }
    }
  };

  const tabs = [
    {
      id: "homepage",
      label: language === "sw" ? "Maudhui ya Ukurasa" : "Homepage Content",
    },
    {
      id: "social",
      label: language === "sw" ? "Mitandao ya Kijamii" : "Social Media",
    },
    {
      id: "contact",
      label: language === "sw" ? "Mawasiliano" : "Contact Info",
    },
    {
      id: "footer",
      label: language === "sw" ? "Viungo vya Chini" : "Footer Links",
    },
    { id: "settings", label: language === "sw" ? "Mipangilio" : "Settings" },
  ];

  const sectionLabels = {
    hero: language === "sw" ? "Sehemu ya Utangulizi" : "Hero Section",
    vision: language === "sw" ? "Sehemu ya Dira" : "Vision Section",
    mission: language === "sw" ? "Sehemu ya Lengo" : "Mission Section",
    history: language === "sw" ? "Sehemu ya Historia" : "History Section",
    about: language === "sw" ? "Sehemu ya Kuhusu Sisi" : "About Section",
    welcome: language === "sw" ? "Sehemu ya Karibu" : "Welcome Section",
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
              {language === "sw"
                ? "Mfumo wa Kudhibiti Maudhui"
                : "Content Management System"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {language === "sw"
                ? "Dhibiti maudhui ya tovuti yako"
                : "Manage your website content"}
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="flex space-x-4 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? "border-b-2 border-primary-600 text-primary-600"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Homepage Content Tab */}
          {activeTab === "homepage" && (
            <div className="space-y-4">
              {homepageContent.map((section) => (
                <div
                  key={section.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {sectionLabels[section.section] || section.section}
                      </h3>
                      {section.subtitle && (
                        <p className="text-sm text-gray-500">
                          {section.subtitle}
                        </p>
                      )}
                    </div>
                    {editingItem === section.id ? (
                      <button
                        onClick={() =>
                          handleSave(section.id, formData, "homepage")
                        }
                        className="text-green-600 hover:text-green-800"
                      >
                        <FaSave />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingItem(section.id);
                          setFormData(section);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEdit />
                      </button>
                    )}
                  </div>

                  {editingItem === section.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        className="input"
                        value={formData.title || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder={language === "sw" ? "Kichwa" : "Title"}
                      />
                      <input
                        type="text"
                        className="input"
                        value={formData.subtitle || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, subtitle: e.target.value })
                        }
                        placeholder={
                          language === "sw" ? "Kichwa kidogo" : "Subtitle"
                        }
                      />
                      <textarea
                        className="input"
                        rows="4"
                        value={formData.content || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, content: e.target.value })
                        }
                        placeholder={language === "sw" ? "Maudhui" : "Content"}
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.is_active || false}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              is_active: e.target.checked,
                            })
                          }
                        />
                        <label className="text-sm">
                          {language === "sw" ? "Inatumika" : "Active"}
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {section.title && (
                        <p className="text-gray-700 dark:text-gray-300 font-medium">
                          {section.title}
                        </p>
                      )}
                      <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {section.content}
                      </p>
                      <div className="mt-2 flex items-center space-x-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            section.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {section.is_active
                            ? language === "sw"
                              ? "Inatumika"
                              : "Active"
                            : language === "sw"
                              ? "Haijatumika"
                              : "Inactive"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {homepageContent.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {language === "sw"
                      ? "Hakuna maudhui ya ukurasa wa mwanzo yaliyopatikana"
                      : "No homepage content found"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Social Media Tab */}
          {activeTab === "social" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Social Media Links</h2>
                <button
                  onClick={() => {
                    setFormData({
                      platform: "",
                      url: "",
                      order: 0,
                      is_active: true,
                    });
                    setShowModal(true);
                  }}
                  className="btn-primary flex items-center space-x-2"
                >
                  <FaPlus />
                  <span>Add Link</span>
                </button>
              </div>
              <div className="space-y-3">
                {socialLinks.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No social media links found
                  </p>
                ) : (
                  socialLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 border-b dark:border-gray-700"
                    >
                      <div>
                        <p className="font-medium">
                          {link.platform_display || link.platform}
                        </p>
                        <p className="text-sm text-gray-500">{link.url}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingItem(link.id);
                            setFormData(link);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(link.id, "social-links")}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Contact Info Tab */}
          {activeTab === "contact" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="space-y-3">
                {contactInfo.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No contact information found
                  </p>
                ) : (
                  contactInfo.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 border-b dark:border-gray-700"
                    >
                      <div>
                        <p className="font-medium">{contact.contact_type}</p>
                        <p className="text-sm text-gray-500">{contact.value}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingItem(contact.id);
                            setFormData(contact);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(contact.id, "contact-info")
                          }
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Footer Links Tab */}
          {activeTab === "footer" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Footer Links</h2>
                <button
                  onClick={() => {
                    setFormData({
                      title: "",
                      url: "",
                      order: 0,
                      is_active: true,
                    });
                    setShowModal(true);
                  }}
                  className="btn-primary flex items-center space-x-2"
                >
                  <FaPlus />
                  <span>Add Link</span>
                </button>
              </div>
              <div className="space-y-3">
                {footerLinks.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No footer links found
                  </p>
                ) : (
                  footerLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 border-b dark:border-gray-700"
                    >
                      <div>
                        <p className="font-medium">{link.title}</p>
                        <p className="text-sm text-gray-500">{link.url}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingItem(link.id);
                            setFormData(link);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(link.id, "footer-links")}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Modal for Add/Edit */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <h2 className="text-xl font-bold mb-4">
                  {editingItem ? "Edit Item" : "Add New Item"}
                </h2>
                {Object.keys(formData).map(
                  (key) =>
                    key !== "id" &&
                    key !== "created_at" &&
                    key !== "updated_at" && (
                      <div key={key} className="mb-3">
                        <label className="block text-sm font-medium mb-1">
                          {key}
                        </label>
                        {key === "content" ? (
                          <textarea
                            className="input"
                            rows="3"
                            value={formData[key] || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                [key]: e.target.value,
                              })
                            }
                          />
                        ) : (
                          <input
                            type={key === "is_active" ? "checkbox" : "text"}
                            className={key === "is_active" ? "mr-2" : "input"}
                            checked={
                              key === "is_active" ? formData[key] : undefined
                            }
                            value={
                              key !== "is_active"
                                ? formData[key] || ""
                                : undefined
                            }
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                [key]:
                                  key === "is_active"
                                    ? e.target.checked
                                    : e.target.value,
                              })
                            }
                          />
                        )}
                      </div>
                    ),
                )}
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editingItem) {
                        handleSave(
                          editingItem,
                          formData,
                          activeTab === "social"
                            ? "social-links"
                            : activeTab === "contact"
                              ? "contact-info"
                              : activeTab === "footer"
                                ? "footer-links"
                                : "homepage",
                        );
                      } else {
                        handleAdd(
                          formData,
                          activeTab === "social"
                            ? "social-links"
                            : activeTab === "contact"
                              ? "contact-info"
                              : activeTab === "footer"
                                ? "footer-links"
                                : "homepage",
                        );
                      }
                      setShowModal(false);
                      setEditingItem(null);
                    }}
                    className="btn-primary"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminCMS;

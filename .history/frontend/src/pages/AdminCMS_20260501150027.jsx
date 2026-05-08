import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaEdit, FaPlus, FaSave, FaTrash } from "react-icons/fa";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const SECTION_OPTIONS = ["hero", "vision", "mission", "history", "about", "welcome"];
const SOCIAL_PLATFORM_OPTIONS = [
  "facebook",
  "twitter",
  "instagram",
  "youtube",
  "whatsapp",
  "telegram",
  "linkedin",
];
const CONTACT_TYPE_OPTIONS = ["phone", "email", "address", "service_times"];
const SETTING_TYPE_OPTIONS = ["text", "image", "html", "json"];

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.detail ||
  error?.response?.data?.section?.[0] ||
  error?.response?.data?.platform?.[0] ||
  error?.response?.data?.contact_type?.[0] ||
  error?.response?.data?.key?.[0] ||
  fallbackMessage;

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

  const endpointByTab = (tabId) => {
    if (tabId === "social") return "social-links";
    if (tabId === "contact") return "contact-info";
    if (tabId === "footer") return "footer-links";
    if (tabId === "settings") return "settings";
    return "homepage";
  };

  const openAddModal = (tabId) => {
    setEditingItem(null);

    if (tabId === "homepage") {
      const usedSections = new Set(homepageContent.map((item) => item.section));
      const availableSections = SECTION_OPTIONS.filter((section) => !usedSections.has(section));
      if (availableSections.length === 0) {
        toast.error("All homepage sections already exist. Edit existing sections instead.");
        return;
      }
      setFormData({
        section: availableSections[0],
        title: "",
        subtitle: "",
        content: "",
        order: 0,
        is_active: true,
      });
    } else if (tabId === "social") {
      setFormData({
        platform: SOCIAL_PLATFORM_OPTIONS[0],
        url: "",
        icon_class: "",
        order: 0,
        is_active: true,
      });
    } else if (tabId === "contact") {
      setFormData({
        contact_type: CONTACT_TYPE_OPTIONS[0],
        value: "",
        icon: "",
        order: 0,
        is_active: true,
      });
    } else if (tabId === "footer") {
      setFormData({
        title: "",
        url: "",
        order: 0,
        is_active: true,
      });
    } else if (tabId === "settings") {
      setFormData({
        key: "",
        value: "",
        setting_type: SETTING_TYPE_OPTIONS[0],
        description: "",
      });
    }

    setShowModal(true);
  };

  const handleSave = async (id, data, type) => {
    try {
      await api.put(`/cms/${type}/${id}/`, data);
      toast.success("Content updated successfully");
      await fetchAllData();
      setShowModal(false);
      setFormData({});
      setEditingItem(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update content"));
    }
  };

  const handleAdd = async (data, type) => {
    try {
      await api.post(`/cms/${type}/`, data);
      toast.success("Item added successfully");
      await fetchAllData();
      setShowModal(false);
      setFormData({});
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to add item"));
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
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
          <div className="flex justify-end">
            <button
              onClick={() => openAddModal("homepage")}
              className="btn-primary flex items-center space-x-2"
            >
              <FaPlus />
              <span>Add Section</span>
            </button>
          </div>
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
                    <p className="text-sm text-gray-500">{section.subtitle}</p>
                  )}
                </div>
                {editingItem === section.id ? (
                  <button
                    onClick={() => handleSave(section.id, formData, "homepage")}
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
              onClick={() => openAddModal("social")}
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Contact Information</h2>
            <button
              onClick={() => openAddModal("contact")}
              className="btn-primary flex items-center space-x-2"
            >
              <FaPlus />
              <span>Add Contact</span>
            </button>
          </div>
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
                      onClick={() => handleDelete(contact.id, "contact-info")}
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
              onClick={() => openAddModal("footer")}
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

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Site Settings</h2>
            <button
              onClick={() => openAddModal("settings")}
              className="btn-primary flex items-center space-x-2"
            >
              <FaPlus />
              <span>Add Setting</span>
            </button>
          </div>
          <div className="space-y-3">
            {siteSettings.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No site settings found</p>
            ) : (
              siteSettings.map((setting) => (
                <div
                  key={setting.id}
                  className="flex items-center justify-between p-3 border-b dark:border-gray-700"
                >
                  <div>
                    <p className="font-medium">{setting.key}</p>
                    <p className="text-sm text-gray-500">{setting.value}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingItem(setting.id);
                        setFormData(setting);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(setting.id, "settings")}
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
                key !== "updated_at" &&
                key !== "section_display" &&
                key !== "platform_display" && (
                  <div key={key} className="mb-3">
                    <label className="block text-sm font-medium mb-1">
                      {key}
                    </label>
                    {key === "section" ? (
                      <select
                        className="input"
                        value={formData.section || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            section: e.target.value,
                          })
                        }
                      >
                        {SECTION_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : key === "platform" ? (
                      <select
                        className="input"
                        value={formData.platform || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            platform: e.target.value,
                          })
                        }
                      >
                        {SOCIAL_PLATFORM_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : key === "contact_type" ? (
                      <select
                        className="input"
                        value={formData.contact_type || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact_type: e.target.value,
                          })
                        }
                      >
                        {CONTACT_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : key === "setting_type" ? (
                      <select
                        className="input"
                        value={formData.setting_type || "text"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            setting_type: e.target.value,
                          })
                        }
                      >
                        {SETTING_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : key === "content" || key === "value" || key === "description" ? (
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
                          key !== "is_active" ? formData[key] || "" : undefined
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
                onClick={async () => {
                  const endpoint = endpointByTab(activeTab);
                  if (editingItem) {
                    await handleSave(
                      editingItem,
                      formData,
                      endpoint,
                    );
                  } else {
                    await handleAdd(
                      formData,
                      endpoint,
                    );
                  }
                }}
                className="btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCMS;

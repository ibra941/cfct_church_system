import { format } from "date-fns";
import { useEffect, useState } from "react";
import { FaBell, FaCheck, FaTrash } from "react-icons/fa";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const Notifications = () => {
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/notifications/");
      const data = response.data?.results || response.data || [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read/`);
      fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post("/notifications/read-all/");
      fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}/`);
      fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "unread") return !notif.is_read;
    if (filter === "read") return notif.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      default:
        return "📢";
    }
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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {language === "sw" ? "Arifa" : "Notifications"}
          </h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount} {language === "sw" ? "mpya" : "new"}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="btn-secondary flex items-center space-x-2"
          >
            <FaCheck />
            <span>
              {language === "sw" ? "Zote kama zimesomwa" : "Mark all as read"}
            </span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-6 border-b dark:border-gray-700">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-sm font-medium transition ${
            filter === "all"
              ? "border-b-2 border-primary-600 text-primary-600"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          {language === "sw" ? "Zote" : "All"}
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-4 py-2 text-sm font-medium transition ${
            filter === "unread"
              ? "border-b-2 border-primary-600 text-primary-600"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          {language === "sw" ? "Zisizosomwa" : "Unread"}
        </button>
        <button
          onClick={() => setFilter("read")}
          className={`px-4 py-2 text-sm font-medium transition ${
            filter === "read"
              ? "border-b-2 border-primary-600 text-primary-600"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          {language === "sw" ? "Zilizosomwa" : "Read"}
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 transition ${
              !notification.is_read ? "border-l-4 border-primary-600" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="text-2xl">
                  {getNotificationIcon(notification.notification_type)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {notification.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {notification.message}
                  </p>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="text-xs text-gray-400">
                      {format(
                        new Date(notification.created_at),
                        "dd/MM/yyyy HH:mm",
                      )}
                    </span>
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        {language === "sw"
                          ? "Weka kama imesomwa"
                          : "Mark as read"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteNotification(notification.id)}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredNotifications.length === 0 && (
        <div className="text-center py-12">
          <FaBell className="text-6xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {language === "sw" ? "Hakuna arifa" : "No notifications"}
          </p>
        </div>
      )}
    </div>
  );
};

export default Notifications;

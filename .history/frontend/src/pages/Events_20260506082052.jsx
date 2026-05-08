import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaCalendarAlt, FaEye, FaMapMarkerAlt, FaPlus, FaTrash } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";
import { extractListData } from "../utils/apiTransforms";

const EVENT_FORM_INITIAL_STATE = {
  title: "",
  description: "",
  event_type: "service",
  start_date: "",
  end_date: "",
  venue: "",
  is_active: true,
};

const Events = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EVENT_FORM_INITIAL_STATE);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const canManageEvents = [
    "national_leader",
    "zone_leader",
    "regional_leader",
    "district_leader",
    "local_leader",
  ].includes(user?.role);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await api.get("/events/?upcoming=true&active=true");
      const data = extractListData(response.data);
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(EVENT_FORM_INITIAL_STATE);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: (formData.title || "").trim(),
        description: (formData.description || "").trim(),
        event_type: formData.event_type || "service",
        venue: (formData.venue || "").trim(),
        is_active: Boolean(formData.is_active),
        start_date: formData.start_date
          ? new Date(formData.start_date).toISOString()
          : undefined,
        end_date: formData.end_date
          ? new Date(formData.end_date).toISOString()
          : null,
      };
      await api.post("/events/", payload);
      setShowModal(false);
      resetForm();
      fetchEvents();
      toast.success(language === "sw" ? "Tukio limeongezwa" : "Event created");
    } catch (error) {
      console.error(error);
      const responseErrors = error?.response?.data;
      const firstFieldError =
        responseErrors && typeof responseErrors === "object"
          ? Object.values(responseErrors).find(
              (value) => Array.isArray(value) && value.length,
            )?.[0]
          : null;
      toast.error(
        firstFieldError ||
          responseErrors?.detail ||
          (language === "sw"
            ? "Imeshindikana kuhifadhi tukio"
            : "Failed to save event"),
      );
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        language === "sw"
          ? "Una hakika unataka kufuta tukio hili?"
          : "Are you sure you want to delete this event?",
      )
    ) {
      return;
    }

    try {
      await api.delete(`/events/${id}/`);
      fetchEvents();
      toast.success(language === "sw" ? "Tukio limefutwa" : "Event deleted");
    } catch (error) {
      console.error(error);
      toast.error(
        language === "sw"
          ? "Imeshindikana kufuta tukio"
          : "Failed to delete event",
      );
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Matukio" : "Events"}
        </h1>
        {canManageEvents && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <FaPlus />
            <span>{language === "sw" ? "Ongeza Tukio" : "Add Event"}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {events.map((event) => (
          <article
            key={event.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden h-full flex flex-col hover:shadow-lg transition"
          >
            {(event.primary_image || event.images?.[0]) && (
              <img
                src={event.primary_image || event.images?.[0]}
                alt={event.title}
                className="h-48 w-full object-cover"
              />
            )}
            <div className="p-4 flex flex-col flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 break-words line-clamp-2">
                {event.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 break-words line-clamp-4">
                {event.description || (language === "sw" ? "Hakuna maelezo ya ziada" : "No additional description")}
              </p>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mt-auto">
                <div className="flex items-center gap-2 min-w-0">
                  <FaCalendarAlt className="flex-shrink-0" />
                  <span className="truncate">
                    {event.start_date
                      ? new Date(event.start_date).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
                {event.venue && (
                  <div className="flex items-center gap-2 min-w-0">
                    <FaMapMarkerAlt className="flex-shrink-0" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                <button
                  onClick={() => setSelectedEvent(event)}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  title={language === "sw" ? "Tazama tukio" : "View event"}
                  aria-label={language === "sw" ? "Tazama tukio" : "View event"}
                >
                  <FaEye />
                  <span>{language === "sw" ? "View" : "View"}</span>
                </button>
                {canManageEvents && event.created_by === user?.id && (
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="text-red-600 hover:text-red-800"
                    title={language === "sw" ? "Futa tukio" : "Delete event"}
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {language === "sw"
              ? "Hakuna matukio yaliyopangwa kwa sasa"
              : "No events scheduled at the moment"}
          </p>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white break-words">
                  {selectedEvent.title}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="btn-secondary"
                >
                  {language === "sw" ? "Funga" : "Close"}
                </button>
              </div>

              {(selectedEvent.primary_image || selectedEvent.images?.[0]) && (
                <img
                  src={selectedEvent.primary_image || selectedEvent.images?.[0]}
                  alt={selectedEvent.title}
                  className="w-full max-h-96 object-cover rounded mb-4"
                />
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span className="inline-flex items-center gap-1">
                  <FaCalendarAlt />
                  {selectedEvent.start_date
                    ? new Date(selectedEvent.start_date).toLocaleString()
                    : "-"}
                </span>
                {selectedEvent.end_date && (
                  <span className="inline-flex items-center gap-1">
                    <FaCalendarAlt />
                    {language === "sw" ? "Mwisho:" : "End:"} {new Date(selectedEvent.end_date).toLocaleString()}
                  </span>
                )}
                {selectedEvent.venue && (
                  <span className="inline-flex items-center gap-1 break-words">
                    <FaMapMarkerAlt />
                    {selectedEvent.venue}
                  </span>
                )}
                {selectedEvent.event_type_display || selectedEvent.event_type ? (
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {selectedEvent.event_type_display || selectedEvent.event_type}
                  </span>
                ) : null}
              </div>

              <p className="text-gray-700 dark:text-gray-200 whitespace-pre-line break-words">
                {selectedEvent.description || (language === "sw" ? "Hakuna maelezo ya ziada." : "No additional description.")}
              </p>
            </div>
          </div>
        </div>
      )}

      {showModal && canManageEvents && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {language === "sw" ? "Ongeza Tukio" : "Add Event"}
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
                    {language === "sw" ? "Maelezo" : "Description"}
                  </label>
                  <textarea
                    className="input"
                    rows="4"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Aina ya Tukio" : "Event Type"}
                    </label>
                    <select
                      className="input"
                      value={formData.event_type}
                      onChange={(e) =>
                        setFormData({ ...formData, event_type: e.target.value })
                      }
                    >
                      <option value="service">Service</option>
                      <option value="conference">Conference</option>
                      <option value="seminar">Seminar</option>
                      <option value="prayer_meeting">Prayer Meeting</option>
                      <option value="youth">Youth Event</option>
                      <option value="children">Children Event</option>
                      <option value="outreach">Outreach</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Ukumbi/Eneo" : "Venue"}
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.venue}
                      onChange={(e) =>
                        setFormData({ ...formData, venue: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Muda wa Kuanza" : "Start Date"}
                    </label>
                    <input
                      type="datetime-local"
                      required
                      className="input"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Muda wa Mwisho" : "End Date"}
                    </label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
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

export default Events;

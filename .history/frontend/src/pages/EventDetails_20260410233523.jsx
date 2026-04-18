import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const EventDetails = () => {
  const { language } = useLanguage();
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/events/${id}/`);
        setEvent(response.data);
      } catch (error) {
        console.error("Error fetching event details:", error);
        toast.error(
          language === "sw"
            ? "Hitilafu wakati wa kupakua taarifa za tukio"
            : "Unable to load event details",
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id, language]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {language === "sw" ? "Tukio halikuonekana." : "Event not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {event.title}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {event.description}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Maelezo ya Tukio" : "Event Details"}
          </h2>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Mwanzo:" : "Start:"}
              </span>{" "}
              {event.start_date ? new Date(event.start_date).toLocaleDateString() : "-"}
            </p>
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Mwisho:" : "End:"}
              </span>{" "}
              {event.end_date ? new Date(event.end_date).toLocaleDateString() : "-"}
            </p>
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Mahali:" : "Location:"}
              </span>{" "}
              {event.location || "-"}
            </p>
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Kanisa:" : "Church:"}
              </span>{" "}
              {event.church_name || "-"}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Maelezo ya Ziada" : "Additional Info"}
          </h2>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Aina ya Tukio:" : "Type:"}
              </span>{" "}
              {event.event_type || "-"}
            </p>
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Mukubwa wa Tukio:" : "Status:"}
              </span>{" "}
              {event.is_active
                ? language === "sw"
                  ? "Inatumika"
                  : "Active"
                : language === "sw"
                  ? "Haifanyi kazi"
                  : "Inactive"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;

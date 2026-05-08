import { useEffect, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";
import { extractListData } from "../utils/apiTransforms";

const Events = () => {
  const { language } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {language === "sw" ? "Matukio" : "Events"}
      </h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
          >
            {(event.primary_image || event.images?.[0]) && (
              <img
                src={event.primary_image || event.images?.[0]}
                alt={event.title}
                className="h-48 w-full object-cover"
              />
            )}
            <div className="p-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {event.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {event.description}
              </p>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span>
                  📅 {new Date(event.start_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
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
    </div>
  );
};

export default Events;

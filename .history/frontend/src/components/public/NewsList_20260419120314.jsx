import { useEffect, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../services/api";
import { extractListData } from "../../utils/apiTransforms";

const NewsList = () => {
  const { language } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHighlights();
  }, []);

  const fetchHighlights = async () => {
    try {
      const [newsResponse, eventsResponse] = await Promise.all([
        api.get("/news/latest/"),
        api.get("/events/?upcoming=true&active=true"),
      ]);

      const newsItems = extractListData(newsResponse.data).map((item) => ({
        ...item,
        itemType: "news",
        displayDate: item.published_at || item.created_at,
        summary: item.excerpt || item.content,
        image: item.primary_image || item.featured_image,
      }));

      const eventItems = extractListData(eventsResponse.data).map((item) => ({
        ...item,
        itemType: "event",
        displayDate: item.start_date || item.created_at,
        summary: item.description,
        image: item.primary_image || item.images?.[0] || null,
      }));

      const combinedItems = [...newsItems, ...eventItems]
        .sort((left, right) => {
          const leftDate = new Date(left.displayDate || 0).getTime();
          const rightDate = new Date(right.displayDate || 0).getTime();
          return rightDate - leftDate;
        })
        .slice(0, 3);

      setItems(combinedItems);
    } catch (error) {
      console.error(error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <section className="py-16 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Habari na Matukio" : "News and Events"}
          </h2>
          <div className="w-24 h-1 bg-primary-600 mx-auto"></div>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {items.map((item) => (
            <div key={item.id} className="card hover:shadow-lg transition">
              {item.image && (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-48 object-cover rounded-t-lg -mt-6 -mx-6 mb-4"
                  style={{ width: "calc(100% + 48px)" }}
                />
              )}
              <div className="mb-3">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    item.itemType === "event"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {item.itemType === "event"
                    ? language === "sw"
                      ? "Tukio"
                      : "Event"
                    : language === "sw"
                      ? "Habari"
                      : "News"}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {item.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {(item.summary || "").slice(0, 140)}
                {(item.summary || "").length > 140 ? "..." : ""}
              </p>
              {item.itemType === "event" && item.venue && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                  {item.venue}
                </p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                {item.displayDate
                  ? new Date(item.displayDate).toLocaleDateString()
                  : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewsList;

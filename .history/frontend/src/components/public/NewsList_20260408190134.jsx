import { useEffect, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../services/api";

const NewsList = () => {
  const { language } = useLanguage();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await api.get("/news/");
      setNews(response.data.slice(0, 3));
    } catch (error) {
      console.error(error);
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
          {news.map((item) => (
            <div key={item.id} className="card hover:shadow-lg transition">
              {item.featured_image && (
                <img
                  src={item.featured_image}
                  alt={item.title}
                  className="w-full h-48 object-cover rounded-t-lg -mt-6 -mx-6 mb-4"
                  style={{ width: "calc(100% + 48px)" }}
                />
              )}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {item.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {item.excerpt || item.content.substring(0, 100)}...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                {new Date(item.published_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewsList;

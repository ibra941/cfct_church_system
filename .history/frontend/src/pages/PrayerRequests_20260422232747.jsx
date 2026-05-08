import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const PrayerRequests = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestText, setRequestText] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    fetchPrayers();
  }, []);

  const fetchPrayers = async () => {
    try {
      const response = await api.get("/prayers/");
      const data = response.data?.results || response.data || [];
      setPrayers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setPrayers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requestText.trim()) {
      toast.error(
        language === "sw"
          ? "Tafadhali andika ombi la maombi"
          : "Please enter a prayer request",
      );
      return;
    }

    try {
      await api.post("/prayers/", {
        request: requestText.trim(),
        is_public: isPublic,
      });
      toast.success(
        language === "sw"
          ? "Ombi lako limetumwa!"
          : "Your prayer request has been submitted!",
      );
      setRequestText("");
      fetchPrayers();
    } catch (error) {
      const backendError =
        error?.response?.data?.request?.[0] ||
        error?.response?.data?.member?.[0] ||
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        (language === "sw" ? "Hitilafu imetokea" : "An error occurred");
      toast.error(backendError);
    }
  };

  const handlePray = async (id) => {
    try {
      await api.post(`/prayers/${id}/pray/`);
      toast.success(
        language === "sw"
          ? "Umeomba kwa ajili ya ndugu yako!"
          : "You have prayed for your brother/sister!",
      );
      fetchPrayers();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {language === "sw" ? "Maombi" : "Prayer Requests"}
      </h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw"
              ? "Wasilisha Ombi la Maombi"
              : "Submit Prayer Request"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              className="input"
              rows="4"
              placeholder={
                language === "sw"
                  ? "Andika ombi lako la maombi hapa..."
                  : "Write your prayer request here..."
              }
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              required
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label
                htmlFor="isPublic"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                {language === "sw"
                  ? "Weka ombi langu hadharani (wengine wanaweza kuona)"
                  : "Make my request public (others can see it)"}
              </label>
            </div>
            <button type="submit" className="btn-primary w-full">
              {language === "sw" ? "Wasilisha Ombi" : "Submit Request"}
            </button>
          </form>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw"
              ? "Maombi ya Hivi Karibuni"
              : "Recent Prayer Requests"}
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {prayers.map((prayer) => (
              <div
                key={prayer.id}
                className="border-b border-gray-200 dark:border-gray-700 pb-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-900 dark:text-white">
                      {prayer.request}
                    </p>
                    <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>
                        🙏 {new Date(prayer.created_at).toLocaleDateString()}
                      </span>
                      {prayer.prayer_count > 0 && (
                        <span className="ml-4">
                          ❤️ {prayer.prayer_count}{" "}
                          {language === "sw" ? "walioomba" : "prayed"}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handlePray(prayer.id)}
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    {language === "sw" ? "Nimeomba" : "I Prayed"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrayerRequests;

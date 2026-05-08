import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaPhone, FaSearch, FaUsers } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const ChurchDirectory = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const t = (sw, en) => (language === "sw" ? sw : en);

  useEffect(() => {
    fetchDirectory();
  }, []);

  const fetchDirectory = async () => {
    setLoading(true);
    try {
      const response = await api.get("/members/");
      const data = response.data?.results || response.data || [];
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(
        t(
          "Imeshindikana kupata orodha ya wanachama",
          "Failed to load church directory",
        ),
      );
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = members.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (m.full_name || "").toLowerCase().includes(q) ||
      (m.neighborhood || "").toLowerCase().includes(q) ||
      (m.phone || "").includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-2">
          <FaUsers className="text-primary-600 text-2xl" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("Orodha ya Kanisa", "Church Directory")}
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t(
            "Wanachama wote wa kanisa lako — unaweza kuwasiliana nao kupitia orodha hii.",
            "All members of your church — you can reach out to them using this directory.",
          )}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder={t(
            "Tafuta jina, mtaa au simu...",
            "Search name, area or phone...",
          )}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Directory Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((member) => (
          <div
            key={member.id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 flex items-start gap-4 ${
              member.id === user?.id
                ? "border-primary-300 dark:border-primary-700"
                : "border-gray-100 dark:border-gray-700"
            }`}
          >
            <img
              src={member.profile_picture_url || "/icons/icon-72x72.png"}
              alt={member.full_name}
              className="h-12 w-12 rounded-full object-cover border border-gray-200 dark:border-gray-600 shrink-0"
            />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">
                {member.full_name || member.username}
                {member.id === user?.id && (
                  <span className="ml-2 text-xs text-primary-500">
                    ({t("Wewe", "You")})
                  </span>
                )}
              </p>
              {member.neighborhood && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {member.neighborhood}
                </p>
              )}
              {member.phone && (
                <a
                  href={`tel:${member.phone}`}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 mt-1"
                >
                  <FaPhone size={10} /> {member.phone}
                </a>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            {t(
              "Hakuna wanachama wanaolingana na utafutaji wako.",
              "No members match your search.",
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChurchDirectory;

import { useEffect, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const AuditLogs = () => {
  const { language } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async (nextFilters = {}) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const params = {
        action: nextFilters.action ?? actionFilter,
        search: nextFilters.search ?? search,
        limit: 200,
      };

      if (!params.action) {
        delete params.action;
      }
      if (!params.search) {
        delete params.search;
      }

      const response = await api.get("/audit-logs/", { params });
      const data = response.data || [];
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      if (error.response?.status === 403) {
        setErrorMessage(
          language === "sw"
            ? "Huna ruhusa ya kuona rekodi za ukaguzi."
            : "You are not authorized to view audit logs.",
        );
      } else {
        setErrorMessage(
          language === "sw"
            ? "Imeshindikana kupata rekodi za ukaguzi."
            : "Failed to load audit logs.",
        );
      }
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const actionBadgeClass = (action) => {
    if (action === "CREATE") return "bg-green-100 text-green-800";
    if (action === "UPDATE") return "bg-blue-100 text-blue-800";
    if (action === "DELETE") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const onApplyFilters = () => {
    fetchLogs({ action: actionFilter, search });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {language === "sw" ? "Rekodi za Ukaguzi" : "Audit Logs"}
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-900"
            placeholder={
              language === "sw"
                ? "Tafuta mtumiaji/jedwali/kitu"
                : "Search user/table/object"
            }
          />
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-900"
          >
            <option value="">
              {language === "sw" ? "Vitendo vyote" : "All actions"}
            </option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <button
            onClick={onApplyFilters}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded"
          >
            {language === "sw" ? "Tumia vichujio" : "Apply filters"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-sm text-gray-500 dark:text-gray-400">
          {language === "sw"
            ? "Inapakia rekodi za ukaguzi..."
            : "Loading audit logs..."}
        </div>
      ) : errorMessage ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {errorMessage}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-sm text-gray-500 dark:text-gray-400">
          {language === "sw"
            ? "Hakuna rekodi zilizopatikana."
            : "No logs found."}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Mtumiaji" : "User"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Kitendo" : "Action"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Jedwali" : "Table"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Kitu" : "Object"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Tarehe" : "Date"}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {log.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${actionBadgeClass(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {log.table_name}
                  </td>
                  <td
                    className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-sm truncate"
                    title={log.object_repr}
                  >
                    {log.object_repr || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;

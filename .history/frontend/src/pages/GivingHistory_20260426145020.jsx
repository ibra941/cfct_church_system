import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const GivingHistory = () => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [data, setData] = useState({
    records: [],
    by_type: {},
    total_amount: 0,
  });
  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
  });

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      const response = await api.get("/offerings/my-history/", { params });
      setData({
        records: response.data?.records || [],
        by_type: response.data?.by_type || {},
        total_amount: response.data?.total_amount || 0,
      });
    } catch (error) {
      toast.error(
        language === "sw"
          ? "Imeshindikana kupata historia ya matoleo"
          : "Failed to load giving history",
      );
      setData({ records: [], by_type: {}, total_amount: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filters.start_date, filters.end_date]);

  const groupedTypes = useMemo(() => {
    return Object.entries(data.by_type || {}).sort((a, b) => b[1] - a[1]);
  }, [data.by_type]);

  const downloadStatement = async () => {
    setDownloading(true);
    try {
      const params = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await api.get("/offerings/statement/download/", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "text/csv" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "giving-statement.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(
        language === "sw"
          ? "Taarifa ya kodi imepakuliwa"
          : "Tax-compliant statement downloaded",
      );
    } catch (error) {
      toast.error(
        language === "sw"
          ? "Imeshindikana kupakua taarifa"
          : "Failed to download statement",
      );
    } finally {
      setDownloading(false);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Historia ya Matoleo" : "Giving History"}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {language === "sw"
            ? "Tazama matoleo yako binafsi kwa aina na pakua taarifa ya kodi"
            : "View your personal giving by type and download tax-compliant statements"}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 grid md:grid-cols-3 gap-3">
        <input
          type="date"
          className="input"
          value={filters.start_date}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, start_date: e.target.value }))
          }
        />
        <input
          type="date"
          className="input"
          value={filters.end_date}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, end_date: e.target.value }))
          }
        />
        <button
          type="button"
          className="btn-primary"
          onClick={downloadStatement}
          disabled={downloading}
        >
          {downloading
            ? language === "sw"
              ? "Inapakua..."
              : "Downloading..."
            : language === "sw"
              ? "Pakua Taarifa ya Kodi"
              : "Download Tax Statement"}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {language === "sw" ? "Jumla ya Matoleo" : "Total Giving"}
          </h2>
          <p className="text-3xl font-bold text-primary-600">
            TZS {Number(data.total_amount || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {language === "sw" ? "Mgawanyo kwa Aina" : "By Giving Type"}
          </h2>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {groupedTypes.length > 0 ? (
              groupedTypes.map(([type, amount]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 capitalize">
                    {type.replace("_", " ")}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    TZS {Number(amount || 0).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === "sw" ? "Hakuna data" : "No data"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full md:min-w-[920px] divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {language === "sw" ? "Tarehe" : "Date"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {language === "sw" ? "Aina" : "Type"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {language === "sw" ? "Kiasi" : "Amount"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {language === "sw" ? "Njia ya Malipo" : "Payment Method"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {language === "sw" ? "Risiti" : "Receipt"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {data.records.length > 0 ? (
                data.records.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.payment_date || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.offering_type_display || item.offering_type}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      TZS {Number(item.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.payment_method}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.receipt_no || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {language === "sw"
                      ? "Hakuna historia ya matoleo kwa vigezo ulivyochagua"
                      : "No giving history for the selected filters"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GivingHistory;

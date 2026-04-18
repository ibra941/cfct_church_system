import { useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaChartBar,
  FaFileExcel,
  FaFilePdf,
  FaPrint,
} from "react-icons/fa";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const Reports = () => {
  const { language } = useLanguage();
  const [reportType, setReportType] = useState("offerings");
  const [dateRange, setDateRange] = useState("month");
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_offerings: 0,
    total_members: 0,
    total_events: 0,
    total_churches: 0,
  });

  useEffect(() => {
    fetchReportData();
  }, [reportType, dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch summary stats
      const statsResponse = await api.get("/dashboard/stats/");
      setSummary(statsResponse.data);

      // Fetch monthly summary
      const monthlyResponse = await api.get("/finance/monthly-summary/");
      setChartData(
        monthlyResponse.data?.monthly_income || generateSampleData(),
      );
    } catch (error) {
      console.error(error);
      setChartData(generateSampleData());
    } finally {
      setLoading(false);
    }
  };

  const generateSampleData = () => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return months.map((month) => ({
      month,
      income: Math.floor(Math.random() * 5000000) + 1000000,
      expense: Math.floor(Math.random() * 3000000) + 500000,
    }));
  };

  const handleExport = async (format) => {
    try {
      const response = await api.get(
        `/reports/export/${reportType}/?format=${format}`,
        {
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${reportType}_report.${format === "excel" ? "xlsx" : "pdf"}`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const reportTypes = [
    {
      value: "offerings",
      label: language === "sw" ? "Ripoti ya Matoleo" : "Offerings Report",
    },
    {
      value: "members",
      label: language === "sw" ? "Ripoti ya Wanachama" : "Members Report",
    },
    {
      value: "events",
      label: language === "sw" ? "Ripoti ya Matukio" : "Events Report",
    },
    {
      value: "financial",
      label: language === "sw" ? "Ripoti ya Fedha" : "Financial Report",
    },
  ];

  const dateRanges = [
    { value: "week", label: language === "sw" ? "Wiki hii" : "This Week" },
    { value: "month", label: language === "sw" ? "Mwezi huu" : "This Month" },
    {
      value: "quarter",
      label: language === "sw" ? "Robo mwaka" : "This Quarter",
    },
    { value: "year", label: language === "sw" ? "Mwaka huu" : "This Year" },
  ];

  const summaryCards = [
    {
      title: language === "sw" ? "Jumla ya Matoleo" : "Total Offerings",
      value: `TZS ${summary.total_offerings?.toLocaleString() || "0"}`,
      icon: <FaChartBar />,
      color: "bg-green-500",
    },
    {
      title: language === "sw" ? "Wanachama" : "Members",
      value: summary.total_members || 0,
      icon: <FaChartBar />,
      color: "bg-blue-500",
    },
    {
      title: language === "sw" ? "Matukio" : "Events",
      value: summary.total_events || 0,
      icon: <FaCalendarAlt />,
      color: "bg-yellow-500",
    },
    {
      title: language === "sw" ? "Makanisa" : "Churches",
      value: summary.total_churches || 0,
      icon: <FaChartBar />,
      color: "bg-purple-500",
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Ripoti" : "Reports"}
        </h1>
        <div className="flex space-x-2">
          <button
            onClick={() => handleExport("excel")}
            className="btn-secondary flex items-center space-x-2"
          >
            <FaFileExcel className="text-green-600" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="btn-secondary flex items-center space-x-2"
          >
            <FaFilePdf className="text-red-600" />
            <span>PDF</span>
          </button>
          <button
            onClick={handlePrint}
            className="btn-secondary flex items-center space-x-2"
          >
            <FaPrint />
            <span>{language === "sw" ? "Chapisha" : "Print"}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === "sw" ? "Aina ya Ripoti" : "Report Type"}
            </label>
            <select
              className="input"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === "sw" ? "Kipindi" : "Date Range"}
            </label>
            <select
              className="input"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              {dateRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {card.title}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {card.value}
                </p>
              </div>
              <div className={`${card.color} p-3 rounded-full text-white`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {language === "sw" ? "Muhtasari wa Kila Mwezi" : "Monthly Summary"}
        </h2>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#3b82f6"
                name={language === "sw" ? "Mapato" : "Income"}
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                name={language === "sw" ? "Matumizi" : "Expense"}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bar Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {language === "sw" ? "Matoleo kwa Aina" : "Offerings by Type"}
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="income"
              fill="#3b82f6"
              name={language === "sw" ? "Mapato" : "Income"}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Reports;

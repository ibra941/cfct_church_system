import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaChurch,
  FaDonate,
  FaUsers,
} from "react-icons/fa";
import { useLanguage } from "../../contexts/LanguageContext";
import LoadingSpinner from "../common/LoadingSpinner";

const DashboardCards = ({ stats, loading, showTrends = true }) => {
  const { language } = useLanguage();

  if (loading) return <LoadingSpinner />;

  // Helper function to format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "TZS 0";
    return new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: "TZS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper function to get trend icon and color
  const getTrendInfo = (change) => {
    if (!change) return null;
    const isPositive = change.toString().startsWith("+");
    return {
      icon: isPositive ? (
        <FaArrowUp className="text-xs" />
      ) : (
        <FaArrowDown className="text-xs" />
      ),
      color: isPositive ? "text-green-500" : "text-red-500",
      text: change,
    };
  };

  const cards = [
    {
      title: language === "sw" ? "Wanachama" : "Members",
      value: stats.totalMembers?.toLocaleString() || 0,
      icon: <FaUsers />,
      color: "bg-blue-500",
      bgLight: "bg-blue-50 dark:bg-blue-900/20",
      change: stats.membersGrowth || stats.monthlyGrowth,
      subValue: stats.newMembersThisMonth
        ? `+${stats.newMembersThisMonth} ${language === "sw" ? "mwezi huu" : "this month"}`
        : null,
    },
    {
      title: language === "sw" ? "Matoleo" : "Offerings",
      value: formatCurrency(stats.totalOfferings),
      icon: <FaDonate />,
      color: "bg-green-500",
      bgLight: "bg-green-50 dark:bg-green-900/20",
      change: stats.offeringsGrowth,
      subValue: stats.avgOfferingPerMember
        ? `${formatCurrency(stats.avgOfferingPerMember)} ${language === "sw" ? "kwa mwanachama" : "per member"}`
        : null,
    },
    {
      title: language === "sw" ? "Makanisa" : "Churches",
      value: stats.totalChurches?.toLocaleString() || 0,
      icon: <FaChurch />,
      color: "bg-purple-500",
      bgLight: "bg-purple-50 dark:bg-purple-900/20",
      change: stats.churchesGrowth,
      subValue: stats.totalLocals
        ? `${stats.totalLocals} ${language === "sw" ? "Za Kieneo" : "Local"}`
        : null,
    },
    {
      title: language === "sw" ? "Matukio" : "Events",
      value: stats.totalEvents?.toLocaleString() || 0,
      icon: <FaCalendarAlt />,
      color: "bg-yellow-500",
      bgLight: "bg-yellow-50 dark:bg-yellow-900/20",
      change: stats.eventsGrowth,
      subValue: stats.upcomingEvents
        ? `${stats.upcomingEvents} ${language === "sw" ? "Yajayo" : "Upcoming"}`
        : null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`${card.bgLight} dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transform hover:scale-105 transition-all duration-300 hover:shadow-lg`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div
                className={`${card.color} p-3 rounded-xl text-white shadow-lg`}
              >
                {card.icon}
              </div>
              {showTrends && card.change && (
                <div className="flex items-center space-x-1">
                  <span className={getTrendInfo(card.change)?.color}>
                    {getTrendInfo(card.change)?.icon}
                  </span>
                  <span
                    className={`text-xs font-medium ${getTrendInfo(card.change)?.color}`}
                  >
                    {card.change}
                  </span>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {card.title}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {card.value}
              </p>
              {card.subValue && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {card.subValue}
                </p>
              )}
            </div>
          </div>

          {/* Progress bar for offerings (optional) */}
          {card.title === (language === "sw" ? "Matoleo" : "Offerings") &&
            stats.offeringsTarget && (
              <div className="px-6 pb-4">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>
                    {language === "sw" ? "Lengo la Mwezi" : "Monthly Target"}
                  </span>
                  <span>
                    {Math.round(
                      (stats.totalOfferings / stats.offeringsTarget) * 100,
                    )}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 rounded-full h-2 transition-all duration-500"
                    style={{
                      width: `${Math.min((stats.totalOfferings / stats.offeringsTarget) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
        </div>
      ))}
    </div>
  );
};

export default DashboardCards;

import {
  FaBell,
  FaBuilding,
  FaCalendarAlt,
  FaChartLine,
  FaChurch,
  FaClipboardList,
  FaCog,
  FaDonate,
  FaExchangeAlt,
  FaFileAlt,
  FaHome,
  FaNewspaper,
  FaPalette,
  FaSignOutAlt,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

const Sidebar = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if a menu item is active (supports subpaths)
  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname.startsWith("/dashboard");
    }
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const menuItems = [
    // Dashboard - visible to all leaders
    {
      path: "/dashboard",
      icon: <FaHome />,
      label: language === "sw" ? "Dashibodi" : "Dashboard",
      roles: [
        "national_leader",
        "zone_leader",
        "regional_leader",
        "district_leader",
        "local_leader",
        "local_member",
      ],
    },

    // Church Management
    {
      path: "/churches",
      icon: <FaChurch />,
      label: language === "sw" ? "Makanisa" : "Churches",
      roles: ["national_leader", "zone_leader"],
    },

    // Member Management
    {
      path: "/members",
      icon: <FaUsers />,
      label: language === "sw" ? "Wanachama" : "Members",
      roles: [
        "national_leader",
        "zone_leader",
        "regional_leader",
        "district_leader",
        "local_leader",
      ],
    },

    // Member Approvals
    {
      path: "/approvals",
      icon: <FaUserCheck />,
      label: language === "sw" ? "Idhini za Wanachama" : "Member Approvals",
      roles: [
        "national_leader",
        "zone_leader",
        "regional_leader",
        "district_leader",
        "local_leader",
      ],
    },

    // Offerings/Finance
    {
      path: "/offerings",
      icon: <FaDonate />,
      label: language === "sw" ? "Matoleo" : "Offerings",
      roles: ["national_leader", "finance_team", "district_leader"],
    },

    // Financial Reports
    {
      path: "/finance",
      icon: <FaChartLine />,
      label: language === "sw" ? "Ripoti za Fedha" : "Finance Reports",
      roles: ["national_leader", "finance_team"],
    },

    // Events
    {
      path: "/events",
      icon: <FaCalendarAlt />,
      label: language === "sw" ? "Matukio" : "Events",
      roles: [
        "national_leader",
        "zone_leader",
        "regional_leader",
        "district_leader",
        "local_leader",
      ],
    },

    // Departments
    {
      path: "/departments",
      icon: <FaBuilding />,
      label: language === "sw" ? "Idara" : "Departments",
      roles: [
        "national_leader",
        "zone_leader",
        "regional_leader",
        "district_leader",
      ],
    },

    // Member Transfers
    {
      path: "/transfers",
      icon: <FaExchangeAlt />,
      label: language === "sw" ? "Uhamisho" : "Transfers",
      roles: ["national_leader", "zone_leader", "regional_leader"],
    },

    // News/Blog (CMS)
    {
      path: "/news",
      icon: <FaNewspaper />,
      label: language === "sw" ? "Habari" : "News",
      roles: ["national_leader", "zone_leader"],
    },

    // Notifications
    {
      path: "/notifications",
      icon: <FaBell />,
      label: language === "sw" ? "Arifa" : "Notifications",
      roles: [
        "national_leader",
        "zone_leader",
        "regional_leader",
        "district_leader",
      ],
    },

    // Reports
    {
      path: "/reports",
      icon: <FaFileAlt />,
      label: language === "sw" ? "Ripoti" : "Reports",
      roles: ["national_leader", "finance_team"],
    },

    // Audit Logs (National only)
    {
      path: "/audit-logs",
      icon: <FaClipboardList />,
      label: language === "sw" ? "Rekodi za Ukaguzi" : "Audit Logs",
      roles: ["national_leader"],
    },

    // CMS - Content Management System (National only)
    {
      path: "/cms",
      icon: <FaPalette />,
      label: language === "sw" ? "Maudhui ya Tovuti" : "Website Content",
      roles: ["national_leader"],
    },

    // Settings
    {
      path: "/settings",
      icon: <FaCog />,
      label: language === "sw" ? "Mipangilio" : "Settings",
      roles: [
        "national_leader",
        "zone_leader",
        "regional_leader",
        "district_leader",
      ],
    },
  ];

  // Filter menu items based on user role
  const filteredMenu = menuItems.filter(
    (item) => user && item.roles.includes(user.role),
  );

  // Group menu items for better organization (optional)
  const mainMenu = filteredMenu.filter((item) =>
    ["/dashboard", "/churches", "/members", "/approvals"].includes(item.path),
  );

  const financeMenu = filteredMenu.filter((item) =>
    ["/offerings", "/finance"].includes(item.path),
  );

  const ministryMenu = filteredMenu.filter((item) =>
    ["/events", "/departments", "/transfers"].includes(item.path),
  );

  const adminMenu = filteredMenu.filter((item) =>
    [
      "/news",
      "/notifications",
      "/reports",
      "/audit-logs",
      "/cms",
      "/settings",
    ].includes(item.path),
  );

  // Section titles
  const sectionTitles = {
    main: language === "sw" ? "Kuu" : "Main",
    finance: language === "sw" ? "Fedha" : "Finance",
    ministry: language === "sw" ? "Huduma" : "Ministry",
    admin: language === "sw" ? "Usimamizi" : "Administration",
  };

  // Render section with title
  const renderSection = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </div>
        {items.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition ${
              isActive(item.path)
                ? "bg-primary-600 text-white"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg h-screen sticky top-0 overflow-y-auto flex-shrink-0">
      {/* Logo Section */}
      <div className="p-4 border-b dark:border-gray-700">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <img src="/icons/icon-72x72.png" alt="CFCT" className="w-8 h-8" />
          <span className="text-xl font-bold text-primary-600">CFCT</span>
        </Link>
      </div>

      {/* User Info Section */}
      {user && (
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <span className="text-primary-600 dark:text-primary-400 font-bold text-lg">
                {user.full_name?.charAt(0) || user.username?.charAt(0) || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.full_name || user.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.role?.replace("_", " ").toUpperCase() || "Member"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="p-4">
        {renderSection(sectionTitles.main, mainMenu)}
        {renderSection(sectionTitles.finance, financeMenu)}
        {renderSection(sectionTitles.ministry, ministryMenu)}
        {renderSection(sectionTitles.admin, adminMenu)}
      </nav>

      {/* Logout Section */}
      <div className="p-4 border-t dark:border-gray-700 mt-auto">
        <button
          onClick={() => navigate("/logout")}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          <span className="text-lg">
            <FaSignOutAlt />
          </span>
          <span className="text-sm font-medium">
            {language === "sw" ? "Ondoka" : "Logout"}
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

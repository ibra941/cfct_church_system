import { Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Navbar from "../common/Navbar";
import Sidebar from "../common/Sidebar";

const DashboardLayout = ({ children }) => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar showSidebarToggle={false} />
        <main className="flex-1 overflow-y-auto p-4">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

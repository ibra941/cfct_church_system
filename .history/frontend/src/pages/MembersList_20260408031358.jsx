import { useEffect, useState } from "react";
import Navbar from "../components/common/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const MembersList = () => {
  const { language } = useLanguage();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  console.log("🔴 MembersList component is RENDERING");

  useEffect(() => {
    console.log("🔴 useEffect triggered - fetching members...");
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    console.log("🔴 fetchMembers started");
    try {
      const response = await api.get("/members/");
      console.log("🔴 API Response:", response);
      console.log("🔴 Response data:", response.data);
      const membersData = response.data.results || response.data;
      console.log("🔴 Processed members:", membersData);
      setMembers(membersData);
    } catch (error) {
      console.error("🔴 Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    console.log("🔴 Showing loading spinner");
    return (
      <div>
        <Navbar />
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  console.log("🔴 Rendering members table, members count:", members.length);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          {language === "sw" ? "Wanachama" : "Members"}
        </h1>

        {/* DEBUG: Show raw data */}
        <div className="bg-red-100 p-4 mb-4 rounded">
          <p>DEBUG: Members count = {members.length}</p>
          <p>DEBUG: Loading = {loading ? "Yes" : "No"}</p>
        </div>

        {members.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {language === "sw"
                ? "Hakuna wanachama waliopatikana."
                : "No members found."}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {language === "sw" ? "Jina" : "Name"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {language === "sw" ? "Nafasi" : "Role"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {member.full_name || member.username}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {member.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {member.role}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MembersList;

import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const MembersList = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [alphabet, setAlphabet] = useState("");
  const [totalMembers, setTotalMembers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  useEffect(() => {
    fetchMembers();
  }, [search, alphabet, currentPage, user?.role]);

  const fetchMembers = async () => {
    try {
      const params = { page: currentPage };
      if (search.trim()) params.search = search.trim();
      if (alphabet) params.alphabet = alphabet;
      if (user?.role === "national_leader") params.include_all = true;
      const response = await api.get("/members/", { params });
      const membersData = response.data.results || response.data || [];
      setMembers(membersData);
      setTotalMembers(
        typeof response.data.count === "number"
          ? response.data.count
          : Array.isArray(membersData)
            ? membersData.length
            : 0,
      );
      if (Array.isArray(membersData) && membersData.length > 0) {
        setPageSize(membersData.length);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      setMembers([]);
      setTotalMembers(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        {language === "sw" ? "Wanachama" : "Members"}
      </h1>

      <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        {language === "sw"
          ? `Jumla ya wanachama/watumiaji: ${totalMembers}`
          : `Total members/users: ${totalMembers}`}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <input
            type="text"
            className="input"
            placeholder={
              language === "sw"
                ? "Tafuta mwanachama kwa jina"
                : "Search member by name"
            }
            value={search}
            onChange={(e) => {
              setCurrentPage(1);
              setSearch(e.target.value);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1 rounded text-xs ${alphabet === "" ? "bg-primary-600 text-white" : "bg-gray-100 dark:bg-gray-700"}`}
              onClick={() => {
                setCurrentPage(1);
                setAlphabet("");
              }}
            >
              {language === "sw" ? "Zote" : "All"}
            </button>
            {letters.map((letter) => (
              <button
                key={letter}
                className={`px-3 py-1 rounded text-xs ${alphabet === letter ? "bg-primary-600 text-white" : "bg-gray-100 dark:bg-gray-700"}`}
                onClick={() => {
                  setCurrentPage(1);
                  setAlphabet(letter);
                }}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {language === "sw"
              ? "Hakuna wanachama waliopatikana. Tafadhali ongeza mwanachama kupitia admin panel."
              : "No members found. Please add members through the admin panel."}
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
                  {language === "sw" ? "Simu" : "Phone"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Nafasi" : "Role"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {language === "sw" ? "Hali" : "Status"}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {member.full_name || member.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {member.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {member.phone || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.is_active
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {member.is_active
                        ? language === "sw"
                          ? "Inatumika"
                          : "Active"
                        : language === "sw"
                          ? "Haijatumika"
                          : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalMembers > pageSize && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            {language === "sw" ? "Nyuma" : "Previous"}
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {language === "sw" ? `Ukurasa ${currentPage}` : `Page ${currentPage}`}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={currentPage * pageSize >= totalMembers}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            {language === "sw" ? "Mbele" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
};

export default MembersList;

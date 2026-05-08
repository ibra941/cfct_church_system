import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const ROLE_OPTIONS = [
  "national_leader",
  "zone_leader",
  "regional_leader",
  "district_leader",
  "local_leader",
  "local_member",
];

const roleLabels = {
  national_leader: "National Leader",
  zone_leader: "Zone Leader",
  regional_leader: "Regional Leader",
  district_leader: "District Leader",
  local_leader: "Local Leader",
  local_member: "Local Member",
};

const ManageUsers = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter]);

  const fetchUsers = async (override = {}) => {
    setLoading(true);
    try {
      const params = {
        page: override.page ?? currentPage,
        role: override.role ?? roleFilter,
        search: override.search ?? search,
      };

      if (!params.role) {
        delete params.role;
      }
      if (!params.search?.trim()) {
        delete params.search;
      } else {
        params.search = params.search.trim();
      }

      const response = await api.get("/users/", { params });
      const nextUsers = response.data?.results || response.data || [];
      setUsers(Array.isArray(nextUsers) ? nextUsers : []);
      setTotalUsers(
        typeof response.data?.count === "number"
          ? response.data.count
          : Array.isArray(nextUsers)
            ? nextUsers.length
            : 0,
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(
        language === "sw"
          ? "Imeshindikana kupata watumiaji"
          : "Failed to load users",
      );
      setUsers([]);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchUsers({ page: 1, role: roleFilter, search });
  };

  const handleDeleteUser = async (userItem) => {
    const confirmed = window.confirm(
      language === "sw"
        ? `Una uhakika unataka kufuta ${userItem.full_name || userItem.username}?`
        : `Are you sure you want to delete ${userItem.full_name || userItem.username}?`,
    );
    if (!confirmed) {
      return;
    }

    setSubmittingId(userItem.id);
    try {
      await api.delete(`/users/${userItem.id}/`);
      toast.success(language === "sw" ? "Mtumiaji amefutwa" : "User deleted");

      const nextPage =
        users.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      if (nextPage !== currentPage) {
        setCurrentPage(nextPage);
      }
      fetchUsers({ page: nextPage, role: roleFilter, search });
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ||
          (language === "sw"
            ? "Imeshindikana kufuta mtumiaji"
            : "Failed to delete user"),
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalUsers / 20));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {language === "sw" ? "Simamia Watumiaji" : "Manage Users"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === "sw"
              ? "Orodha ya watumiaji wote wanaosimamiwa na uongozi wa taifa."
              : "Manage all users available to the national leadership team."}
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {language === "sw"
            ? `Jumla ya watumiaji: ${totalUsers}`
            : `Total users: ${totalUsers}`}
        </div>
      </div>

      <div className="mb-4 rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              language === "sw"
                ? "Tafuta jina, barua pepe, simu au kanisa"
                : "Search name, email, phone, or church"
            }
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          >
            <option value="">
              {language === "sw" ? "Majukumu yote" : "All roles"}
            </option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role] || role}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleApplyFilters}
            className="rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            {language === "sw" ? "Tumia vichujio" : "Apply filters"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow-md dark:bg-gray-800 dark:text-gray-400">
          {language === "sw" ? "Inapakia watumiaji..." : "Loading users..."}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow-md dark:bg-gray-800 dark:text-gray-400">
          {language === "sw"
            ? "Hakuna watumiaji waliopatikana."
            : "No users found."}
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow-md dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="min-w-full md:min-w-[1080px] divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    {language === "sw" ? "Mtumiaji" : "User"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    {language === "sw" ? "Wasiliana" : "Contact"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    {language === "sw" ? "Jukumu" : "Role"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    {language === "sw" ? "Kanisa" : "Church"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    {language === "sw" ? "Hali" : "Status"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    {language === "sw" ? "Tarehe ya Usajili" : "Created"}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    {language === "sw" ? "Hatua" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {users.map((userItem) => (
                  <tr key={userItem.id}>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="font-medium">
                        {userItem.full_name || userItem.username}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        @{userItem.username}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                      <div>{userItem.email || "-"}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {userItem.phone || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                      {roleLabels[userItem.role] || userItem.role}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                      {userItem.church_name || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-col gap-2">
                        <span
                          className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ${userItem.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {userItem.is_active
                            ? language === "sw"
                              ? "Hai"
                              : "Active"
                            : language === "sw"
                              ? "Imezimwa"
                              : "Inactive"}
                        </span>
                        <span
                          className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ${userItem.is_approved ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}
                        >
                          {userItem.is_approved
                            ? language === "sw"
                              ? "Imeidhinishwa"
                              : "Approved"
                            : language === "sw"
                              ? "Inasubiri"
                              : "Pending"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {userItem.created_at
                        ? new Date(userItem.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(userItem)}
                        disabled={submittingId === userItem.id}
                        className="rounded bg-red-600 px-3 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                      >
                        {submittingId === userItem.id
                          ? language === "sw"
                            ? "Inafuta..."
                            : "Deleting..."
                          : language === "sw"
                            ? "Futa"
                            : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {language === "sw" ? "Nyuma" : "Previous"}
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {language === "sw"
                ? `Ukurasa ${currentPage} ya ${totalPages}`
                : `Page ${currentPage} of ${totalPages}`}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => page + 1)}
              disabled={currentPage >= totalPages}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {language === "sw" ? "Mbele" : "Next"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;

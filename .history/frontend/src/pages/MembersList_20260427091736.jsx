import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { FaDownload } from "react-icons/fa";
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
  const [editingMember, setEditingMember] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
  });
  const [transferMember, setTransferMember] = useState(null);
  const [transferForm, setTransferForm] = useState({
    to_church: "",
    transfer_reason: "",
    notes: "",
    recommendation_letter: null,
  });
  const [submittingAction, setSubmittingAction] = useState(false);
  const [localChurches, setLocalChurches] = useState([]);

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  useEffect(() => {
    fetchMembers();
  }, [search, alphabet, currentPage, user?.role]);

  useEffect(() => {
    fetchLocalChurches();
  }, []);

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
      toast.error(
        language === "sw"
          ? "Imeshindikana kupata orodha ya wanachama"
          : "Failed to load members",
      );
      setMembers([]);
      setTotalMembers(0);
    } finally {
      setLoading(false);
    }
  };

  const normalizeList = (response) => {
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.results)) return response.data.results;
    return [];
  };

  const fetchLocalChurches = async () => {
    try {
      const response = await api.get("/locals/");
      setLocalChurches(normalizeList(response));
    } catch (error) {
      console.error("Error fetching local churches:", error);
      setLocalChurches([]);
    }
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    setEditForm({
      full_name: member.full_name || "",
      email: member.email || "",
      phone: member.phone || "",
    });
  };

  const submitEdit = async () => {
    if (!editingMember) return;
    setSubmittingAction(true);
    try {
      await api.patch(`/members/${editingMember.id}/`, editForm);
      toast.success(
        language === "sw" ? "Mwanachama amesasishwa" : "Member updated",
      );
      setEditingMember(null);
      fetchMembers();
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ||
          (language === "sw"
            ? "Imeshindikana kusasisha"
            : "Failed to update member"),
      );
    } finally {
      setSubmittingAction(false);
    }
  };

  const deleteMember = async (member) => {
    const confirmed = window.confirm(
      language === "sw"
        ? `Una uhakika unataka kufuta ${member.full_name || member.username}?`
        : `Are you sure you want to delete ${member.full_name || member.username}?`,
    );
    if (!confirmed) return;

    setSubmittingAction(true);
    try {
      await api.delete(`/members/${member.id}/`);
      toast.success(
        language === "sw" ? "Mwanachama amefutwa" : "Member deleted",
      );
      fetchMembers();
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ||
          (language === "sw"
            ? "Imeshindikana kufuta"
            : "Failed to delete member"),
      );
    } finally {
      setSubmittingAction(false);
    }
  };

  const openTransferModal = (member) => {
    setTransferMember(member);
    setTransferForm({
      to_church: "",
      transfer_reason: "",
      notes: "",
      recommendation_letter: null,
    });
  };

  const submitTransfer = async () => {
    if (!transferMember) return;
    if (!transferForm.to_church || !transferForm.transfer_reason.trim()) {
      toast.error(
        language === "sw"
          ? "Kanisa lengwa na sababu ya uhamisho vinahitajika"
          : "Destination church and transfer reason are required",
      );
      return;
    }

    setSubmittingAction(true);
    try {
      const formData = new FormData();
      formData.append("to_church", transferForm.to_church);
      formData.append("transfer_reason", transferForm.transfer_reason.trim());
      formData.append("notes", transferForm.notes.trim());
      if (transferForm.recommendation_letter) {
        formData.append(
          "recommendation_letter",
          transferForm.recommendation_letter,
        );
      }

      await api.post(`/members/${transferMember.id}/transfer/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        language === "sw"
          ? "Ombi la uhamisho limetumwa"
          : "Transfer request submitted",
      );
      setTransferMember(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          (language === "sw"
            ? "Imeshindikana kutuma ombi la uhamisho"
            : "Failed to submit transfer request"),
      );
    } finally {
      setSubmittingAction(false);
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

      <div className="mb-4 flex justify-end">
        <Link to="/register" className="btn-primary">
          {language === "sw" ? "Ongeza Mwanachama" : "Add Member"}
        </Link>
      </div>

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
          <div className="overflow-x-auto">
            <table className="min-w-full md:min-w-[920px] divide-y divide-gray-200 dark:divide-gray-700">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {language === "sw" ? "Vitendo" : "Actions"}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => openEditModal(member)}
                        >
                          {language === "sw" ? "Hariri" : "Edit"}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => deleteMember(member)}
                          disabled={submittingAction}
                        >
                          {language === "sw" ? "Futa" : "Delete"}
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => openTransferModal(member)}
                        >
                          {language === "sw" ? "Hamisha" : "Transfer"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            {language === "sw"
              ? `Ukurasa ${currentPage}`
              : `Page ${currentPage}`}
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

      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {language === "sw" ? "Hariri Mwanachama" : "Edit Member"}
            </h2>

            <input
              className="input"
              value={editForm.full_name}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, full_name: e.target.value }))
              }
              placeholder={language === "sw" ? "Jina Kamili" : "Full Name"}
            />
            <input
              className="input"
              value={editForm.email}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="Email"
            />
            <input
              className="input"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder={language === "sw" ? "Namba ya Simu" : "Phone Number"}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditingMember(null)}
              >
                {language === "sw" ? "Ghairi" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={submitEdit}
                disabled={submittingAction}
              >
                {language === "sw" ? "Hifadhi" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {transferMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {language === "sw" ? "Ombi la Uhamisho" : "Transfer Request"}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {transferMember.full_name || transferMember.username}
            </p>

            <select
              className="input"
              value={transferForm.to_church}
              onChange={(e) =>
                setTransferForm((prev) => ({
                  ...prev,
                  to_church: e.target.value,
                }))
              }
            >
              <option value="">
                {language === "sw"
                  ? "Chagua Kanisa Lengwa"
                  : "Select Destination Church"}
              </option>
              {localChurches.map((church) => (
                <option key={church.id} value={church.id}>
                  {church.name}
                </option>
              ))}
            </select>

            <textarea
              className="input"
              rows="3"
              value={transferForm.transfer_reason}
              onChange={(e) =>
                setTransferForm((prev) => ({
                  ...prev,
                  transfer_reason: e.target.value,
                }))
              }
              placeholder={
                language === "sw" ? "Sababu ya uhamisho" : "Transfer reason"
              }
            />

            <textarea
              className="input"
              rows="2"
              value={transferForm.notes}
              onChange={(e) =>
                setTransferForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder={
                language === "sw"
                  ? "Maelezo ya ziada (hiari)"
                  : "Additional notes (optional)"
              }
            />

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                {language === "sw"
                  ? "Barua ya Uhamisho (hiari)"
                  : "Transfer Letter (optional)"}
              </label>
              <input
                type="file"
                className="input"
                onChange={(e) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    recommendation_letter: e.target.files?.[0] || null,
                  }))
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setTransferMember(null)}
              >
                {language === "sw" ? "Ghairi" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={submitTransfer}
                disabled={submittingAction}
              >
                {language === "sw" ? "Tuma Ombi" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersList;

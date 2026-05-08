import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FaCheck,
  FaChurch,
  FaExchangeAlt,
  FaTimes,
  FaTimesCircle,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const Transfers = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isLeader = user?.role === "local_leader";

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [filterStatus, setFilterStatus] = useState("pending");

  const t = (sw, en) => (language === "sw" ? sw : en);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus && filterStatus !== "all") {
        params.status = filterStatus;
      }
      const response = await api.get("/transfers/", { params });
      const data = response.data?.results || response.data || [];
      setTransfers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setTransfers([]);
      toast.error(t("Imeshindikana kupakua", "Failed to load transfers"));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTransfer) return;

    setProcessingId(selectedTransfer.id);
    try {
      await api.post(`/transfers/${selectedTransfer.id}/approve/`, {
        message: approvalMessage,
      });
      toast.success(
        t("Uhamisho umekubaliwa!", "Transfer approved successfully!"),
      );
      setShowApprovalForm(false);
      setApprovalMessage("");
      setSelectedTransfer(null);
      fetchTransfers();
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.detail ||
          t("Imeshindikana kubali uhamisho", "Failed to approve transfer"),
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedTransfer || !rejectionReason.trim()) {
      toast.error(
        t("Sababu ya kukataa inahitajika", "Rejection reason is required"),
      );
      return;
    }

    setProcessingId(selectedTransfer.id);
    try {
      await api.post(`/transfers/${selectedTransfer.id}/reject/`, {
        reason: rejectionReason,
      });
      toast.success(t("Uhamisho umekataliwa", "Transfer has been rejected"));
      setShowRejectionForm(false);
      setRejectionReason("");
      setSelectedTransfer(null);
      fetchTransfers();
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.detail ||
          t("Imeshindikana kukataa uhamisho", "Failed to reject transfer"),
      );
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "approved":
        return t("Imekubaliwa", "Approved");
      case "pending":
        return t("Inasubiri", "Pending");
      case "rejected":
        return t("Imekataliwa", "Rejected");
      default:
        return status;
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <FaExchangeAlt className="text-primary-600 text-2xl" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("Uhamisho wa Wanachama", "Member Transfers")}
          </h1>
          {isLeader && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t(
                "Dhibiti kwa uhamisho wa wanachama kutoka na kwenda kwa kanisa lako",
                "Manage transfer requests for your church",
              )}
            </p>
          )}
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {["pending", "approved", "rejected", "all"].map((status) => (
          <button
            key={status}
            onClick={() => {
              setFilterStatus(status);
              // Re-fetch with new filter
              const params = {};
              if (status && status !== "all") {
                params.status = status;
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterStatus === status
                ? "bg-primary-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300"
            }`}
          >
            {t(
              {
                pending: "Inasubiri",
                approved: "Imekubaliwa",
                rejected: "Imekataliwa",
                all: "Zote",
              }[status],
              {
                pending: "Pending",
                approved: "Approved",
                rejected: "Rejected",
                all: "All",
              }[status],
            )}
          </button>
        ))}
      </div>

      {/* Approval Modal */}
      {showApprovalForm && selectedTransfer && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-green-300 dark:border-green-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("Kubali Uhamisho", "Approve Transfer")}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowApprovalForm(false);
                setSelectedTransfer(null);
                setApprovalMessage("");
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          </div>
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold">
                {selectedTransfer.member_name}
              </span>{" "}
              {t("inayohamia kutoka", "is transferring from")}{" "}
              <span className="font-semibold">
                {selectedTransfer.from_church_name}
              </span>{" "}
              {t("kwenda", "to")}{" "}
              <span className="font-semibold">
                {selectedTransfer.to_church_name}
              </span>
            </p>
          </div>
          <textarea
            rows="3"
            className="input mb-4"
            value={approvalMessage}
            onChange={(e) => setApprovalMessage(e.target.value)}
            placeholder={t(
              "Andika ujumbe (hiarioni)",
              "Add an optional message",
            )}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleApprove}
              disabled={processingId === selectedTransfer.id}
              className="btn-primary"
            >
              {processingId === selectedTransfer.id
                ? t("Inakubali...", "Approving...")
                : t("Kubali", "Approve")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowApprovalForm(false);
                setSelectedTransfer(null);
                setApprovalMessage("");
              }}
              className="btn-secondary"
            >
              {t("Ghairi", "Cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionForm && selectedTransfer && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-red-300 dark:border-red-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("Kataa Uhamisho", "Reject Transfer")}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowRejectionForm(false);
                setSelectedTransfer(null);
                setRejectionReason("");
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          </div>
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold">
                {selectedTransfer.member_name}
              </span>{" "}
              {t("anayokataa kubamia", "is requesting to transfer")}
            </p>
          </div>
          <textarea
            rows="3"
            className="input mb-4"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder={t("Sababu ya kukataa *", "Reason for rejection *")}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReject}
              disabled={processingId === selectedTransfer.id}
              className="btn-danger"
            >
              {processingId === selectedTransfer.id
                ? t("Inakataa...", "Rejecting...")
                : t("Kataa", "Reject")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRejectionForm(false);
                setSelectedTransfer(null);
                setRejectionReason("");
              }}
              className="btn-secondary"
            >
              {t("Ghairi", "Cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Transfers List */}
      {transfers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
          <FaExchangeAlt className="mx-auto text-gray-300 dark:text-gray-600 text-4xl mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {t("Hakuna uhamisho", "No transfers found")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {transfers.map((transfer) => (
            <div
              key={transfer.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-5 ${
                transfer.status === "approved"
                  ? "border-green-200 dark:border-green-800"
                  : transfer.status === "rejected"
                    ? "border-red-200 dark:border-red-800"
                    : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {transfer.member_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <FaChurch size={14} />
                    <span>{transfer.from_church_name}</span>
                    <FaExchangeAlt size={12} className="text-gray-400" />
                    <span>{transfer.to_church_name}</span>
                  </div>
                  {transfer.transfer_reason && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      {t("Sababu", "Reason")}: {transfer.transfer_reason}
                    </p>
                  )}
                  {transfer.notes && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {t("Maelezo", "Notes")}: {transfer.notes}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {new Date(transfer.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}
                  >
                    {getStatusLabel(transfer.status)}
                  </span>

                  {isLeader && transfer.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransfer(transfer);
                          setShowApprovalForm(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium"
                        title={t("Kubali", "Approve")}
                      >
                        <FaCheck size={12} /> {t("Kubali", "Approve")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransfer(transfer);
                          setShowRejectionForm(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium"
                        title={t("Kataa", "Reject")}
                      >
                        <FaTimesCircle size={12} /> {t("Kataa", "Reject")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Transfers;

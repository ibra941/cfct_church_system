import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FaChartBar,
  FaMobileAlt,
  FaMoneyBillWave,
  FaUniversity,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaReceipt,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const OPERATORS = [
  { value: "vodacom", label: "Vodacom M-Pesa", color: "text-red-600" },
  { value: "tigo", label: "Tigo Pesa", color: "text-blue-600" },
  { value: "airtel", label: "Airtel Money", color: "text-red-500" },
  { value: "halotel", label: "Halopesa", color: "text-green-600" },
];

const OFFERING_TYPES = [
  { value: "tithe", sw: "Zaka", en: "Tithe" },
  { value: "offering", sw: "Sadaka", en: "Offering" },
  { value: "building", sw: "Mchango wa Jengo", en: "Building Fund" },
  { value: "mission", sw: "Mchango wa Misheni", en: "Mission" },
  { value: "thanksgiving", sw: "Shukrani", en: "Thanksgiving" },
  { value: "benevolence", sw: "Msaada", en: "Benevolence" },
];

const T = (lang, sw, en) => (lang === "sw" ? sw : en);
const formatTZS = (n) => `TZS ${Number(n).toLocaleString()}`;
const LEADER_ROLES = ["national_leader", "zone_leader", "regional_leader", "district_leader", "local_leader"];

const Offerings = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isLeader = LEADER_ROLES.includes(user?.role);

  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState({});
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    vodacom_lipa_number: "",
    tigo_lipa_number: "",
    airtel_lipa_number: "",
    halotel_lipa_number: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    bank_branch: "",
    bank_swift_code: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [form, setForm] = useState({
    amount: "",
    offering_type: "tithe",
    member: "",
    notes: "",
    phone: "",
    operator: "vodacom",
    transaction_reference: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // step: form | bank_details | pending_mm | success | failed
  const [step, setStep] = useState("form");
  const [paymentResult, setPaymentResult] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    fetchOfferings();
    fetchMembers();
    fetchPaymentSettings();
  }, []);

  useEffect(() => {
    if (offerings.length && isLeader) buildSummary(offerings);
  }, [offerings, isLeader]);

  useEffect(() => () => clearInterval(pollingRef.current), []);

  const fetchOfferings = async () => {
    try {
      const res = await api.get("/offerings/");
      const data = res.data.results ?? res.data;
      setOfferings(Array.isArray(data) ? data : []);
    } catch {
      setOfferings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get("/members/");
      const data = res.data.results ?? res.data;
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      setMembers([]);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await api.get("/offerings/payments/config/");
      setPaymentSettings(res.data);
      setSettingsForm({
        vodacom_lipa_number: res.data.vodacom_lipa_number || "",
        tigo_lipa_number: res.data.tigo_lipa_number || "",
        airtel_lipa_number: res.data.airtel_lipa_number || "",
        halotel_lipa_number: res.data.halotel_lipa_number || "",
        bank_name: res.data.bank_name || "",
        bank_account_number: res.data.bank_account_number || "",
        bank_account_name: res.data.bank_account_name || "",
        bank_branch: res.data.bank_branch || "",
        bank_swift_code: res.data.bank_swift_code || "",
      });
    } catch {
      setPaymentSettings(null);
    }
  };

  const savePaymentSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const res = await api.patch("/offerings/payments/config/", settingsForm);
      setPaymentSettings(res.data);
      toast.success(T(language, "Namba za malipo zimehifadhiwa.", "Payment details saved."));
    } catch (err) {
      toast.error(extractError(err).substring(0, 150));
    } finally {
      setSettingsSaving(false);
    }
  };

  const buildSummary = (list) => {
    const map = {};
    list.forEach((o) => {
      map[o.offering_type] = (map[o.offering_type] || 0) + parseFloat(o.amount || 0);
    });
    setSummary(map);
  };

  const fetchBankDetails = async () => {
    try {
      setSubmitting(true);
      const res = await api.get("/offerings/payments/bank-details/");
      setBankDetails(res.data);
      setForm((f) => ({ ...f, transaction_reference: res.data.reference }));
      setStep("bank_details");
    } catch {
      toast.error(T(language, "Hitilafu kupata maelezo ya benki.", "Failed to fetch bank details."));
    } finally {
      setSubmitting(false);
    }
  };

  const startPolling = (offeringId) => {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/offerings/payments/status/${offeringId}/`);
        const { payment_status } = res.data;
        if (payment_status === "completed") {
          clearInterval(pollingRef.current);
          setPaymentResult((prev) => ({ ...prev, ...res.data }));
          setStep("success");
          fetchOfferings();
        } else if (payment_status === "failed") {
          clearInterval(pollingRef.current);
          setPaymentResult((prev) => ({ ...prev, ...res.data }));
          setStep("failed");
        }
      } catch {
        // keep polling silently
      }
    }, 5000);
  };

  const resetForm = () => {
    setForm({ amount: "", offering_type: "tithe", member: "", notes: "", phone: "", operator: "vodacom", transaction_reference: "" });
    setPaymentMethod("cash");
    setPaymentResult(null);
    setBankDetails(null);
    setStep("form");
    clearInterval(pollingRef.current);
  };

  const validateBase = () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error(T(language, "Kiasi lazima kiwe zaidi ya 0.", "Amount must be greater than 0."));
      return false;
    }
    return true;
  };

  const extractError = (err) => {
    const data = err?.response?.data;
    if (!data) return T(language, "Hitilafu imetokea.", "An error occurred.");
    if (typeof data === "string") return data;
    const key = Object.keys(data)[0];
    const val = data[key];
    return Array.isArray(val) ? val[0] : String(val);
  };

  const handleCashSubmit = async (e) => {
    e.preventDefault();
    if (!validateBase()) return;
    setSubmitting(true);
    try {
      const res = await api.post("/offerings/", {
        amount: parseFloat(form.amount),
        offering_type: form.offering_type,
        payment_method: "cash",
        member: form.member ? parseInt(form.member) : null,
        notes: form.notes,
      });
      setPaymentResult(res.data);
      setStep("success");
      fetchOfferings();
      toast.success(T(language, "Matoleo yamehifadhiwa!", "Offering recorded!"));
    } catch (err) {
      toast.error(extractError(err).substring(0, 150));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMobileMoneySubmit = async (e) => {
    e.preventDefault();
    if (!validateBase()) return;
    if (!form.phone) {
      toast.error(T(language, "Ingiza nambari ya simu.", "Enter phone number."));
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/offerings/payments/mobile-money/", {
        amount: parseFloat(form.amount),
        offering_type: form.offering_type,
        phone: form.phone,
        operator: form.operator,
        member: form.member ? parseInt(form.member) : null,
        notes: form.notes,
      });
      setPaymentResult(res.data);
      setStep("pending_mm");
      startPolling(res.data.offering_id);
    } catch (err) {
      toast.error(extractError(err).substring(0, 150));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBankTransferConfirm = async () => {
    if (!validateBase()) return;
    setSubmitting(true);
    try {
      const res = await api.post("/offerings/", {
        amount: parseFloat(form.amount),
        offering_type: form.offering_type,
        payment_method: "bank_transfer",
        transaction_reference: form.transaction_reference,
        member: form.member ? parseInt(form.member) : null,
        notes: form.notes,
      });
      setPaymentResult({ ...res.data, ...bankDetails });
      setStep("success");
      fetchOfferings();
      toast.success(T(language, "Matoleo yamerekodiwa. Inasubiri uthibitisho.", "Offering recorded. Awaiting verification."));
    } catch (err) {
      toast.error(extractError(err).substring(0, 150));
    } finally {
      setSubmitting(false);
    }
  };

  const offeringTypeLabel = (type) => {
    const entry = OFFERING_TYPES.find((o) => o.value === type);
    return entry ? (language === "sw" ? entry.sw : entry.en) : type;
  };

  const paymentMethodLabel = (m) => {
    const map = { cash: T(language, "Fedha Taslimu", "Cash"), mobile_money: T(language, "Simu Pesa", "Mobile Money"), bank_transfer: T(language, "Benki", "Bank Transfer") };
    return map[m] || m;
  };

  const selectedProviderNumber = paymentSettings?.mobile_money_numbers?.[form.operator]?.lipa_number || "";

  const statusBadge = (ps) => {
    if (ps === "completed") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><FaCheckCircle />{T(language, "Imekamilika", "Completed")}</span>;
    if (ps === "failed") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"><FaTimesCircle />{T(language, "Imeshindwa", "Failed")}</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"><FaClock />{T(language, "Inasubiri", "Pending")}</span>;
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>;

  const totalOfferings = offerings.reduce((s, o) => s + parseFloat(o.amount || 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {T(language, "Matoleo", "Offerings")}
      </h1>

      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-white text-lg mb-2">{T(language, "Jumla ya Matoleo", "Total Offerings")}</h3>
        <p className="text-white text-4xl font-bold">{formatTZS(totalOfferings)}</p>
      </div>

      {isLeader && Object.keys(summary).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaChartBar className="text-primary-600 text-xl" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{T(language, "Muhtasari wa Matoleo", "Offerings Summary")}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary).map(([type, amount]) => (
              <div key={type} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{offeringTypeLabel(type)}</p>
                <p className="text-2xl font-bold text-primary-600 mt-2">{formatTZS(amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLeader && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{T(language, "Namba za Malipo za Kanisa", "Church Payment Details")}</h2>
              <p className="text-sm text-gray-500">{T(language, "Hariri Lipa Namba za simu pesa na akaunti ya benki kwa kanisa lako.", "Update mobile money Lipa numbers and bank account details for your church.")}</p>
            </div>
            {paymentSettings?.church_name && <span className="text-xs px-3 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">{paymentSettings.church_name}</span>}
          </div>

          <form onSubmit={savePaymentSettings} className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">{T(language, "Simu Pesa", "Mobile Money")}</h3>
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                {OPERATORS.map((operator) => {
                  const fieldName = `${operator.value}_lipa_number`;
                  return (
                    <div key={operator.value}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{operator.label}</label>
                      <input
                        className="input"
                        value={settingsForm[fieldName] || ""}
                        onChange={(e) => setSettingsForm((prev) => ({ ...prev, [fieldName]: e.target.value }))}
                        placeholder={T(language, "Weka Lipa Namba", "Enter Lipa Number")}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">{T(language, "Benki", "Bank")}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="input" value={settingsForm.bank_name} onChange={(e) => setSettingsForm((prev) => ({ ...prev, bank_name: e.target.value }))} placeholder={T(language, "Jina la Benki", "Bank Name")} />
                <input className="input" value={settingsForm.bank_account_number} onChange={(e) => setSettingsForm((prev) => ({ ...prev, bank_account_number: e.target.value }))} placeholder={T(language, "Nambari ya Akaunti", "Account Number")} />
                <input className="input" value={settingsForm.bank_account_name} onChange={(e) => setSettingsForm((prev) => ({ ...prev, bank_account_name: e.target.value }))} placeholder={T(language, "Jina la Akaunti", "Account Name")} />
                <input className="input" value={settingsForm.bank_branch} onChange={(e) => setSettingsForm((prev) => ({ ...prev, bank_branch: e.target.value }))} placeholder={T(language, "Tawi la Benki", "Bank Branch")} />
                <input className="input md:col-span-2" value={settingsForm.bank_swift_code} onChange={(e) => setSettingsForm((prev) => ({ ...prev, bank_swift_code: e.target.value }))} placeholder={T(language, "SWIFT Code (Hiari)", "SWIFT Code (Optional)")} />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={settingsSaving}>
              {settingsSaving ? T(language, "Inahifadhi...", "Saving...") : T(language, "Hifadhi Namba za Malipo", "Save Payment Details")}
            </button>
          </form>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Payment Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {T(language, "Lipa / Rekodi Matoleo", "Pay / Record Offering")}
          </h2>

          {step === "success" && (
            <div className="text-center py-6">
              <FaCheckCircle className="text-green-500 text-5xl mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{T(language, "Imekamilika!", "Done!")}</h3>
              <p className="text-sm text-gray-500 mb-4">{paymentMethod === "bank_transfer" ? T(language, "Inasubiri uthibitisho wa benki.", "Awaiting bank transfer verification.") : T(language, "Asante kwa mchango wako!", "Thank you for your contribution!")}</p>
              {paymentResult && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-left text-sm space-y-1 mb-5">
                  {paymentResult.receipt_no && <div className="flex justify-between"><span className="text-gray-500">{T(language, "Nambari ya Risiti", "Receipt No")}</span><span className="font-mono font-bold">{paymentResult.receipt_no}</span></div>}
                  {paymentResult.transaction_reference && <div className="flex justify-between"><span className="text-gray-500">{T(language, "Kumbukumbu", "Reference")}</span><span className="font-mono text-xs">{paymentResult.transaction_reference}</span></div>}
                  {paymentResult.payment_status && <div className="flex justify-between items-center"><span className="text-gray-500">{T(language, "Hali", "Status")}</span>{statusBadge(paymentResult.payment_status)}</div>}
                </div>
              )}
              <button onClick={resetForm} className="btn-primary w-full">{T(language, "Rekodi Mengine", "Record Another")}</button>
            </div>
          )}

          {step === "failed" && (
            <div className="text-center py-6">
              <FaTimesCircle className="text-red-500 text-5xl mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{T(language, "Malipo Yameshindwa", "Payment Failed")}</h3>
              <p className="text-sm text-gray-500 mb-4">{T(language, "Jaribu tena au chagua njia nyingine.", "Please try again or choose a different method.")}</p>
              {paymentResult?.transaction_reference && <p className="text-xs text-gray-400 mb-4 font-mono">Ref: {paymentResult.transaction_reference}</p>}
              <button onClick={resetForm} className="btn-primary w-full">{T(language, "Jaribu Tena", "Try Again")}</button>
            </div>
          )}

          {step === "pending_mm" && (
            <div className="text-center py-6">
              <div className="animate-pulse"><FaMobileAlt className="text-primary-600 text-5xl mx-auto mb-4" /></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{T(language, "Subiri Kibali chako...", "Waiting for Approval...")}</h3>
              <p className="text-sm text-gray-500 mb-2">{T(language, "Ombi limetumwa kwa ", "Request sent to ")} <strong>{paymentResult?.operator_label}</strong>.</p>
              <p className="text-sm text-gray-400 mb-5">{T(language, "Ingiza PIN yako ya simu pesa kukamilisha malipo.", "Enter your mobile money PIN on your phone to complete payment.")}</p>
              {paymentResult?.provider_number && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4 text-sm">
                  <p className="text-gray-500 mb-1">{T(language, "Lipa Namba ya Kanisa", "Church Lipa Number")}</p>
                  <p className="font-mono font-bold text-gray-900 dark:text-white">{paymentResult.provider_number}</p>
                </div>
              )}
              {paymentResult?.transaction_reference && <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-5"><p className="text-xs text-gray-500 mb-1">{T(language, "Kumbukumbu", "Reference")}</p><p className="font-mono font-bold">{paymentResult.transaction_reference}</p></div>}
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
                {T(language, "Inaangalia hali...", "Checking payment status...")}
              </div>
              <button onClick={resetForm} className="text-sm text-gray-400 underline">{T(language, "Ghairi", "Cancel")}</button>
            </div>
          )}

          {step === "bank_details" && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <FaUniversity className="text-primary-600" />
                {T(language, "Maelezo ya Benki", "Bank Account Details")}
              </h3>
              <p className="text-sm text-gray-500 mb-4">{T(language, "Hamisha ", "Transfer ")} <strong>{formatTZS(form.amount)}</strong> {T(language, " kwa akaunti hii ukitumia nambari ya kumbukumbu.", " to this account using the reference number.")}</p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4 space-y-2 text-sm">
                {[["Benki / Bank", bankDetails?.bank_name, false], [T(language, "Jina la Akaunti", "Account Name"), bankDetails?.account_name, false], [T(language, "Nambari ya Akaunti", "Account Number"), bankDetails?.account_number, true], ...(bankDetails?.branch ? [[T(language, "Tawi", "Branch"), bankDetails.branch, false]] : []), ...(bankDetails?.swift_code ? [["SWIFT", bankDetails.swift_code, true]] : [])].map(([label, value, mono]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-gray-500">{label}</span>
                    <span className={`font-semibold text-gray-900 dark:text-white ${mono ? "font-mono" : ""} ${!value ? "text-gray-400 italic text-xs" : ""}`}>{value || "Not configured"}</span>
                  </div>
                ))}
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-4 mb-5">
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 mb-1 uppercase tracking-wide">⚠ {T(language, "Tumia Nambari Hii ya Kumbukumbu", "Use This Reference Number")}</p>
                <p className="font-mono text-xl font-bold text-gray-900 dark:text-white tracking-widest">{bankDetails?.reference}</p>
                <p className="text-xs text-gray-500 mt-1">{T(language, "Lazima utumie nambari hii ili matoleo yako yahakikishwe.", "You must use this reference so your offering can be verified.")}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleBankTransferConfirm} disabled={submitting} className="flex-1 btn-primary disabled:opacity-60">
                  {submitting ? <span className="flex items-center justify-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />{T(language, "Inawasilisha...", "Submitting...")}</span> : T(language, "Nimefanya Uhamisho ✓", "I Have Completed the Transfer ✓")}
                </button>
                <button onClick={resetForm} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">{T(language, "Rudi", "Back")}</button>
              </div>
            </div>
          )}

          {step === "form" && (
            <>
              {/* Payment method selector */}
              <div className="flex gap-2 mb-5">
                {[{ value: "cash", icon: <FaMoneyBillWave />, sw: "Taslimu", en: "Cash" }, { value: "mobile_money", icon: <FaMobileAlt />, sw: "Simu Pesa", en: "Mobile Money" }, { value: "bank_transfer", icon: <FaUniversity />, sw: "Benki", en: "Bank Transfer" }].map((m) => (
                  <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)} className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-lg border-2 text-xs font-semibold transition-colors ${paymentMethod === m.value ? "border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400"}`}>
                    <span className="text-lg">{m.icon}</span>
                    {T(language, m.sw, m.en)}
                  </button>
                ))}
              </div>

              <form onSubmit={paymentMethod === "cash" ? handleCashSubmit : paymentMethod === "mobile_money" ? handleMobileMoneySubmit : (e) => { e.preventDefault(); if (validateBase()) fetchBankDetails(); }} className="space-y-4">
                {isLeader && (
                  <select className="input" value={form.member} onChange={(e) => setForm({ ...form, member: e.target.value })}>
                    <option value="">{T(language, "Chagua Mwanachama (Hiyari)", "Select Member (Optional)")}</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.username}</option>)}
                  </select>
                )}
                <input type="number" min="1" step="any" placeholder={T(language, "Kiasi (TZS)", "Amount (TZS)")} className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                <select className="input" value={form.offering_type} onChange={(e) => setForm({ ...form, offering_type: e.target.value })}>
                  {OFFERING_TYPES.map((o) => <option key={o.value} value={o.value}>{language === "sw" ? o.sw : o.en}</option>)}
                </select>

                {paymentMethod === "mobile_money" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{T(language, "Mtoa Huduma wa Simu Pesa", "Mobile Money Provider")}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {OPERATORS.map((op) => (
                          <button key={op.value} type="button" onClick={() => setForm({ ...form, operator: op.value })} className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors text-left ${form.operator === op.value ? `border-primary-600 bg-primary-50 dark:bg-primary-900/20 ${op.color}` : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"}`}>
                            {op.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
                      <div className="flex justify-between gap-3 items-center">
                        <span>{T(language, "Lipa Namba ya Kanisa", "Church Lipa Number")}</span>
                        <span className="font-mono font-bold text-gray-900 dark:text-white">{selectedProviderNumber || T(language, "Haijawekwa bado", "Not configured yet")}</span>
                      </div>
                    </div>
                    <input type="tel" placeholder={T(language, "Nambari ya Simu (07XXXXXXXX)", "Phone Number (07XXXXXXXX)")} className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                  </>
                )}

                {paymentMethod === "bank_transfer" && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
                    <FaUniversity className="inline mr-1" />
                    {T(language, "Bonyeza kitufe kupata nambari ya kumbukumbu na maelezo ya akaunti ya benki.", "Click the button below to get a unique reference and bank account details.")}
                    {paymentSettings?.bank_account_number && (
                      <div className="mt-2 text-xs text-gray-700 dark:text-gray-200">
                        <strong>{paymentSettings.bank_name}</strong> • {paymentSettings.bank_account_number}
                      </div>
                    )}
                  </div>
                )}

                <textarea placeholder={T(language, "Maelezo (Hiyari)", "Notes (Optional)")} className="input resize-none" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

                <button type="submit" className="btn-primary w-full disabled:opacity-60" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />{T(language, "Tafadhali Subiri...", "Please Wait...")}</span>
                  ) : paymentMethod === "cash" ? T(language, "Rekodi Matoleo", "Record Offering")
                    : paymentMethod === "mobile_money" ? T(language, "Lipa Sasa (STK Push)", "Pay Now (STK Push)")
                    : T(language, "Pata Maelezo ya Benki", "Get Bank Details")}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Recent Offerings List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{T(language, "Matoleo ya Hivi Karibuni", "Recent Offerings")}</h2>
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {offerings.length === 0 && <p className="text-gray-500 text-center py-8">{T(language, "Hakuna matoleo bado.", "No offerings yet.")}</p>}
            {offerings.slice(0, 20).map((o) => (
              <div key={o.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{formatTZS(o.amount)}</span>
                    <span className="ml-2 text-xs text-gray-500">{offeringTypeLabel(o.offering_type)}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500">{paymentMethodLabel(o.payment_method)}</span>
                  {o.payment_status && statusBadge(o.payment_status)}
                </div>
                {isLeader && o.member_name && <div className="text-xs text-gray-500 mt-1">{o.member_name}</div>}
                {o.receipt_no && <div className="text-xs text-gray-400 mt-0.5"><FaReceipt className="inline mr-1" />{o.receipt_no}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Offerings;

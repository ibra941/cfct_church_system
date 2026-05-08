import api from "./api";

// ---- Monthly Summary ----

export const getMonthlySummary = async (params = {}) => {
  const response = await api.get("/finance/monthly-summary/", { params });
  return response.data;
};

// ---- Offering Summary ----

export const getOfferingSummary = async (params = {}) => {
  const response = await api.get("/offerings/summary/", { params });
  return response.data;
};

// ---- Reports ----

export const getNationalFinancialReport = async (params = {}) => {
  const response = await api.get("/reports/national-financial/", { params });
  return response.data;
};

export const getRegionalFinancialReport = async (params = {}) => {
  const response = await api.get("/reports/regional-financial/", { params });
  return response.data;
};

export const getZoneFinancialSummary = async (params = {}) => {
  const response = await api.get("/reports/zone-financial/", { params });
  return response.data;
};

export const getZoneBudgetAllocation = async (params = {}) => {
  const response = await api.get("/reports/zone-budget-allocation/", { params });
  return response.data;
};

export const getNationalBudget = async (params = {}) => {
  const response = await api.get("/reports/national-budget/", { params });
  return response.data;
};

// ---- Payment Settings ----

export const getPaymentConfig = async () => {
  const response = await api.get("/offerings/payments/config/");
  return response.data;
};

export const getBankTransferDetails = async () => {
  const response = await api.get("/offerings/payments/bank-details/");
  return response.data;
};

/**
 * Initiate a mobile money payment.
 * @param {{ amount, phone, offering_type, member_id }} data
 */
export const initiateMobileMoneyPayment = async (data) => {
  const response = await api.post("/offerings/payments/mobile-money/", data);
  return response.data;
};

export const getPaymentStatus = async (offeringId) => {
  const response = await api.get(`/offerings/payments/status/${offeringId}/`);
  return response.data;
};

// ---- Export ----

/**
 * Download a report as CSV/Excel/PDF.
 * @param {string} reportType - e.g. 'offerings', 'members', 'attendance'
 * @param {object} params     - query params (format, start_date, end_date, etc.)
 */
export const exportReport = async (reportType, params = {}) => {
  const response = await api.get(`/reports/export/${reportType}/`, {
    params,
    responseType: "blob",
  });
  return response;
};

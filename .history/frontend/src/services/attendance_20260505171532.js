import api from "./api";

// ---- Attendance Records (bulk counts) ----

export const getAttendanceRecords = async (params = {}) => {
  const response = await api.get("/attendance/", { params });
  return response.data;
};

export const createAttendanceRecord = async (data) => {
  const response = await api.post("/attendance/", data);
  return response.data;
};

export const updateAttendanceRecord = async (id, data) => {
  const response = await api.patch(`/attendance/${id}/`, data);
  return response.data;
};

export const deleteAttendanceRecord = async (id) => {
  await api.delete(`/attendance/${id}/`);
};

// ---- QR Attendance Sessions ----

/**
 * Leader creates a QR session for a service.
 * @param {{ church_id, service_type, service_title, service_date }} data
 */
export const createQRSession = async (data) => {
  const response = await api.post("/attendance/qr-session/", data);
  return response.data;
};

/**
 * Member checks in using a QR token scanned from the QR code.
 * @param {string} qrToken
 */
export const checkInWithQR = async (qrToken) => {
  const response = await api.post("/attendance/check-in/", {
    qr_token: qrToken,
  });
  return response.data;
};

// ---- My personal check-in history ----

export const getMyAttendanceHistory = async (params = {}) => {
  const response = await api.get("/attendance/my-history/", { params });
  return response.data;
};

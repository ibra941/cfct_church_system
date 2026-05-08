import api from "./api";

// ---- CRUD ----

export const getDepartments = async (params = {}) => {
  const response = await api.get("/departments/", { params });
  return response.data;
};

export const getDepartment = async (id) => {
  const response = await api.get(`/departments/${id}/`);
  return response.data;
};

export const createDepartment = async (data) => {
  const response = await api.post("/departments/", data);
  return response.data;
};

export const updateDepartment = async (id, data) => {
  const response = await api.patch(`/departments/${id}/`, data);
  return response.data;
};

export const deleteDepartment = async (id) => {
  await api.delete(`/departments/${id}/`);
};

// ---- Member applications ----

/**
 * Current member applies to join a department.
 * @param {number} departmentId
 */
export const applyToDepartment = async (departmentId) => {
  const response = await api.post(`/departments/${departmentId}/apply/`);
  return response.data;
};

/** Get the current member's own join requests. */
export const getMyDepartmentRequests = async () => {
  const response = await api.get("/departments/my-requests/");
  return response.data;
};

// ---- Leader review ----

/** Get all pending join requests (leaders only). */
export const getPendingJoinRequests = async () => {
  const response = await api.get("/departments/join-requests/pending/");
  return response.data;
};

/**
 * Approve a join request (leaders only).
 * @param {number|string} requestId
 * @param {{ review_notes?: string }} data
 */
export const approveJoinRequest = async (requestId, data = {}) => {
  const response = await api.post(
    `/departments/join-requests/${requestId}/approve/`,
    data
  );
  return response.data;
};

/**
 * Reject a join request (leaders only).
 * @param {number|string} requestId
 * @param {{ review_notes: string }} data
 */
export const rejectJoinRequest = async (requestId, data) => {
  const response = await api.post(
    `/departments/join-requests/${requestId}/reject/`,
    data
  );
  return response.data;
};

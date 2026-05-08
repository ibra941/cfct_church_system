import api from "./api";

export const login = async (username, password) => {
  const response = await api.post("/token/", { username, password });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me/");
  return response.data;
};

/**
 * Register a new member (self-registration).
 * @param {{ username, email, password, full_name, phone, church_id }} userData
 */
export const register = async (userData) => {
  const response = await api.post("/auth/register/", userData);
  return response.data;
};

export const changePassword = async (oldPassword, newPassword) => {
  const response = await api.post("/auth/change-password/", {
    old_password: oldPassword,
    new_password: newPassword,
  });
  return response.data;
};

export const requestPasswordReset = async (email) => {
  const response = await api.post("/auth/password-reset/request/", { email });
  return response.data;
};

export const confirmPasswordReset = async (uid, token, newPassword) => {
  const response = await api.post("/auth/password-reset/confirm/", {
    uid,
    token,
    new_password: newPassword,
  });
  return response.data;
};

/**
 * Verify email address using the token from the verification link.
 * @param {string} token - UUID token from the verification URL
 */
export const verifyEmail = async (token) => {
  const response = await api.get("/auth/verify-email/", { params: { token } });
  return response.data;
};

/**
 * Resend the email verification link.
 * @param {string} email
 */
export const resendVerificationEmail = async (email) => {
  const response = await api.post("/auth/resend-verification/", { email });
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await api.patch("/auth/me/update/", data);
  return response.data;
};


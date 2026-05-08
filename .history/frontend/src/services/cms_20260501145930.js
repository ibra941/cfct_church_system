import api from "./api";

const unwrapListData = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.results)) {
    return payload.results;
  }

  return [];
};

// Homepage Content
export const getHomepageContent = async () => {
  const response = await api.get("/cms/public/homepage/");
  return unwrapListData(response.data);
};

export const updateHomepageSection = async (id, data) => {
  const response = await api.put(`/cms/homepage/${id}/`, data);
  return response.data;
};

// Social Media Links
export const getSocialLinks = async () => {
  const response = await api.get("/cms/public/social-links/");
  return unwrapListData(response.data);
};

// Contact Info
export const getContactInfo = async () => {
  const response = await api.get("/cms/public/contact-info/");
  return unwrapListData(response.data);
};

// Footer Links
export const getFooterLinks = async () => {
  const response = await api.get("/cms/public/footer-links/");
  return unwrapListData(response.data);
};

// Site Settings
export const getSiteSettings = async () => {
  const response = await api.get("/cms/public/settings/");
  return unwrapListData(response.data);
};

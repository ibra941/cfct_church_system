import api from "./api";

// Homepage Content
export const getHomepageContent = async () => {
  const response = await api.get("/cms/public/homepage/");
  return response.data;
};

export const updateHomepageSection = async (id, data) => {
  const response = await api.put(`/cms/homepage/${id}/`, data);
  return response.data;
};

// Social Media Links
export const getSocialLinks = async () => {
  const response = await api.get("/cms/public/social-links/");
  return response.data;
};

// Contact Info
export const getContactInfo = async () => {
  const response = await api.get("/cms/public/contact-info/");
  return response.data;
};

// Footer Links
export const getFooterLinks = async () => {
  const response = await api.get("/cms/public/footer-links/");
  return response.data;
};

// Site Settings
export const getSiteSettings = async () => {
  const response = await api.get("/cms/public/settings/");
  return response.data;
};

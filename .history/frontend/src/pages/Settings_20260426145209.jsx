import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";

const Settings = () => {
  const { language, toggleLanguage } = useLanguage();
  const { user, refreshUser } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [savingContact, setSavingContact] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [contactForm, setContactForm] = useState({
    full_name: "",
    email: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    setContactForm({
      full_name: user?.full_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
    setProfilePreview(user?.profile_picture_url || "");
  }, [user?.full_name, user?.email, user?.phone, user?.profile_picture_url]);

  const updateContact = async (e) => {
    e.preventDefault();
    setSavingContact(true);
    try {
      const payload = {
        full_name: contactForm.full_name?.trim() || "",
        phone: contactForm.phone?.trim() || "",
        email: contactForm.email?.trim() ? contactForm.email.trim() : null,
      };

      await api.patch("/auth/me/update/", payload);
      await refreshUser();
      toast.success(
        language === "sw"
          ? "Taarifa za mawasiliano zimehifadhiwa"
          : "Contact information updated",
      );
    } catch (error) {
      const responseData = error?.response?.data;
      const detail = responseData?.detail;
      const messageFromDetail = Array.isArray(detail) ? detail[0] : detail;
      const fieldMessage =
        responseData && typeof responseData === "object"
          ? Object.values(responseData)
              .flat()
              .find((value) => typeof value === "string")
          : null;

      toast.error(
        messageFromDetail ||
          fieldMessage ||
          (language === "sw"
            ? "Imeshindikana kuhifadhi taarifa"
            : "Failed to update contact information"),
      );
    } finally {
      setSavingContact(false);
    }
  };

  const updateProfilePicture = async (e) => {
    e.preventDefault();

    if (!profilePicture) {
      toast.error(
        language === "sw"
          ? "Chagua picha ya wasifu kwanza"
          : "Select a profile picture first",
      );
      return;
    }

    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append("profile_picture", profilePicture);
      await api.patch("/auth/me/update/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await refreshUser();
      setProfilePicture(null);
      toast.success(
        language === "sw"
          ? "Picha ya wasifu imehifadhiwa"
          : "Profile picture updated",
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ||
          (language === "sw"
            ? "Imeshindikana kuhifadhi picha ya wasifu"
            : "Failed to update profile picture"),
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.current_password || !passwordForm.new_password) {
      toast.error(
        language === "sw"
          ? "Jaza nenosiri la sasa na jipya"
          : "Enter current and new password",
      );
      return;
    }

    setChangingPassword(true);
    try {
      await api.post("/auth/change-password/", passwordForm);
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      toast.success(
        language === "sw"
          ? "Nenosiri limebadilishwa"
          : "Password changed successfully",
      );
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message = Array.isArray(detail) ? detail[0] : detail;
      toast.error(
        message ||
          (language === "sw"
            ? "Imeshindikana kubadilisha nenosiri"
            : "Failed to change password"),
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {language === "sw" ? "Mipangilio" : "Settings"}
      </h1>
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Mwonekano" : "Appearance"}
          </h2>
          <div className="flex justify-between items-center">
            <span className="text-gray-700 dark:text-gray-300">
              {language === "sw" ? "Hali ya Giza" : "Dark Mode"}
            </span>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${darkMode ? "bg-primary-600" : "bg-gray-300"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${darkMode ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Lugha" : "Language"}
          </h2>
          <div className="flex justify-between items-center">
            <span className="text-gray-700 dark:text-gray-300">
              {language === "sw" ? "Badilisha Lugha" : "Change Language"}
            </span>
            <button onClick={toggleLanguage} className="btn-secondary">
              {language === "sw" ? "Switch to English" : "Badilisha Kiswahili"}
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Wasifu" : "Profile"}
          </h2>
          <form onSubmit={updateProfilePicture} className="space-y-3">
            <div className="flex items-center space-x-4">
              <img
                src={profilePreview || "/icons/icon-72x72.png"}
                alt="Profile"
                className="h-16 w-16 rounded-full object-cover border border-gray-200 dark:border-gray-700"
              />
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  className="input"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setProfilePicture(file);
                    if (file) {
                      setProfilePreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>
            </div>
            <button className="btn-secondary w-full" type="submit" disabled={savingProfile}>
              {savingProfile
                ? language === "sw"
                  ? "Inahifadhi..."
                  : "Saving..."
                : language === "sw"
                  ? "Hifadhi Picha ya Wasifu"
                  : "Save Profile Picture"}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Akaunti" : "Account"}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {language === "sw" ? "Jina la Mtumiaji" : "Username"}
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">
                {user?.username}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Mawasiliano" : "Contact Information"}
          </h2>
          <form onSubmit={updateContact} className="space-y-3">
            <input
              className="input"
              placeholder={language === "sw" ? "Jina Kamili" : "Full Name"}
              value={contactForm.full_name}
              onChange={(e) =>
                setContactForm((prev) => ({
                  ...prev,
                  full_name: e.target.value,
                }))
              }
            />
            <input
              className="input"
              placeholder="Email"
              value={contactForm.email}
              onChange={(e) =>
                setContactForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
            <input
              className="input"
              placeholder={language === "sw" ? "Namba ya Simu" : "Phone Number"}
              value={contactForm.phone}
              onChange={(e) =>
                setContactForm((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
            <button
              className="btn-secondary w-full"
              type="submit"
              disabled={savingContact}
            >
              {savingContact
                ? language === "sw"
                  ? "Inahifadhi..."
                  : "Saving..."
                : language === "sw"
                  ? "Hifadhi Mawasiliano"
                  : "Save Contact Info"}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Badili Nenosiri" : "Change Password"}
          </h2>
          <form onSubmit={changePassword} className="space-y-3">
            <input
              type="password"
              className="input"
              placeholder={
                language === "sw" ? "Nenosiri la Sasa" : "Current Password"
              }
              value={passwordForm.current_password}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  current_password: e.target.value,
                }))
              }
            />
            <input
              type="password"
              className="input"
              placeholder={
                language === "sw" ? "Nenosiri Jipya" : "New Password"
              }
              value={passwordForm.new_password}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  new_password: e.target.value,
                }))
              }
            />
            <input
              type="password"
              className="input"
              placeholder={
                language === "sw"
                  ? "Thibitisha Nenosiri Jipya"
                  : "Confirm New Password"
              }
              value={passwordForm.confirm_password}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  confirm_password: e.target.value,
                }))
              }
            />
            <button
              className="btn-primary w-full"
              type="submit"
              disabled={changingPassword}
            >
              {changingPassword
                ? language === "sw"
                  ? "Inabadilisha..."
                  : "Changing..."
                : language === "sw"
                  ? "Badilisha Nenosiri"
                  : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;

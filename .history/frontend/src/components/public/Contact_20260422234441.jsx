import { useState } from "react";
import toast from "react-hot-toast";
import { FaClock, FaEnvelope, FaMapMarkerAlt, FaPhone } from "react-icons/fa";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../services/api";

const Contact = () => {
  const { language } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      message: formData.message.trim(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      toast.error(
        language === "sw"
          ? "Tafadhali jaza sehemu zote"
          : "Please fill in all fields",
      );
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/contact/", payload);
      toast.success(
        language === "sw"
          ? "Ujumbe wako umetumwa!"
          : "Your message has been sent!",
      );
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      const backendError =
        error?.response?.data?.detail ||
        error?.response?.data?.message?.[0] ||
        error?.response?.data?.email?.[0] ||
        error?.response?.data?.name?.[0] ||
        (language === "sw" ? "Hitilafu imetokea" : "An error occurred");
      toast.error(backendError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-16 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Wasiliana Nasi" : "Contact Us"}
          </h2>
          <div className="w-24 h-1 bg-primary-600 mx-auto"></div>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <FaPhone className="text-primary-600 text-2xl" />
              <div>
                <h3 className="font-semibold">Phone</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  +255 767 911 316
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <FaEnvelope className="text-primary-600 text-2xl" />
              <div>
                <h3 className="font-semibold">Email</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  cfctanzaniahq2019@gmail.com
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <FaMapMarkerAlt className="text-primary-600 text-2xl" />
              <div>
                <h3 className="font-semibold">Address</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  HEAD QUOTER. GEITA MJINI -NSHINDE
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <FaClock className="text-primary-600 text-2xl" />
              <div>
                <h3 className="font-semibold">Service Times</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Sunday: 9:00 AM & 11:00 AM
                  <br />
                  Wednesday: 6:00 PM
                </p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder={language === "sw" ? "Jina Lako" : "Your Name"}
              className="input"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <input
              type="email"
              placeholder="Email"
              className="input"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
            <textarea
              rows="4"
              placeholder={language === "sw" ? "Ujumbe Wako" : "Your Message"}
              className="input"
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting
                ? language === "sw"
                  ? "Inatuma..."
                  : "Sending..."
                : language === "sw"
                  ? "Tuma Ujumbe"
                  : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;

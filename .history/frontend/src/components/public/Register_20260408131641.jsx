import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../services/api";
import Navbar from "../common/Navbar";

const Register = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [churches, setChurches] = useState([]);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    personal_info: { full_name: "", phone: "", email: "", neighborhood: "" },
    guardian_info: { guardian_name: "", guardian_phone: "", relationship: "" },
    spiritual_info: {
      date_of_birth: "",
      christian_birth_date: "",
      spiritual_gifts: [],
      ministry_interests: [],
    },
    preferred_church_id: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchChurches();
  }, []);

  const fetchChurches = async () => {
    try {
      const response = await api.get("/churches/");
      // ✅ FIX: Handle paginated response
      const churchesData = response.data.results || response.data;
      setChurches(Array.isArray(churchesData) ? churchesData : []);
    } catch (error) {
      console.error(error);
      setChurches([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/members/register/", formData);
      toast.success(
        language === "sw"
          ? "Usajili wako umepokelewa! Utajulishwa baada ya kuidhinishwa."
          : "Your registration has been received! You will be notified after approval.",
      );
      navigate("/");
    } catch (error) {
      toast.error(
        language === "sw"
          ? "Hitilafu imetokea. Tafadhali jaribu tena."
          : "An error occurred. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {language === "sw" ? "Jiunge Nasi" : "Join Us"}
          </h1>

          {/* Steps */}
          <div className="flex mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 text-center pb-2 border-b-2 ${step >= s ? "border-primary-600 text-primary-600" : "border-gray-300 text-gray-500"}`}
              >
                {language === "sw" ? `Hatua ${s}` : `Step ${s}`}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {language === "sw"
                    ? "Taarifa Binafsi"
                    : "Personal Information"}
                </h3>
                <input
                  type="text"
                  placeholder={language === "sw" ? "Jina Kamili" : "Full Name"}
                  className="input"
                  value={formData.personal_info.full_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personal_info: {
                        ...formData.personal_info,
                        full_name: e.target.value,
                      },
                    })
                  }
                  required
                />
                <input
                  type="tel"
                  placeholder={
                    language === "sw" ? "Namba ya Simu" : "Phone Number"
                  }
                  className="input"
                  value={formData.personal_info.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personal_info: {
                        ...formData.personal_info,
                        phone: e.target.value,
                      },
                    })
                  }
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="input"
                  value={formData.personal_info.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personal_info: {
                        ...formData.personal_info,
                        email: e.target.value,
                      },
                    })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder={language === "sw" ? "Kitongoji" : "Neighborhood"}
                  className="input"
                  value={formData.personal_info.neighborhood}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personal_info: {
                        ...formData.personal_info,
                        neighborhood: e.target.value,
                      },
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-primary w-full"
                >
                  {language === "sw" ? "Inayofuata" : "Next"}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {language === "sw"
                    ? "Taarifa za Mlezi"
                    : "Guardian Information"}
                </h3>
                <input
                  type="text"
                  placeholder={
                    language === "sw" ? "Jina la Mlezi" : "Guardian Name"
                  }
                  className="input"
                  value={formData.guardian_info.guardian_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      guardian_info: {
                        ...formData.guardian_info,
                        guardian_name: e.target.value,
                      },
                    })
                  }
                />
                <input
                  type="tel"
                  placeholder={
                    language === "sw"
                      ? "Namba ya Simu ya Mlezi"
                      : "Guardian Phone"
                  }
                  className="input"
                  value={formData.guardian_info.guardian_phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      guardian_info: {
                        ...formData.guardian_info,
                        guardian_phone: e.target.value,
                      },
                    })
                  }
                />
                <input
                  type="text"
                  placeholder={
                    language === "sw" ? "Uhusiano na Mlezi" : "Relationship"
                  }
                  className="input"
                  value={formData.guardian_info.relationship}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      guardian_info: {
                        ...formData.guardian_info,
                        relationship: e.target.value,
                      },
                    })
                  }
                />
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary flex-1"
                  >
                    {language === "sw" ? "Nyuma" : "Back"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="btn-primary flex-1"
                  >
                    {language === "sw" ? "Inayofuata" : "Next"}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {language === "sw"
                    ? "Taarifa za Kiroho"
                    : "Spiritual Information"}
                </h3>
                <input
                  type="date"
                  placeholder={
                    language === "sw" ? "Tarehe ya Kuzaliwa" : "Date of Birth"
                  }
                  className="input"
                  value={formData.spiritual_info.date_of_birth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      spiritual_info: {
                        ...formData.spiritual_info,
                        date_of_birth: e.target.value,
                      },
                    })
                  }
                />
                <input
                  type="date"
                  placeholder={
                    language === "sw"
                      ? "Tarehe ya Kuzaliwa Kiroho"
                      : "Christian Birth Date"
                  }
                  className="input"
                  value={formData.spiritual_info.christian_birth_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      spiritual_info: {
                        ...formData.spiritual_info,
                        christian_birth_date: e.target.value,
                      },
                    })
                  }
                />
                <select
                  className="input"
                  value={formData.preferred_church_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferred_church_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">
                    {language === "sw" ? "Chagua Kanisa" : "Select Church"}
                  </option>
                  {churches.map((church) => (
                    <option key={church.id} value={church.id}>
                      {church.name}
                    </option>
                  ))}
                </select>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-secondary flex-1"
                  >
                    {language === "sw" ? "Nyuma" : "Back"}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary flex-1"
                  >
                    {submitting
                      ? language === "sw"
                        ? "Inasajili..."
                        : "Registering..."
                      : language === "sw"
                        ? "Wasilisha"
                        : "Submit"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;

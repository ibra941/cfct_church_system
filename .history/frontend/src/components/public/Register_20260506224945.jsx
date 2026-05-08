import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../services/api";
import Navbar from "../common/Navbar";

const Register = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [localChurches, setLocalChurches] = useState([]);
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
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
    preferred_zone_id: "",
    preferred_region_id: "",
    preferred_district_id: "",
    preferred_church_id: "",
  });
  const [loadingChurchData, setLoadingChurchData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Spiritual Gifts options
  const spiritualGiftsOptions = [
    { value: "teaching", label: language === "sw" ? "Ualimu" : "Teaching" },
    { value: "preaching", label: language === "sw" ? "Kuhubiri" : "Preaching" },
    {
      value: "leadership",
      label: language === "sw" ? "Uongozi" : "Leadership",
    },
    { value: "music", label: language === "sw" ? "Muziki" : "Music/Worship" },
    {
      value: "evangelism",
      label: language === "sw" ? "Uinjilisti" : "Evangelism",
    },
    {
      value: "pastoring",
      label: language === "sw" ? "Uchungaji" : "Pastoring",
    },
    {
      value: "administration",
      label: language === "sw" ? "Utawala" : "Administration",
    },
    { value: "mercy", label: language === "sw" ? "Rehema" : "Mercy/Helping" },
    { value: "faith", label: language === "sw" ? "Imani" : "Faith" },
    { value: "healing", label: language === "sw" ? "Uponyaji" : "Healing" },
  ];

  // Ministry Interests options
  const ministryInterestsOptions = [
    { value: "worship", label: language === "sw" ? "Ibada" : "Worship Team" },
    {
      value: "ushering",
      label: language === "sw" ? "Ukaribishaji" : "Ushering",
    },
    {
      value: "children",
      label: language === "sw" ? "Watoto" : "Children Ministry",
    },
    { value: "youth", label: language === "sw" ? "Vijana" : "Youth Ministry" },
    {
      value: "prayer",
      label: language === "sw" ? "Maombi" : "Prayer Ministry",
    },
    {
      value: "evangelism",
      label: language === "sw" ? "Uinjilisti" : "Evangelism Team",
    },
    {
      value: "technical",
      label: language === "sw" ? "Teknolojia" : "Technical/Media",
    },
    {
      value: "counseling",
      label: language === "sw" ? "Ushauri" : "Counseling",
    },
    {
      value: "discipleship",
      label: language === "sw" ? "Uanafunzi" : "Discipleship",
    },
    {
      value: "social",
      label: language === "sw" ? "Huduma za Jamii" : "Social Services",
    },
  ];

  useEffect(() => {
    fetchChurchHierarchyData();
  }, []);

  const normalizeList = (response) => {
    const data = response?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  const fetchChurchHierarchyData = async () => {
    setLoadingChurchData(true);
    try {
      const zonesResponse = await api.get("/zones/");
      setZones(normalizeList(zonesResponse));
      setRegions([]);
      setDistricts([]);
      setLocalChurches([]);
    } catch (error) {
      console.error(error);
      setZones([]);
      setRegions([]);
      setDistricts([]);
      setLocalChurches([]);
    } finally {
      setLoadingChurchData(false);
    }
  };

  const handleZoneChange = async (value) => {
    setSelectedZone(value);
    setSelectedRegion("");
    setSelectedDistrict("");
    setRegions([]);
    setDistricts([]);
    setLocalChurches([]);

    setFormData((prev) => ({
      ...prev,
      preferred_zone_id: value,
      preferred_region_id: "",
      preferred_district_id: "",
      preferred_church_id: "",
    }));

    if (!value) return;

    setLoadingChurchData(true);
    try {
      const response = await api.get(`/regions/?parent_id=${value}`);
      setRegions(normalizeList(response));
    } catch (error) {
      console.error(error);
      setRegions([]);
    } finally {
      setLoadingChurchData(false);
    }
  };

  const handleRegionChange = async (value) => {
    setSelectedRegion(value);
    setSelectedDistrict("");
    setDistricts([]);
    setLocalChurches([]);

    setFormData((prev) => ({
      ...prev,
      preferred_region_id: value,
      preferred_district_id: "",
      preferred_church_id: "",
    }));

    if (!value) return;

    setLoadingChurchData(true);
    try {
      const response = await api.get(`/districts/?parent_id=${value}`);
      setDistricts(normalizeList(response));
    } catch (error) {
      console.error(error);
      setDistricts([]);
    } finally {
      setLoadingChurchData(false);
    }
  };

  const handleDistrictChange = async (value) => {
    setSelectedDistrict(value);
    setLocalChurches([]);

    setFormData((prev) => ({
      ...prev,
      preferred_district_id: value,
      preferred_church_id: "",
    }));

    if (!value) return;

    setLoadingChurchData(true);
    try {
      const response = await api.get(`/locals/?parent_id=${value}`);
      setLocalChurches(normalizeList(response));
    } catch (error) {
      console.error(error);
      setLocalChurches([]);
    } finally {
      setLoadingChurchData(false);
    }
  };

  const handleSpiritualGiftToggle = (gift) => {
    const currentGifts = formData.spiritual_info.spiritual_gifts;
    if (currentGifts.includes(gift)) {
      setFormData({
        ...formData,
        spiritual_info: {
          ...formData.spiritual_info,
          spiritual_gifts: currentGifts.filter((g) => g !== gift),
        },
      });
    } else {
      setFormData({
        ...formData,
        spiritual_info: {
          ...formData.spiritual_info,
          spiritual_gifts: [...currentGifts, gift],
        },
      });
    }
  };

  const handleMinistryInterestToggle = (interest) => {
    const currentInterests = formData.spiritual_info.ministry_interests;
    if (currentInterests.includes(interest)) {
      setFormData({
        ...formData,
        spiritual_info: {
          ...formData.spiritual_info,
          ministry_interests: currentInterests.filter((i) => i !== interest),
        },
      });
    } else {
      setFormData({
        ...formData,
        spiritual_info: {
          ...formData.spiritual_info,
          ministry_interests: [...currentInterests, interest],
        },
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/members/public/register/", formData);
      toast.success(
        language === "sw"
          ? "Usajili wako umepokelewa! Utajulishwa baada ya kuidhinishwa."
          : "Your registration has been received! You will be notified after approval.",
      );
      navigate("/");
    } catch (error) {
      console.error("Registration error:", error);
      const backendError =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message;
      toast.error(
        backendError ||
          (language === "sw"
            ? "Hitilafu imetokea. Tafadhali jaribu tena."
            : "An error occurred. Please try again."),
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
            {/* Step 1: Personal Information */}
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

            {/* Step 2: Guardian Information */}
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

            {/* Step 3: Spiritual Information */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {language === "sw"
                    ? "Taarifa za Kiroho"
                    : "Spiritual Information"}
                </h3>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Tarehe ya Kuzaliwa" : "Date of Birth"}
                  </label>
                  <input
                    type="date"
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
                </div>

                {/* Christian Birth Date (Baptism/Decision) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw"
                      ? "Tarehe ya Kuzaliwa Kiroho (Ubaptismu/Uamuzi)"
                      : "Christian Birth Date (Baptism/Decision)"}
                  </label>
                  <input
                    type="date"
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
                </div>

                {/* Spiritual Gifts - Multi-select checkboxes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === "sw"
                      ? "Vipawa vya Kiroho"
                      : "Spiritual Gifts"}
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                    {spiritualGiftsOptions.map((gift) => (
                      <label
                        key={gift.value}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          checked={formData.spiritual_info.spiritual_gifts.includes(
                            gift.value,
                          )}
                          onChange={() => handleSpiritualGiftToggle(gift.value)}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {gift.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Ministry Interests - Multi-select checkboxes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === "sw"
                      ? "Maslahi ya Huduma"
                      : "Ministry Interests"}
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                    {ministryInterestsOptions.map((interest) => (
                      <label
                        key={interest.value}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          checked={formData.spiritual_info.ministry_interests.includes(
                            interest.value,
                          )}
                          onChange={() =>
                            handleMinistryInterestToggle(interest.value)
                          }
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {interest.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preferred Church Based on Hierarchy */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Eneo" : "Zone"}
                  </label>
                  <select
                    className="input"
                    value={selectedZone}
                    onChange={(e) => handleZoneChange(e.target.value)}
                    required
                  >
                    <option value="">
                      {language === "sw" ? "Chagua Eneo" : "Select Zone"}
                    </option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedZone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Mkoa" : "Region"}
                    </label>
                    <select
                      className="input"
                      value={selectedRegion}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      required
                    >
                      <option value="">
                        {language === "sw" ? "Chagua Mkoa" : "Select Region"}
                      </option>
                      {regions.map((region) => (
                        <option key={region.id} value={region.id}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                    {selectedZone && regions.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {language === "sw"
                          ? "Hakuna mikoa kwa eneo hili"
                          : "No regions found for this zone."}
                      </p>
                    )}
                  </div>
                )}

                {selectedRegion && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Wilaya" : "District"}
                    </label>
                    <select
                      className="input"
                      value={selectedDistrict}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      required
                    >
                      <option value="">
                        {language === "sw"
                          ? "Chagua Wilaya"
                          : "Select District"}
                      </option>
                      {districts.map((district) => (
                        <option key={district.id} value={district.id}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                    {selectedRegion && districts.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {language === "sw"
                          ? "Hakuna wilaya kwa mkoa huu"
                          : "No districts found for this region."}
                      </p>
                    )}
                  </div>
                )}

                {selectedDistrict && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Kanisa" : "Church"}
                    </label>
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
                      {localChurches.map((church) => (
                        <option key={church.id} value={church.id}>
                          {church.name}
                        </option>
                      ))}
                    </select>
                    {selectedDistrict && localChurches.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {language === "sw"
                          ? "Hakuna makanisa kwa wilaya hii"
                          : "No churches found for this district."}
                      </p>
                    )}
                  </div>
                )}

                {loadingChurchData && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === "sw"
                      ? "Inapakia chaguzi za kanisa..."
                      : "Loading church selections..."}
                  </p>
                )}

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

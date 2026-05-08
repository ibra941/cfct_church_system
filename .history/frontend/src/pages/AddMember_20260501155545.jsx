import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const AddMember = () => {
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

  const spiritualGiftsOptions = [
    { value: "teaching", label: language === "sw" ? "Ualimu" : "Teaching" },
    { value: "preaching", label: language === "sw" ? "Kuhubiri" : "Preaching" },
    { value: "leadership", label: language === "sw" ? "Uongozi" : "Leadership" },
    { value: "music", label: language === "sw" ? "Muziki" : "Music/Worship" },
    { value: "evangelism", label: language === "sw" ? "Uinjilisti" : "Evangelism" },
    { value: "pastoring", label: language === "sw" ? "Uchungaji" : "Pastoring" },
    { value: "administration", label: language === "sw" ? "Utawala" : "Administration" },
    { value: "mercy", label: language === "sw" ? "Rehema" : "Mercy/Helping" },
    { value: "faith", label: language === "sw" ? "Imani" : "Faith" },
    { value: "healing", label: language === "sw" ? "Uponyaji" : "Healing" },
  ];

  const ministryInterestsOptions = [
    { value: "worship", label: language === "sw" ? "Ibada" : "Worship Team" },
    { value: "ushering", label: language === "sw" ? "Ukaribishaji" : "Ushering" },
    { value: "children", label: language === "sw" ? "Watoto" : "Children Ministry" },
    { value: "youth", label: language === "sw" ? "Vijana" : "Youth Ministry" },
    { value: "prayer", label: language === "sw" ? "Maombi" : "Prayer Ministry" },
    { value: "evangelism", label: language === "sw" ? "Uinjilisti" : "Evangelism Team" },
    { value: "technical", label: language === "sw" ? "Teknolojia" : "Technical/Media" },
    { value: "counseling", label: language === "sw" ? "Ushauri" : "Counseling" },
    { value: "discipleship", label: language === "sw" ? "Uanafunzi" : "Discipleship" },
    { value: "social", label: language === "sw" ? "Huduma za Jamii" : "Social Services" },
  ];

  useEffect(() => {
    fetchZones();
  }, []);

  const normalizeList = (response) => {
    const data = response?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  const fetchZones = async () => {
    setLoadingChurchData(true);
    try {
      const res = await api.get("/zones/");
      setZones(normalizeList(res));
    } catch {
      setZones([]);
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
      const res = await api.get(`/regions/?parent_id=${value}`);
      setRegions(normalizeList(res));
    } catch {
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
      const res = await api.get(`/districts/?parent_id=${value}`);
      setDistricts(normalizeList(res));
    } catch {
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
      const res = await api.get(`/locals/?parent_id=${value}`);
      setLocalChurches(normalizeList(res));
    } catch {
      setLocalChurches([]);
    } finally {
      setLoadingChurchData(false);
    }
  };

  const handleSpiritualGiftToggle = (gift) => {
    const current = formData.spiritual_info.spiritual_gifts;
    setFormData({
      ...formData,
      spiritual_info: {
        ...formData.spiritual_info,
        spiritual_gifts: current.includes(gift)
          ? current.filter((g) => g !== gift)
          : [...current, gift],
      },
    });
  };

  const handleMinistryInterestToggle = (interest) => {
    const current = formData.spiritual_info.ministry_interests;
    setFormData({
      ...formData,
      spiritual_info: {
        ...formData.spiritual_info,
        ministry_interests: current.includes(interest)
          ? current.filter((i) => i !== interest)
          : [...current, interest],
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.preferred_church_id) {
      toast.error(
        language === "sw" ? "Tafadhali chagua kanisa" : "Please select a church"
      );
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/members/leader/register/", formData);
      toast.success(
        language === "sw"
          ? "Mwanachama amesajiliwa kwa mafanikio!"
          : "Member registered successfully!"
      );
      navigate("/members");
    } catch (error) {
      const backendError =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message;
      toast.error(
        backendError ||
          (language === "sw"
            ? "Hitilafu imetokea. Tafadhali jaribu tena."
            : "An error occurred. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {language === "sw" ? "Ongeza Mwanachama" : "Add Member"}
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {/* Step indicators */}
        <div className="flex mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 text-center pb-2 border-b-2 font-medium text-sm ${
                step >= s
                  ? "border-primary-600 text-primary-600"
                  : "border-gray-300 text-gray-500"
              }`}
            >
              {language === "sw" ? `Hatua ${s}` : `Step ${s}`}
              {s === 1 && (
                <span className="block text-xs mt-0.5">
                  {language === "sw" ? "Taarifa Binafsi" : "Personal Info"}
                </span>
              )}
              {s === 2 && (
                <span className="block text-xs mt-0.5">
                  {language === "sw" ? "Taarifa za Mlezi" : "Guardian Info"}
                </span>
              )}
              {s === 3 && (
                <span className="block text-xs mt-0.5">
                  {language === "sw" ? "Kiroho & Kanisa" : "Spiritual & Church"}
                </span>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1 – Personal Information */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Taarifa Binafsi" : "Personal Information"}
              </h3>
              <input
                type="text"
                placeholder={language === "sw" ? "Jina Kamili *" : "Full Name *"}
                className="input"
                value={formData.personal_info.full_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personal_info: { ...formData.personal_info, full_name: e.target.value },
                  })
                }
                required
              />
              <input
                type="tel"
                placeholder={language === "sw" ? "Namba ya Simu *" : "Phone Number *"}
                className="input"
                value={formData.personal_info.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personal_info: { ...formData.personal_info, phone: e.target.value },
                  })
                }
                required
              />
              <input
                type="email"
                placeholder={`Email ${language === "sw" ? "(si lazima)" : "(optional)"}`}
                className="input"
                value={formData.personal_info.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personal_info: { ...formData.personal_info, email: e.target.value },
                  })
                }
              />
              <input
                type="text"
                placeholder={language === "sw" ? "Kitongoji" : "Neighborhood"}
                className="input"
                value={formData.personal_info.neighborhood}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personal_info: { ...formData.personal_info, neighborhood: e.target.value },
                  })
                }
              />
              <button
                type="button"
                onClick={() => {
                  if (!formData.personal_info.full_name || !formData.personal_info.phone) {
                    toast.error(
                      language === "sw"
                        ? "Jina kamili na namba ya simu vinahitajika"
                        : "Full name and phone number are required"
                    );
                    return;
                  }
                  setStep(2);
                }}
                className="btn-primary w-full"
              >
                {language === "sw" ? "Inayofuata" : "Next"}
              </button>
            </div>
          )}

          {/* Step 2 – Guardian Information */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Taarifa za Mlezi" : "Guardian Information"}
              </h3>
              <input
                type="text"
                placeholder={language === "sw" ? "Jina la Mlezi" : "Guardian Name"}
                className="input"
                value={formData.guardian_info.guardian_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    guardian_info: { ...formData.guardian_info, guardian_name: e.target.value },
                  })
                }
              />
              <input
                type="tel"
                placeholder={language === "sw" ? "Namba ya Simu ya Mlezi" : "Guardian Phone"}
                className="input"
                value={formData.guardian_info.guardian_phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    guardian_info: { ...formData.guardian_info, guardian_phone: e.target.value },
                  })
                }
              />
              <input
                type="text"
                placeholder={language === "sw" ? "Uhusiano na Mlezi" : "Relationship"}
                className="input"
                value={formData.guardian_info.relationship}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    guardian_info: { ...formData.guardian_info, relationship: e.target.value },
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

          {/* Step 3 – Spiritual Info + Church Hierarchy */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Taarifa za Kiroho & Kanisa" : "Spiritual Info & Church"}
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
                      spiritual_info: { ...formData.spiritual_info, date_of_birth: e.target.value },
                    })
                  }
                />
              </div>

              {/* Christian Birth Date */}
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

              {/* Spiritual Gifts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === "sw" ? "Vipawa vya Kiroho" : "Spiritual Gifts"}
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                  {spiritualGiftsOptions.map((gift) => (
                    <label key={gift.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.spiritual_info.spiritual_gifts.includes(gift.value)}
                        onChange={() => handleSpiritualGiftToggle(gift.value)}
                        className="rounded text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{gift.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ministry Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === "sw" ? "Maslahi ya Huduma" : "Ministry Interests"}
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                  {ministryInterestsOptions.map((interest) => (
                    <label key={interest.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.spiritual_info.ministry_interests.includes(interest.value)}
                        onChange={() => handleMinistryInterestToggle(interest.value)}
                        className="rounded text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{interest.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Church Hierarchy: Zone → Region → District → Church ── */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {language === "sw" ? "Chagua Kanisa la Mwanachama" : "Select Member's Church"}
                </p>

                {/* Zone */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Kanda *" : "Zone *"}
                  </label>
                  <select
                    className="input"
                    value={selectedZone}
                    onChange={(e) => handleZoneChange(e.target.value)}
                    required
                  >
                    <option value="">
                      {language === "sw" ? "Chagua Kanda" : "Select Zone"}
                    </option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Region */}
                {selectedZone && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Mkoa *" : "Region *"}
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
                      {regions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    {regions.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {language === "sw" ? "Hakuna mikoa kwa kanda hii" : "No regions for this zone"}
                      </p>
                    )}
                  </div>
                )}

                {/* District */}
                {selectedRegion && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Wilaya *" : "District *"}
                    </label>
                    <select
                      className="input"
                      value={selectedDistrict}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      required
                    >
                      <option value="">
                        {language === "sw" ? "Chagua Wilaya" : "Select District"}
                      </option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    {districts.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {language === "sw" ? "Hakuna wilaya kwa mkoa huu" : "No districts for this region"}
                      </p>
                    )}
                  </div>
                )}

                {/* Local Church */}
                {selectedDistrict && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Kanisa *" : "Church *"}
                    </label>
                    <select
                      className="input"
                      value={formData.preferred_church_id}
                      onChange={(e) =>
                        setFormData({ ...formData, preferred_church_id: e.target.value })
                      }
                      required
                    >
                      <option value="">
                        {language === "sw" ? "Chagua Kanisa" : "Select Church"}
                      </option>
                      {localChurches.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {localChurches.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {language === "sw" ? "Hakuna makanisa kwa wilaya hii" : "No churches for this district"}
                      </p>
                    )}
                  </div>
                )}

                {loadingChurchData && (
                  <p className="text-xs text-gray-400">
                    {language === "sw" ? "Inapakia..." : "Loading..."}
                  </p>
                )}
              </div>

              <div className="flex space-x-4 pt-2">
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
                      ? "Hifadhi Mwanachama"
                      : "Save Member"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddMember;

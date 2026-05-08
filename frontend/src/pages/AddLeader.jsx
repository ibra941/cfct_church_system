import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

// Plain axios instance with NO auth token — returns all churches regardless of requester scope
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const publicApi = axios.create({ baseURL: API_BASE_URL });

// Roles and which requester roles can create them
const ROLE_PERMISSION_MAP = {
  national_leader: ["national_leader"],
  zone_leader: ["national_leader"],
  regional_leader: ["national_leader", "zone_leader"],
  district_leader: ["national_leader", "zone_leader", "regional_leader"],
  local_leader: [
    "national_leader",
    "zone_leader",
    "regional_leader",
    "district_leader",
  ],
  finance_team: [
    "national_leader",
    "zone_leader",
    "regional_leader",
    "district_leader",
    "local_leader",
  ],
  local_member: [
    "national_leader",
    "zone_leader",
    "regional_leader",
    "district_leader",
    "local_leader",
  ],
};

const ROLE_LABELS_SW = {
  national_leader: "Kiongozi wa Taifa",
  zone_leader: "Kiongozi wa Kanda",
  regional_leader: "Kiongozi wa Mkoa",
  district_leader: "Kiongozi wa Wilaya",
  local_leader: "Mchungaji / Kiongozi wa Kanisa",
  finance_team: "Timu ya Fedha",
  local_member: "Mwanakikundi",
};

const ROLE_LABELS_EN = {
  national_leader: "National Leader",
  zone_leader: "Zone Leader",
  regional_leader: "Regional Leader",
  district_leader: "District Leader",
  local_leader: "Pastor / Church Leader",
  finance_team: "Finance Team",
  local_member: "Local Member",
};

const AddLeader = () => {
  const { language } = useLanguage();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [zones, setZones] = useState([]);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [localChurches, setLocalChurches] = useState([]);
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [loadingChurchData, setLoadingChurchData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    role: "",
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

  // Available roles the current user can assign
  const availableRoles = Object.entries(ROLE_PERMISSION_MAP)
    .filter(([, allowed]) => allowed.includes(currentUser?.role))
    .map(([role]) => role);

  const roleLabels = language === "sw" ? ROLE_LABELS_SW : ROLE_LABELS_EN;

  const normalizeList = (response) => {
    const data = response?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  useEffect(() => {
    // Pre-load zones on mount
    publicApi
      .get("/zones/")
      .then((res) => setZones(normalizeList(res)))
      .catch(() => setZones([]));
  }, []);

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
      const res = await publicApi.get(`/regions/?parent_id=${value}`);
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
      const res = await publicApi.get(`/districts/?parent_id=${value}`);
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
      const res = await publicApi.get(`/locals/?parent_id=${value}`);
      setLocalChurches(normalizeList(res));
    } catch {
      setLocalChurches([]);
    } finally {
      setLoadingChurchData(false);
    }
  };

  const handleSpiritualGiftToggle = (gift) => {
    const current = formData.spiritual_info.spiritual_gifts;
    setFormData((prev) => ({
      ...prev,
      spiritual_info: {
        ...prev.spiritual_info,
        spiritual_gifts: current.includes(gift)
          ? current.filter((g) => g !== gift)
          : [...current, gift],
      },
    }));
  };

  const handleMinistryInterestToggle = (interest) => {
    const current = formData.spiritual_info.ministry_interests;
    setFormData((prev) => ({
      ...prev,
      spiritual_info: {
        ...prev.spiritual_info,
        ministry_interests: current.includes(interest)
          ? current.filter((i) => i !== interest)
          : [...current, interest],
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.role) {
      toast.error(language === "sw" ? "Chagua jukumu" : "Please select a role");
      return;
    }
    if (!formData.preferred_church_id) {
      toast.error(
        language === "sw" ? "Chagua kanisa" : "Please select a church",
      );
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/members/leader/register/", formData);
      toast.success(
        language === "sw"
          ? "Mtumiaji amesajiliwa!"
          : "User registered successfully!",
      );
      navigate("/users");
    } catch (error) {
      const backendError =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message;
      toast.error(
        backendError ||
          (language === "sw"
            ? "Hitilafu imetokea. Jaribu tena."
            : "An error occurred. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Ongeza Mtumiaji" : "Add User / Leader"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {language === "sw"
            ? "Sajili mtumiaji mpya na umchague kanisa lake la mahali."
            : "Register a new user and assign them to a local church."}
        </p>
      </div>

      <div className="max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {/* Step indicators */}
        <div className="flex mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 text-center pb-2 border-b-2 text-sm font-medium ${
                step >= s
                  ? "border-primary-600 text-primary-600"
                  : "border-gray-300 text-gray-400"
              }`}
            >
              {language === "sw" ? `Hatua ${s}` : `Step ${s}`}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* ──────────────── Step 1: Role + Personal Info ──────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {language === "sw"
                  ? "Jukumu na Taarifa Binafsi"
                  : "Role & Personal Information"}
              </h3>

              {/* Role selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === "sw" ? "Jukumu" : "Role"} *
                </label>
                <select
                  className="input"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, role: e.target.value }))
                  }
                  required
                >
                  <option value="">
                    {language === "sw" ? "Chagua Jukumu" : "Select Role"}
                  </option>
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role] || role}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                placeholder={
                  language === "sw" ? "Jina Kamili *" : "Full Name *"
                }
                className="input"
                value={formData.personal_info.full_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    personal_info: {
                      ...prev.personal_info,
                      full_name: e.target.value,
                    },
                  }))
                }
                required
              />
              <input
                type="tel"
                placeholder={
                  language === "sw" ? "Namba ya Simu *" : "Phone Number *"
                }
                className="input"
                value={formData.personal_info.phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    personal_info: {
                      ...prev.personal_info,
                      phone: e.target.value,
                    },
                  }))
                }
                required
              />
              <input
                type="email"
                placeholder="Email"
                className="input"
                value={formData.personal_info.email}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    personal_info: {
                      ...prev.personal_info,
                      email: e.target.value,
                    },
                  }))
                }
              />
              <input
                type="text"
                placeholder={
                  language === "sw" ? "Mtaa / Kitongoji" : "Neighborhood"
                }
                className="input"
                value={formData.personal_info.neighborhood}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    personal_info: {
                      ...prev.personal_info,
                      neighborhood: e.target.value,
                    },
                  }))
                }
              />

              <button
                type="button"
                onClick={() => {
                  if (!formData.role) {
                    toast.error(
                      language === "sw"
                        ? "Chagua jukumu kwanza"
                        : "Please select a role first",
                    );
                    return;
                  }
                  if (
                    !formData.personal_info.full_name ||
                    !formData.personal_info.phone
                  ) {
                    toast.error(
                      language === "sw"
                        ? "Jina na simu vinahitajika"
                        : "Full name and phone are required",
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

          {/* ──────────────── Step 2: Guardian / Additional Info ──────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {language === "sw"
                  ? "Taarifa za Ziada (Hiari)"
                  : "Additional Info (Optional)"}
              </h3>
              <input
                type="text"
                placeholder={
                  language === "sw"
                    ? "Jina la Mlezi / Ndugu"
                    : "Guardian / Next of Kin Name"
                }
                className="input"
                value={formData.guardian_info.guardian_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    guardian_info: {
                      ...prev.guardian_info,
                      guardian_name: e.target.value,
                    },
                  }))
                }
              />
              <input
                type="tel"
                placeholder={
                  language === "sw" ? "Simu ya Mlezi" : "Guardian Phone"
                }
                className="input"
                value={formData.guardian_info.guardian_phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    guardian_info: {
                      ...prev.guardian_info,
                      guardian_phone: e.target.value,
                    },
                  }))
                }
              />
              <input
                type="text"
                placeholder={
                  language === "sw"
                    ? "Uhusiano na Mlezi"
                    : "Relationship to Guardian"
                }
                className="input"
                value={formData.guardian_info.relationship}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    guardian_info: {
                      ...prev.guardian_info,
                      relationship: e.target.value,
                    },
                  }))
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

          {/* ──────────────── Step 3: Church + Spiritual Info ──────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {language === "sw"
                  ? "Kanisa la Mahali na Taarifa za Kiroho"
                  : "Local Church & Spiritual Info"}
              </h3>

              {/* Date of birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === "sw" ? "Tarehe ya Kuzaliwa" : "Date of Birth"}
                </label>
                <input
                  type="date"
                  className="input"
                  value={formData.spiritual_info.date_of_birth}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      spiritual_info: {
                        ...prev.spiritual_info,
                        date_of_birth: e.target.value,
                      },
                    }))
                  }
                />
              </div>

              {/* Christian birth date */}
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
                    setFormData((prev) => ({
                      ...prev,
                      spiritual_info: {
                        ...prev.spiritual_info,
                        christian_birth_date: e.target.value,
                      },
                    }))
                  }
                />
              </div>

              {/* Spiritual gifts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === "sw" ? "Vipawa vya Kiroho" : "Spiritual Gifts"}
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
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

              {/* Ministry interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === "sw"
                    ? "Maslahi ya Huduma"
                    : "Ministry Interests"}
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
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

              {/* ── Church cascade ── */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {language === "sw"
                    ? "Chagua Kanisa la Mahali (Kanda → Mkoa → Wilaya → Kanisa)"
                    : "Select Local Church (Zone → Region → District → Church)"}
                </p>

                {/* Zone */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Kanda" : "Zone"} *
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
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Region */}
                {selectedZone && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Mkoa" : "Region"} *
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
                    {regions.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {language === "sw"
                          ? "Hakuna mikoa katika kanda hii"
                          : "No regions found for this zone"}
                      </p>
                    )}
                  </div>
                )}

                {/* District */}
                {selectedRegion && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Wilaya" : "District"} *
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
                    {districts.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {language === "sw"
                          ? "Hakuna wilaya katika mkoa huu"
                          : "No districts found for this region"}
                      </p>
                    )}
                  </div>
                )}

                {/* Local church */}
                {selectedDistrict && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Kanisa" : "Church"} *
                    </label>
                    <select
                      className="input"
                      value={formData.preferred_church_id}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          preferred_church_id: e.target.value,
                        }))
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
                    {localChurches.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {language === "sw"
                          ? "Hakuna makanisa katika wilaya hii"
                          : "No churches found for this district"}
                      </p>
                    )}
                  </div>
                )}

                {loadingChurchData && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
                      ? "Wasilisha"
                      : "Submit"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddLeader;

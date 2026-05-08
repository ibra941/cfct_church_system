import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaEdit, FaPlus, FaTimes, FaTrash } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const PAGE_TYPE = "pastoral_care";

const defaultSections = [
  {
    title_en: "Spiritual Care",
    title_sw: "Huduma ya Kiroho",
    body_en:
      "Provide prayer, scripture guidance, spiritual direction, and follow-up for personal faith growth.",
    body_sw:
      "Toa maombi, mwongozo wa maandiko, uongozi wa kiroho, na ufuatiliaji kwa ukuaji wa imani ya mtu binafsi.",
  },
  {
    title_en: "Emotional and Psychological Support",
    title_sw: "Msaada wa Kihisia na Kisaikolojia",
    body_en:
      "Offer listening, basic counseling, and referrals where specialized mental health care is needed.",
    body_sw:
      "Toa usikilizaji, ushauri wa msingi, na rufaa pale ambapo huduma maalum za afya ya akili zinahitajika.",
  },
  {
    title_en: "Crisis and Bereavement Care",
    title_sw: "Huduma ya Msiba na Dharura",
    body_en:
      "Respond quickly during emergencies, grief, and loss with structured support and presence.",
    body_sw:
      "Jibu haraka wakati wa dharura, huzuni, na msiba kwa msaada uliopangwa na uwepo wa karibu.",
  },
  {
    title_en: "Visitation Ministry",
    title_sw: "Huduma ya Ziara",
    body_en:
      "Maintain regular home, hospital, and member visit schedules with recorded pastoral notes.",
    body_sw:
      "Dumisha ratiba za ziara za nyumbani, hospitalini, na wanachama kwa kumbukumbu za kichungaji zilizorekodiwa.",
  },
  {
    title_en: "Family and Relationship Support",
    title_sw: "Msaada wa Familia na Mahusiano",
    body_en:
      "Support marriages, parenting, conflict resolution, and restoration through biblical and practical care.",
    body_sw:
      "Saidia ndoa, uzazi, utatuzi wa migogoro, na urejeshaji kupitia huduma ya kibiblia na ya vitendo.",
  },
  {
    title_en: "Discipleship and Mentorship",
    title_sw: "Ufundi na Umentorishaji",
    body_en:
      "Pair members with mentors, track growth plans, and strengthen maturity in doctrine and character.",
    body_sw:
      "Unganisha wanachama na washauri, fuatilia mipango ya ukuaji, na imarisha ukomavu wa mafundisho na tabia.",
  },
  {
    title_en: "Community and Social Support",
    title_sw: "Msaada wa Jamii na Kijamii",
    body_en:
      "Coordinate care networks for practical needs, welfare cases, and community integration.",
    body_sw:
      "Ratibu mitandao ya huduma kwa mahitaji ya vitendo, kesi za ustawi, na muunganiko wa jamii.",
  },
  {
    title_en: "Ethical and Moral Guidance",
    title_sw: "Mwongozo wa Kimaadili na Kiimani",
    body_en:
      "Teach and model godly conduct, accountability, and wise decision-making in daily life.",
    body_sw:
      "Fundisha na kuonyesha mwenendo wa kimungu, uwajibikaji, na maamuzi ya busara katika maisha ya kila siku.",
  },
  {
    title_en: "Confidentiality and Trust",
    title_sw: "Usiri na Uaminifu",
    body_en:
      "Protect sensitive pastoral information and maintain ethical boundaries in all care interactions.",
    body_sw:
      "Linda taarifa nyeti za kichungaji na dumisha mipaka ya kimaadili katika mwingiliano wote wa huduma.",
  },
];

const emptyForm = {
  title_en: "",
  title_sw: "",
  body_en: "",
  body_sw: "",
  order: 0,
};

const PastoralCare = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isLeader = user?.role === "local_leader";

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await api.get("/church-page-entries/", {
        params: { page_type: PAGE_TYPE },
      });
      const data = res.data?.results ?? res.data ?? [];
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      toast.error(
        language === "sw"
          ? "Imeshindikana kupata data"
          : "Failed to load entries",
      );
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingEntry(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setForm({
      title_en: entry.title_en,
      title_sw: entry.title_sw,
      body_en: entry.body_en,
      body_sw: entry.body_sw,
      order: entry.order,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title_en.trim()) {
      toast.error(
        language === "sw"
          ? "Kichwa cha habari kwa Kiingereza kinahitajika"
          : "English title is required",
      );
      return;
    }
    setSaving(true);
    try {
      if (editingEntry) {
        await api.patch(`/church-page-entries/${editingEntry.id}/`, {
          ...form,
          page_type: PAGE_TYPE,
        });
        toast.success(language === "sw" ? "Imesasishwa" : "Updated");
      } else {
        await api.post("/church-page-entries/", {
          ...form,
          page_type: PAGE_TYPE,
        });
        toast.success(language === "sw" ? "Imeongezwa" : "Added");
      }
      setShowForm(false);
      fetchEntries();
    } catch {
      toast.error(language === "sw" ? "Imeshindikana" : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        language === "sw"
          ? "Una uhakika wa kufuta hii?"
          : "Are you sure you want to delete this?",
      )
    )
      return;
    try {
      await api.delete(`/church-page-entries/${id}/`);
      toast.success(language === "sw" ? "Imefutwa" : "Deleted");
      fetchEntries();
    } catch {
      toast.error(
        language === "sw" ? "Imeshindikana kufuta" : "Failed to delete",
      );
    }
  };

  const seedDefaults = async () => {
    setSeeding(true);
    try {
      for (const section of defaultSections) {
        await api.post("/church-page-entries/", {
          ...section,
          page_type: PAGE_TYPE,
          order: 0,
        });
      }
      toast.success(
        language === "sw"
          ? "Maudhui ya awali yameongezwa"
          : "Default content loaded",
      );
      fetchEntries();
    } catch {
      toast.error(
        language === "sw" ? "Imeshindikana" : "Failed to load defaults",
      );
    } finally {
      setSeeding(false);
    }
  };

  const t = (sw, en) => (language === "sw" ? sw : en);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("Huduma ya Kichungaji", "Pastoral Care")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t(
                "Mfumo wa huduma ya kichungaji uliopangwa, unaorekodiwa, na unaolinda utu wa waumini.",
                "Organized and documented pastoral care framework centered on member dignity and trust.",
              )}
            </p>
          </div>
          {isLeader && (
            <div className="flex gap-2 flex-wrap">
              {entries.length === 0 && !loading && (
                <button
                  type="button"
                  onClick={seedDefaults}
                  disabled={seeding}
                  className="btn-secondary text-sm"
                >
                  {seeding
                    ? t("Inapakia...", "Loading...")
                    : t("Pakia Maudhui ya Awali", "Load Defaults")}
                </button>
              )}
              <button
                type="button"
                onClick={openAdd}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <FaPlus />
                {t("Ongeza Kipengele", "Add Entry")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && isLeader && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-primary-200 dark:border-primary-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white">
              {editingEntry
                ? t("Hariri Kipengele", "Edit Entry")
                : t("Kipengele Kipya", "New Entry")}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FaTimes />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("Kichwa (Kiingereza)", "Title (English)")} *
              </label>
              <input
                className="input"
                value={form.title_en}
                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                placeholder="English title"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("Kichwa (Kiswahili)", "Title (Kiswahili)")}
              </label>
              <input
                className="input"
                value={form.title_sw}
                onChange={(e) => setForm({ ...form, title_sw: e.target.value })}
                placeholder="Kichwa kwa Kiswahili"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("Maelezo (Kiingereza)", "Description (English)")}
              </label>
              <textarea
                className="input"
                rows="4"
                value={form.body_en}
                onChange={(e) => setForm({ ...form, body_en: e.target.value })}
                placeholder="Description in English"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("Maelezo (Kiswahili)", "Description (Kiswahili)")}
              </label>
              <textarea
                className="input"
                rows="4"
                value={form.body_sw}
                onChange={(e) => setForm({ ...form, body_sw: e.target.value })}
                placeholder="Maelezo kwa Kiswahili"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("Mpangilio (namba)", "Order (number)")}
              </label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.order}
                onChange={(e) =>
                  setForm({ ...form, order: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? t("Inasave...", "Saving...") : t("Hifadhi", "Save")}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              {t("Ghairi", "Cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t("Inapakia...", "Loading...")}
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {isLeader
              ? t(
                  "Hakuna maudhui bado. Bofya 'Pakia Maudhui ya Awali' au 'Ongeza Kipengele' kuanza.",
                  "No content yet. Click 'Load Defaults' or 'Add Entry' to get started.",
                )
              : t(
                  "Hakuna maudhui yaliyowekwa bado.",
                  "No content has been added yet.",
                )}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 group"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-gray-900 dark:text-white leading-snug">
                  {language === "sw" && entry.title_sw
                    ? entry.title_sw
                    : entry.title_en}
                </h2>
                {isLeader && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(entry)}
                      className="text-primary-500 hover:text-primary-700"
                      title={t("Hariri", "Edit")}
                    >
                      <FaEdit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="text-red-400 hover:text-red-600"
                      title={t("Futa", "Delete")}
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-6">
                {language === "sw" && entry.body_sw
                  ? entry.body_sw
                  : entry.body_en}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PastoralCare;

import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

const PAGE_TYPE = "financial_oversight";

const defaultSections = [
  {
    title_en: "Budgeting",
    title_sw: "Bajeti",
    body_en:
      "Prepare annual budgets, break them down by ministry/unit, and track variance monthly.",
    body_sw:
      "Tengeneza bajeti ya mwaka, gawanya kwa idara, na fuatilia utekelezaji kila mwezi.",
  },
  {
    title_en: "Income Management",
    title_sw: "Usimamizi wa Mapato",
    body_en:
      "Record all income streams including tithes, offerings, special contributions, and other verified inflows.",
    body_sw:
      "Rekodi mapato yote ya matoleo, zaka, michango maalum, na vyanzo vingine kwa uthibitisho.",
  },
  {
    title_en: "Expenditure Control",
    title_sw: "Udhibiti wa Matumizi",
    body_en:
      "Enforce spending approvals, limits, and purchase verification before payment execution.",
    body_sw:
      "Tumia idhini za matumizi, viwango vya matumizi, na uthibitisho wa manunuzi kabla ya malipo.",
  },
  {
    title_en: "Financial Record Keeping",
    title_sw: "Utunzaji wa Kumbukumbu za Fedha",
    body_en:
      "Maintain receipts, vouchers, and transaction records in an audit-ready structure.",
    body_sw:
      "Hifadhi risiti, vocha, na taarifa za miamala kwa mpangilio unaoweza kukaguliwa.",
  },
  {
    title_en: "Financial Reporting",
    title_sw: "Taarifa za Fedha",
    body_en:
      "Publish monthly/quarterly reports on income, expenditure, balances, and budget performance.",
    body_sw:
      "Toa taarifa za mwezi/robo mwaka kuhusu mapato, matumizi, salio, na utekelezaji wa bajeti.",
  },
  {
    title_en: "Internal Control",
    title_sw: "Udhibiti wa Ndani",
    body_en:
      "Separate duties for receiving, approving, paying, and reconciling to reduce control risk.",
    body_sw:
      "Tenganisha majukumu ya kupokea, kuidhinisha, kulipa, na kupatanisha ili kupunguza hatari.",
  },
  {
    title_en: "Auditing",
    title_sw: "Ukaguzi",
    body_en:
      "Run periodic internal audits and independent audits where required.",
    body_sw:
      "Fanya ukaguzi wa ndani wa mara kwa mara na ukaguzi huru inapohitajika.",
  },
  {
    title_en: "Asset Management",
    title_sw: "Usimamizi wa Mali",
    body_en:
      "Track church assets through registers, condition checks, utilization, and maintenance schedules.",
    body_sw:
      "Sajili mali za kanisa, fuatilia hali yake, matumizi, na matengenezo yake.",
  },
  {
    title_en: "Banking and Cash Management",
    title_sw: "Usimamizi wa Benki na Fedha Taslimu",
    body_en:
      "Perform bank reconciliations, cash controls, and timely deposits with documented traceability.",
    body_sw:
      "Fanya upatanisho wa benki, udhibiti wa fedha taslimu, na amana kwa wakati.",
  },
  {
    title_en: "Legal Compliance",
    title_sw: "Uzingatiaji wa Kisheria",
    body_en:
      "Ensure compliance with tax obligations, legal regulations, and statutory financial requirements.",
    body_sw:
      "Hakikisha uzingatiaji wa kodi, sheria za taasisi, na taratibu za kifedha za nchi.",
  },
];

const emptyForm = {
  title_en: "",
  title_sw: "",
  body_en: "",
  body_sw: "",
  order: 0,
};

const FinancialOversight = () => {
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
              {t("Usimamizi wa Fedha", "Financial Oversight")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t(
                "Mwongozo wa usimamizi wa fedha wa kanisa kwa uwazi, uwajibikaji, na uendelevu.",
                "Framework for transparent, accountable, and sustainable church finance management.",
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

export default FinancialOversight;

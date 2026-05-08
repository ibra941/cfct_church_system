import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FaBook,
  FaEdit,
  FaMicrophone,
  FaPlus,
  FaTimes,
  FaTrash,
  FaVideo,
  FaVolumeUp,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const emptyForm = {
  title: "",
  speaker: "",
  sermon_date: "",
  description: "",
  scripture_reference: "",
  audio_url: "",
  video_url: "",
  series_name: "",
};

const SermonArchive = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isLeader = user?.role === "local_leader";

  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSermon, setEditingSermon] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [seriesFilter, setSeriesFilter] = useState("");

  const t = (sw, en) => (language === "sw" ? sw : en);

  const getErrorMessage = (error) => {
    const data = error?.response?.data;

    if (!data) {
      return t(
        "Imeshindikana kuhifadhi mahubiri. Jaribu tena.",
        "Failed to save sermon. Please try again.",
      );
    }

    if (typeof data === "string") {
      return data;
    }

    if (typeof data.detail === "string") {
      return data.detail;
    }

    const firstEntry = Object.entries(data)[0];
    if (!firstEntry) {
      return t("Imeshindikana kuhifadhi mahubiri.", "Failed to save sermon.");
    }

    const [field, value] = firstEntry;
    const message = Array.isArray(value) ? value[0] : value;
    if (typeof message === "string") {
      return `${field}: ${message}`;
    }

    return t("Imeshindikana kuhifadhi mahubiri.", "Failed to save sermon.");
  };

  const isValidOptionalUrl = (value) => {
    if (!value.trim()) return true;
    try {
      const parsed = new URL(value);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    fetchSermons();
  }, []);

  const fetchSermons = async () => {
    setLoading(true);
    try {
      const params = {};
      if (seriesFilter.trim()) params.series = seriesFilter.trim();
      const res = await api.get("/sermons/", { params });
      const data = res.data?.results ?? res.data ?? [];
      setSermons(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t("Imeshindikana kupata mahubiri", "Failed to load sermons"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSermons();
  }, [seriesFilter]);

  const openAdd = () => {
    setEditingSermon(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (sermon) => {
    setEditingSermon(sermon);
    setForm({
      title: sermon.title,
      speaker: sermon.speaker,
      sermon_date: sermon.sermon_date,
      description: sermon.description,
      scripture_reference: sermon.scripture_reference,
      audio_url: sermon.audio_url,
      video_url: sermon.video_url,
      series_name: sermon.series_name,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.sermon_date) {
      toast.error(
        t("Kichwa na tarehe vinahitajika", "Title and date are required"),
      );
      return;
    }
    if (!user?.church) {
      toast.error(
        t(
          "Akaunti yako haijaunganishwa na kanisa, hivyo huwezi kuhifadhi mahubiri.",
          "Your account is not assigned to a church, so the sermon cannot be saved.",
        ),
      );
      return;
    }
    if (!isValidOptionalUrl(form.audio_url)) {
      toast.error(
        t(
          "Kiungo cha sauti si sahihi. Tumia URL kamili kama https://...",
          "Audio URL is invalid. Use a full URL such as https://...",
        ),
      );
      return;
    }
    if (!isValidOptionalUrl(form.video_url)) {
      toast.error(
        t(
          "Kiungo cha video si sahihi. Tumia URL kamili kama https://...",
          "Video URL is invalid. Use a full URL such as https://...",
        ),
      );
      return;
    }
    setSaving(true);
    try {
      if (editingSermon) {
        await api.patch(`/sermons/${editingSermon.id}/`, form);
        toast.success(t("Imesasishwa", "Updated"));
      } else {
        await api.post("/sermons/", form);
        toast.success(t("Mahubiri yameongezwa", "Sermon added"));
      }
      setShowForm(false);
      fetchSermons();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        t(
          "Una uhakika wa kufuta mahubiri haya?",
          "Are you sure you want to delete this sermon?",
        ),
      )
    )
      return;
    try {
      await api.delete(`/sermons/${id}/`);
      toast.success(t("Imefutwa", "Deleted"));
      fetchSermons();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // Unique series for filter chips
  const allSeries = [
    ...new Set(sermons.map((s) => s.series_name).filter(Boolean)),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <FaBook className="text-primary-600 text-2xl" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("Kumbukumbu ya Mahubiri", "Sermon Archive")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t(
                  "Mahubiri yote ya kanisa lako yaliyohifadhiwa hapa.",
                  "All sermons from your church stored here.",
                )}
              </p>
            </div>
          </div>
          {isLeader && (
            <button
              type="button"
              onClick={openAdd}
              className="btn-primary flex items-center gap-2 text-sm shrink-0"
            >
              <FaPlus />
              {t("Ongeza Mahubiri", "Add Sermon")}
            </button>
          )}
        </div>
      </div>

      {/* Series Filter Chips */}
      {allSeries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSeriesFilter("")}
            className={`px-3 py-1 rounded-full text-xs border transition ${
              !seriesFilter
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
            }`}
          >
            {t("Zote", "All")}
          </button>
          {allSeries.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeriesFilter(s === seriesFilter ? "" : s)}
              className={`px-3 py-1 rounded-full text-xs border transition ${
                seriesFilter === s
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && isLeader && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-primary-200 dark:border-primary-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white">
              {editingSermon
                ? t("Hariri Mahubiri", "Edit Sermon")
                : t("Mahubiri Mapya", "New Sermon")}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimes />
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("Kichwa *", "Title *")}
              </label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("Mhubiri", "Speaker")}
              </label>
              <input
                className="input"
                value={form.speaker}
                onChange={(e) => setForm({ ...form, speaker: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("Tarehe *", "Date *")}
              </label>
              <input
                type="date"
                className="input"
                value={form.sermon_date}
                onChange={(e) =>
                  setForm({ ...form, sermon_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("Mstari wa Maandiko", "Scripture Reference")}
              </label>
              <input
                className="input"
                placeholder="e.g. John 3:16"
                value={form.scripture_reference}
                onChange={(e) =>
                  setForm({ ...form, scripture_reference: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("Mfululizo / Mada", "Series Name")}
              </label>
              <input
                className="input"
                value={form.series_name}
                onChange={(e) =>
                  setForm({ ...form, series_name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("Kiungo cha Sauti (URL)", "Audio URL")}
              </label>
              <input
                type="url"
                className="input"
                placeholder="https://..."
                value={form.audio_url}
                onChange={(e) =>
                  setForm({ ...form, audio_url: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("Kiungo cha Video (URL)", "Video URL")}
              </label>
              <input
                type="url"
                className="input"
                placeholder="https://..."
                value={form.video_url}
                onChange={(e) =>
                  setForm({ ...form, video_url: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("Maelezo", "Description")}
              </label>
              <textarea
                className="input"
                rows="3"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
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
              {saving ? t("Inahifadhi...", "Saving...") : t("Hifadhi", "Save")}
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

      {/* Sermons List */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : sermons.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
          <FaMicrophone className="mx-auto text-gray-300 dark:text-gray-600 text-4xl mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {isLeader
              ? t(
                  "Hakuna mahubiri bado. Bofya 'Ongeza Mahubiri' kuanza.",
                  "No sermons yet. Click 'Add Sermon' to get started.",
                )
              : t(
                  "Hakuna mahubiri yaliyohifadhiwa bado.",
                  "No sermons have been archived yet.",
                )}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sermons.map((sermon) => (
            <div
              key={sermon.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="font-semibold text-gray-900 dark:text-white leading-snug">
                      {sermon.title}
                    </h2>
                    {sermon.series_name && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                        {sermon.series_name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {sermon.speaker && (
                      <span className="flex items-center gap-1">
                        <FaMicrophone size={10} /> {sermon.speaker}
                      </span>
                    )}
                    <span>
                      {new Date(sermon.sermon_date).toLocaleDateString()}
                    </span>
                    {sermon.scripture_reference && (
                      <span className="italic">
                        {sermon.scripture_reference}
                      </span>
                    )}
                  </div>
                  {sermon.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {sermon.description}
                    </p>
                  )}
                  <div className="flex gap-3 mt-3">
                    {sermon.audio_url && (
                      <a
                        href={sermon.audio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                      >
                        <FaVolumeUp size={12} /> {t("Sikiliza", "Listen")}
                      </a>
                    )}
                    {sermon.video_url && (
                      <a
                        href={sermon.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                      >
                        <FaVideo size={12} /> {t("Tazama", "Watch")}
                      </a>
                    )}
                  </div>
                </div>
                {isLeader && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(sermon)}
                      className="text-primary-500 hover:text-primary-700"
                      title={t("Hariri", "Edit")}
                    >
                      <FaEdit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sermon.id)}
                      className="text-red-400 hover:text-red-600"
                      title={t("Futa", "Delete")}
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SermonArchive;

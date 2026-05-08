import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const Attendance = () => {
  const { language } = useLanguage();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const parseToken = (value) => {
    const raw = (value || "").trim();
    if (!raw) return "";

    try {
      const url = new URL(raw);
      const token = url.searchParams.get("checkin");
      return token || raw;
    } catch {
      return raw;
    }
  };

  const fetchMyHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get("/attendance/my-history/");
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(
        language === "sw"
          ? "Imeshindikana kupata historia ya mahudhurio"
          : "Failed to load attendance history",
      );
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyHistory();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkin = params.get("checkin");
    if (checkin) {
      setTokenInput(checkin);
    }
  }, []);

  const submitCheckIn = async (tokenValue) => {
    const qrToken = parseToken(tokenValue || tokenInput);
    if (!qrToken) {
      toast.error(
        language === "sw"
          ? "Weka au skani msimbo wa QR"
          : "Enter or scan a QR token",
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/attendance/check-in/", {
        qr_token: qrToken,
      });
      const checkinStatus = response.data?.status;
      if (checkinStatus === "already_checked_in") {
        toast.success(
          language === "sw"
            ? "Umeshahudhuria huduma hii"
            : "You already checked in for this service",
        );
      } else {
        toast.success(
          language === "sw"
            ? "Mahudhurio yamehifadhiwa"
            : "Attendance check-in successful",
        );
      }
      fetchMyHistory();
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ||
          (language === "sw"
            ? "Imeshindikana kuhifadhi mahudhurio"
            : "Failed to check in attendance"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const startCamera = async () => {
    if (!window.BarcodeDetector) {
      toast.error(
        language === "sw"
          ? "Kifaa hiki hakiungi mkono skana ya kamera"
          : "This device does not support camera QR scanning",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const scanLoop = async () => {
        if (!videoRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            const scanned = barcodes[0].rawValue;
            setTokenInput(parseToken(scanned));
            stopCamera();
            submitCheckIn(scanned);
            return;
          }
        } catch {
          // Ignore transient camera detection errors.
        }
        rafRef.current = requestAnimationFrame(scanLoop);
      };

      rafRef.current = requestAnimationFrame(scanLoop);
    } catch (error) {
      toast.error(
        language === "sw"
          ? "Imeshindikana kufungua kamera"
          : "Unable to access camera",
      );
      stopCamera();
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Mahudhurio" : "Attendance"}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {language === "sw"
            ? "Skani QR au bandika tokeni ili kuingia huduma au kikundi"
            : "Scan a QR code or paste token to check in to services or groups"}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {language === "sw" ? "Tokeni/Link ya QR" : "QR Token/Link"}
        </label>
        <input
          className="input"
          placeholder={
            language === "sw"
              ? "Bandika tokeni au link ya QR"
              : "Paste QR token or check-in link"
          }
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => submitCheckIn()}
            disabled={submitting}
          >
            {submitting
              ? language === "sw"
                ? "Inahifadhi..."
                : "Checking in..."
              : language === "sw"
                ? "Thibitisha Mahudhurio"
                : "Confirm Check-in"}
          </button>
          {!cameraOpen ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={startCamera}
            >
              {language === "sw" ? "Skani kwa Kamera" : "Scan with Camera"}
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              onClick={stopCamera}
            >
              {language === "sw" ? "Funga Kamera" : "Stop Camera"}
            </button>
          )}
        </div>

        {cameraOpen && (
          <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              muted
              playsInline
            />
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {language === "sw"
              ? "Historia Yangu ya Mahudhurio"
              : "My Attendance History"}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full md:min-w-[920px] divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {language === "sw" ? "Tarehe" : "Date"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {language === "sw" ? "Aina ya Huduma" : "Service Type"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {language === "sw" ? "Jina la Huduma" : "Service Title"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {language === "sw" ? "Kanisa" : "Church"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {language === "sw" ? "Muda wa Check-in" : "Checked In At"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {history.length > 0 ? (
                history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.service_date}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.service_type_display || item.service_type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.service_title || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.church_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.checked_in_at
                        ? new Date(item.checked_in_at).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {language === "sw"
                      ? "Hakuna rekodi za mahudhurio bado"
                      : "No attendance records yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;

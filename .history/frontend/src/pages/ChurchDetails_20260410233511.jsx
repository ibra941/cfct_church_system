import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const ChurchDetails = () => {
  const { language } = useLanguage();
  const { id } = useParams();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChurch = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/churches/${id}/`);
        setChurch(response.data);
      } catch (error) {
        console.error("Error fetching church details:", error);
        toast.error(
          language === "sw"
            ? "Hitilafu wakati wa kupakua taarifa za kanisa"
            : "Unable to load church details",
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchChurch();
    }
  }, [id, language]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!church) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {language === "sw"
            ? "Kanisa halikuonekana."
            : "Church not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {church.name}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {language === "sw" ? "Aina ya kanisa" : "Church type"}: {church.church_type_display}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Maelezo ya Kanisa" : "Church Details"}
          </h2>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Anwani:" : "Address:"}
              </span>{" "}
              {church.address || "-"}
            </p>
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Mji:" : "City:"}
              </span>{" "}
              {church.city || "-"}
            </p>
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Mkoa:" : "Region:"}
              </span>{" "}
              {church.region || "-"}
            </p>
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Nchi:" : "Country:"}
              </span>{" "}
              {church.country || "-"}
            </p>
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Simu:" : "Phone:"}
              </span>{" "}
              {church.phone || "-"}
            </p>
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Barua pepe:" : "Email:"}
              </span>{" "}
              {church.email || "-"}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Uongozi wa Kanisa" : "Church Leadership"}
          </h2>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Mchungaji:" : "Pastor:"}
              </span>{" "}
              {church.pastor || "-"}
            </p>
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Tarehe ya Kuanzishwa:" : "Established:"}
              </span>{" "}
              {church.established_date ? new Date(church.established_date).toLocaleDateString() : "-"}
            </p>
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {language === "sw" ? "Hali:" : "Status:"}
              </span>{" "}
              {church.is_active
                ? language === "sw"
                  ? "Inatumika"
                  : "Active"
                : language === "sw"
                  ? "Haifanyi kazi"
                  : "Inactive"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChurchDetails;

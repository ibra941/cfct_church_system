import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

// REMOVED: import Navbar from "../components/common/Navbar";
// REMOVED: import Sidebar from "../components/common/Sidebar";

const Offerings = () => {
  const { language } = useLanguage();
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    amount: "",
    offering_type: "tithe",
    payment_method: "cash",
    member: "",
  });
  const [members, setMembers] = useState([]);

  useEffect(() => {
    fetchOfferings();
    fetchMembers();
  }, []);

  const fetchOfferings = async () => {
    try {
      const response = await api.get("/offerings/");
      const offeringsData = response.data.results || response.data;
      setOfferings(Array.isArray(offeringsData) ? offeringsData : []);
    } catch (error) {
      console.error(error);
      setOfferings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await api.get("/members/");
      const membersData = response.data.results || response.data;
      setMembers(Array.isArray(membersData) ? membersData : []);
    } catch (error) {
      console.error(error);
      setMembers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare data - convert amount to number and handle optional member
      const data = {
        amount: parseFloat(formData.amount),
        offering_type: formData.offering_type,
        payment_method: formData.payment_method,
        member: formData.member ? parseInt(formData.member) : null,
      };

      await api.post("/offerings/", data);
      toast.success(
        language === "sw" ? "Mchango umehifadhiwa!" : "Offering saved!",
      );
      setFormData({
        amount: "",
        offering_type: "tithe",
        payment_method: "cash",
        member: "",
      });
      fetchOfferings();
    } catch (error) {
      let errorMsg =
        language === "sw" ? "Hitilafu imetokea" : "An error occurred";
      if (error.response?.data) {
        const errors = error.response.data;
        if (typeof errors === "object") {
          const errorKeys = Object.keys(errors);
          if (errorKeys.length > 0) {
            errorMsg = String(errors[errorKeys[0]]).substring(0, 100);
          }
        }
      }
      toast.error(errorMsg);
      console.error("Submission error:", error.response?.data || error.message);
    }
  };

  const totalOfferings = offerings.reduce(
    (sum, o) => sum + parseFloat(o.amount || 0),
    0,
  );

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // REMOVED: Outer div with Sidebar and Navbar
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {language === "sw" ? "Matoleo" : "Offerings"}
      </h1>

      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-white text-lg mb-2">
          {language === "sw" ? "Jumla ya Matoleo" : "Total Offerings"}
        </h3>
        <p className="text-white text-4xl font-bold">
          TZS {totalOfferings.toLocaleString()}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Add Offering Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw" ? "Ongeza Mchango" : "Add Offering"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <select
              className="input"
              value={formData.member}
              onChange={(e) =>
                setFormData({ ...formData, member: e.target.value })
              }
            >
              <option value="">
                {language === "sw"
                  ? "Chagua Mwanachama (Hiyari)"
                  : "Select Member (Optional)"}
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.username}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder={language === "sw" ? "Kiasi (TZS)" : "Amount (TZS)"}
              className="input"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              required
            />

            <select
              className="input"
              value={formData.offering_type}
              onChange={(e) =>
                setFormData({ ...formData, offering_type: e.target.value })
              }
            >
              <option value="tithe">Zaka</option>
              <option value="offering">Sadaka</option>
              <option value="building">Mchango wa Jengo</option>
              <option value="mission">Mchango wa Misheni</option>
            </select>

            <select
              className="input"
              value={formData.payment_method}
              onChange={(e) =>
                setFormData({ ...formData, payment_method: e.target.value })
              }
            >
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online</option>
              <option value="cheque">Cheque</option>
            </select>

            <button type="submit" className="btn-primary w-full">
              {language === "sw" ? "Wasilisha Mchango" : "Submit Offering"}
            </button>
          </form>
        </div>

        {/* Recent Offerings List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {language === "sw"
              ? "Matoleo ya Hivi Karibuni"
              : "Recent Offerings"}
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {offerings.slice(0, 10).map((offering) => (
              <div
                key={offering.id}
                className="border-b border-gray-200 dark:border-gray-700 pb-3"
              >
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    {new Date(offering.created_at).toLocaleDateString()}
                  </span>
                  <span className="font-bold text-primary-600">
                    TZS {parseFloat(offering.amount).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {offering.offering_type_display || offering.offering_type} -{" "}
                  {offering.payment_method}
                </div>
              </div>
            ))}
            {offerings.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                {language === "sw" ? "Hakuna matoleo bado" : "No offerings yet"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Offerings;

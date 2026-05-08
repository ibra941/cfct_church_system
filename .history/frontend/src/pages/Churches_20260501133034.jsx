import { useEffect, useMemo, useState } from "react";
import { FaEdit, FaPlus, FaTrash } from "react-icons/fa";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const Churches = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalChurches, setTotalChurches] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [zones, setZones] = useState([]);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filters, setFilters] = useState({
    zoneId: "",
    regionId: "",
    districtId: "",
    churchName: "",
  });
  const [showModal, setShowModal] = useState(false);
  const [editingChurch, setEditingChurch] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    church_type: "local",
    parent_church: "",
    address: "",
    city: "",
    region: "",
    phone: "",
    email: "",
  });

  const effectiveScope = useMemo(() => {
    const scopeFromQuery = searchParams.get("scope");
    if (scopeFromQuery) return scopeFromQuery;
    if (user?.role === "zone_leader") return "zone";
    if (user?.role === "regional_leader") return "regional";
    if (user?.role === "district_leader") return "district";
    return "national";
  }, [searchParams, user?.role]);

  const showZoneFilter = effectiveScope === "national";
  const showRegionFilter =
    effectiveScope === "national" || effectiveScope === "zone";
  const showDistrictFilter =
    effectiveScope === "national" ||
    effectiveScope === "zone" ||
    effectiveScope === "regional";

  useEffect(() => {
    const initialZone = searchParams.get("zone_id") || "";
    const initialRegion = searchParams.get("region_id") || "";
    const initialDistrict = searchParams.get("district_id") || "";
    const initialChurchName = searchParams.get("church_name") || "";

    setSearch(initialChurchName);
    setFilters((prev) => ({
      ...prev,
      zoneId: initialZone,
      regionId: initialRegion,
      districtId: initialDistrict,
      churchName: initialChurchName,
    }));
  }, [searchParams]);

  useEffect(() => {
    fetchZones();
  }, []);

  useEffect(() => {
    fetchRegions();
  }, [filters.zoneId]);

  useEffect(() => {
    fetchDistricts();
  }, [filters.zoneId, filters.regionId]);

  useEffect(() => {
    fetchChurches();
  }, [
    search,
    filters.zoneId,
    filters.regionId,
    filters.districtId,
    currentPage,
  ]);

  const fetchZones = async () => {
    try {
      const response = await api.get("/zones/");
      const zonesData = response.data.results || response.data || [];
      setZones(Array.isArray(zonesData) ? zonesData : []);
    } catch (error) {
      console.error("Error fetching zones:", error);
      setZones([]);
    }
  };

  const fetchRegions = async () => {
    try {
      const params = {};
      if (filters.zoneId) params.zone_id = filters.zoneId;
      const response = await api.get("/regions/", { params });
      const regionsData = response.data.results || response.data || [];
      setRegions(Array.isArray(regionsData) ? regionsData : []);
    } catch (error) {
      console.error("Error fetching regions:", error);
      setRegions([]);
    }
  };

  const fetchDistricts = async () => {
    try {
      const params = {};
      if (filters.zoneId) params.zone_id = filters.zoneId;
      if (filters.regionId) params.region_id = filters.regionId;
      const response = await api.get("/districts/", { params });
      const districtsData = response.data.results || response.data || [];
      setDistricts(Array.isArray(districtsData) ? districtsData : []);
    } catch (error) {
      console.error("Error fetching districts:", error);
      setDistricts([]);
    }
  };

  const fetchChurches = async () => {
    try {
      const params = {
        church_type: "local",
        page: currentPage,
      };
      if (search.trim()) params.search = search.trim();
      if (filters.zoneId) params.zone_id = filters.zoneId;
      if (filters.regionId) params.region_id = filters.regionId;
      if (filters.districtId) params.district_id = filters.districtId;
      const response = await api.get("/churches/", { params });
      const churchesData = response.data.results || response.data || [];
      setChurches(churchesData);
      setTotalChurches(
        typeof response.data.count === "number"
          ? response.data.count
          : Array.isArray(churchesData)
            ? churchesData.length
            : 0,
      );
      if (Array.isArray(churchesData) && churchesData.length > 0) {
        setPageSize(churchesData.length);
      }
    } catch (error) {
      console.error("Error fetching churches:", error);
      setChurches([]);
      setTotalChurches(0);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setCurrentPage(1);
    setFilters((prev) => {
      if (key === "zoneId") {
        return { ...prev, zoneId: value, regionId: "", districtId: "" };
      }
      if (key === "regionId") {
        return { ...prev, regionId: value, districtId: "" };
      }
      return { ...prev, [key]: value };
    });
  };

  const clearFilters = () => {
    setCurrentPage(1);
    setSearch("");
    setFilters({ zoneId: "", regionId: "", districtId: "", churchName: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingChurch) {
        await api.put(`/churches/${editingChurch.id}/`, formData);
        toast.success(
          language === "sw"
            ? "Kanisa limehaririwa kikamilifu."
            : "Church updated successfully.",
        );
      } else {
        await api.post("/churches/", formData);
        toast.success(
          language === "sw"
            ? "Kanisa limesajiliwa kikamilifu."
            : "Church registered successfully.",
        );
      }
      fetchChurches();
      setShowModal(false);
      resetForm();
    } catch (error) {
      const backendMessage =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        (typeof error?.response?.data === "string" ? error.response.data : "");
      toast.error(
        backendMessage ||
          (language === "sw"
            ? "Imeshindikana kuhifadhi kanisa. Tafadhali jaribu tena."
            : "Failed to save church. Please try again."),
      );
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        language === "sw"
          ? "Una hakika unataka kufuta kanisa hili?"
          : "Are you sure you want to delete this church?",
      )
    ) {
      try {
        await api.delete(`/churches/${id}/`);
        fetchChurches();
        toast.success(
          language === "sw"
            ? "Kanisa limefutwa kikamilifu."
            : "Church deleted successfully.",
        );
      } catch (error) {
        const backendMessage =
          error?.response?.data?.error ||
          error?.response?.data?.detail ||
          (typeof error?.response?.data === "string" ? error.response.data : "");
        toast.error(
          backendMessage ||
            (language === "sw"
              ? "Imeshindikana kufuta kanisa."
              : "Failed to delete church."),
        );
        console.error(error);
      }
    }
  };

  const resetForm = () => {
    setEditingChurch(null);
    setFormData({
      name: "",
      code: "",
      church_type: "local",
      parent_church: "",
      address: "",
      city: "",
      region: "",
      phone: "",
      email: "",
    });
  };

  const churchTypes = [
    { value: "national", label: language === "sw" ? "Taifa" : "National" },
    { value: "zone", label: language === "sw" ? "Kanda" : "Zone" },
    { value: "region", label: language === "sw" ? "Mkoa" : "Region" },
    { value: "district", label: language === "sw" ? "Wilaya" : "District" },
    { value: "local", label: language === "sw" ? "Kanisa" : "Local" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === "sw" ? "Makanisa" : "Churches"}
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <FaPlus />
          <span>{language === "sw" ? "Ongeza Kanisa" : "Add Church"}</span>
        </button>
      </div>

      <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        {language === "sw"
          ? `Jumla ya makanisa: ${totalChurches}`
          : `Total churches: ${totalChurches}`}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {showZoneFilter && (
            <select
              className="input"
              value={filters.zoneId}
              onChange={(e) => handleFilterChange("zoneId", e.target.value)}
            >
              <option value="">
                {language === "sw" ? "Kanda zote" : "All zones"}
              </option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          )}

          {showRegionFilter && (
            <select
              className="input"
              value={filters.regionId}
              onChange={(e) => handleFilterChange("regionId", e.target.value)}
            >
              <option value="">
                {language === "sw" ? "Mikoa yote" : "All regions"}
              </option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          )}

          {showDistrictFilter && (
            <select
              className="input"
              value={filters.districtId}
              onChange={(e) => handleFilterChange("districtId", e.target.value)}
            >
              <option value="">
                {language === "sw" ? "Wilaya zote" : "All districts"}
              </option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            className="input"
            placeholder={
              language === "sw"
                ? "Tafuta kanisa kwa jina"
                : "Search church by name"
            }
            value={search}
            onChange={(e) => {
              setCurrentPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>

        <div className="mt-4">
          <button onClick={clearFilters} className="btn-secondary">
            {language === "sw" ? "Futa Vichujio" : "Clear Filters"}
          </button>
        </div>
      </div>

      {churches.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {language === "sw"
              ? "Hakuna makanisa yaliyopatikana. Tafadhali ongeza kanisa."
              : "No churches found. Please add a church."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full md:min-w-[880px] divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {language === "sw" ? "Jina" : "Name"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {language === "sw" ? "Aina" : "Type"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {language === "sw" ? "Mahali" : "Location"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {language === "sw" ? "Vitendo" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {churches.map((church) => (
                  <tr key={church.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {church.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700">
                        {church.church_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {church.code || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {church.city || church.region || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setEditingChurch(church);
                          setFormData(church);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(church.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalChurches > pageSize && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            {language === "sw" ? "Nyuma" : "Previous"}
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {language === "sw"
              ? `Ukurasa ${currentPage}`
              : `Page ${currentPage}`}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={currentPage * pageSize >= totalChurches}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            {language === "sw" ? "Mbele" : "Next"}
          </button>
        </div>
      )}

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingChurch
                  ? language === "sw"
                    ? "Hariri Kanisa"
                    : "Edit Church"
                  : language === "sw"
                    ? "Ongeza Kanisa"
                    : "Add Church"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Jina" : "Name"}
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Aina ya Kanisa" : "Church Type"}
                  </label>
                  <select
                    className="input"
                    value={formData.church_type}
                    onChange={(e) =>
                      setFormData({ ...formData, church_type: e.target.value })
                    }
                  >
                    {churchTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {language === "sw" ? "Anwani" : "Address"}
                  </label>
                  <textarea
                    className="input"
                    rows="2"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Jiji" : "City"}
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {language === "sw" ? "Mkoa" : "Region"}
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.region}
                      onChange={(e) =>
                        setFormData({ ...formData, region: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Simu
                    </label>
                    <input
                      type="tel"
                      className="input"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      className="input"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    {language === "sw" ? "Ghairi" : "Cancel"}
                  </button>
                  <button type="submit" className="btn-primary">
                    {language === "sw" ? "Hifadhi" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Churches;

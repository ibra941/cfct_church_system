import api from "../services/api";

/**
 * Fetch churches by type from the API
 * Commonly used for fetching zones, regions, districts, or local churches
 */
export const fetchChurchesByType = async (churchType, parentChurchId = null) => {
  try {
    let url = `/churches/?church_type=${churchType}&limit=500`;
    if (parentChurchId) {
      url += `&parent_church_id=${parentChurchId}`;
    }
    const response = await api.get(url);
    return response.data.results || response.data || [];
  } catch (error) {
    console.error(`Error fetching ${churchType} churches:`, error);
    return [];
  }
};

/**
 * Fetch all zones (national level)
 */
export const fetchZones = () => fetchChurchesByType("zone");

/**
 * Fetch regions for a specific zone
 */
export const fetchRegionsForZone = (zoneId) => fetchChurchesByType("region", zoneId);

/**
 * Fetch districts for a specific region
 */
export const fetchDistrictsForRegion = (regionId) => fetchChurchesByType("district", regionId);

/**
 * Fetch local churches for a specific district
 */
export const fetchLocalChurchesForDistrict = (districtId) => fetchChurchesByType("local", districtId);

/**
 * Fetch any church by ID
 */
export const fetchChurchById = async (churchId) => {
  try {
    const response = await api.get(`/churches/${churchId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching church ${churchId}:`, error);
    return null;
  }
};

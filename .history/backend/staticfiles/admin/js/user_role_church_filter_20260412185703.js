(function () {
  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  onReady(function () {
    var roleSelect = document.getElementById("id_role");
    var churchSelect = document.getElementById("id_church");

    if (!roleSelect || !churchSelect) {
      return;
    }

    var apiBase = "/admin/accounts/user/api/";
    var roleConfig = {
      national_leader: { level: null },
      zone_leader: { level: "zone" },
      regional_leader: { level: "region" },
      district_leader: { level: "district" },
      local_leader: { level: "local" },
    };

    var churchRow = churchSelect.closest(".form-row") || churchSelect.parentElement;
    var zoneField = createSelectField("Zone", "id_role_zone_filter", churchRow);
    var regionField = createSelectField("Region", "id_role_region_filter", churchRow);
    var districtField = createSelectField("District", "id_role_district_filter", churchRow);

    function createSelectField(labelText, selectId, insertBeforeNode) {
      var row = document.createElement("div");
      row.className = "form-row";

      var wrapper = document.createElement("div");
      wrapper.className = "field-box";

      var label = document.createElement("label");
      label.setAttribute("for", selectId);
      label.textContent = labelText + ":";

      var select = document.createElement("select");
      select.id = selectId;
      select.className = "vForeignKeyRawIdAdminField";
      select.style.minWidth = "260px";

      wrapper.appendChild(label);
      wrapper.appendChild(select);
      row.appendChild(wrapper);

      insertBeforeNode.parentNode.insertBefore(row, insertBeforeNode);
      return { row: row, select: select };
    }

    function setVisible(field, visible) {
      field.row.style.display = visible ? "" : "none";
    }

    function setOptions(select, items, placeholder) {
      select.innerHTML = "";
      select.appendChild(new Option(placeholder, ""));
      items.forEach(function (item) {
        select.appendChild(new Option(item.name, String(item.id)));
      });
    }

    function clearChain(fromLevel) {
      if (fromLevel === "zone") {
        setOptions(regionField.select, [], "Select region");
        setOptions(districtField.select, [], "Select district");
      }
      if (fromLevel === "region") {
        setOptions(districtField.select, [], "Select district");
      }
    }

    function setChurchOptions(items, placeholder) {
      setOptions(churchSelect, items, placeholder || "Select option");
      churchSelect.disabled = items.length === 0;
    }

    function fetchJson(url) {
      return fetch(url, { credentials: "same-origin" }).then(function (response) {
        if (!response.ok) {
          return [];
        }
        return response.json();
      });
    }

    function loadZones() {
      return fetchJson(apiBase + "zones/").then(function (zones) {
        setOptions(zoneField.select, zones, "Select zone");
        return zones;
      });
    }

    function loadRegions(zoneId) {
      var url = apiBase + "regions/";
      if (zoneId) {
        url += "?zone_id=" + encodeURIComponent(zoneId);
      }
      return fetchJson(url).then(function (regions) {
        setOptions(regionField.select, regions, "Select region");
        return regions;
      });
    }

    function loadDistricts(regionId) {
      var url = apiBase + "districts/";
      if (regionId) {
        url += "?region_id=" + encodeURIComponent(regionId);
      }
      return fetchJson(url).then(function (districts) {
        setOptions(districtField.select, districts, "Select district");
        return districts;
      });
    }

    function loadChurches(districtId) {
      var url = apiBase + "churches/";
      if (districtId) {
        url += "?district_id=" + encodeURIComponent(districtId);
      }
      return fetchJson(url);
    }

    function hideFilters() {
      setVisible(zoneField, false);
      setVisible(regionField, false);
      setVisible(districtField, false);
    }

    function syncRoleUI() {
      var selectedRole = roleSelect.value;
      var config = roleConfig[selectedRole] || { level: null };

      hideFilters();
      zoneField.select.value = "";
      regionField.select.value = "";
      districtField.select.value = "";

      if (selectedRole === "national_leader") {
        churchSelect.innerHTML = "";
        churchSelect.appendChild(new Option("No church selection needed", ""));
        churchSelect.value = "";
        churchSelect.disabled = true;
        return;
      }

      churchSelect.disabled = false;

      if (config.level === "zone") {
        loadZones().then(function (zones) {
          setChurchOptions(zones, "Select zone");
        });
        return;
      }

      if (config.level === "region") {
        setVisible(zoneField, true);
        setChurchOptions([], "Select region");
        loadZones();
        return;
      }

      if (config.level === "district") {
        setVisible(zoneField, true);
        setVisible(regionField, true);
        clearChain("zone");
        setChurchOptions([], "Select district");
        loadZones();
        return;
      }

      if (config.level === "local") {
        setVisible(zoneField, true);
        setVisible(regionField, true);
        setVisible(districtField, true);
        clearChain("zone");
        setChurchOptions([], "Select church");
        loadZones();
      }
    }

    zoneField.select.addEventListener("change", function () {
      var selectedRole = roleSelect.value;
      var zoneId = zoneField.select.value;
      clearChain("zone");

      if (!zoneId) {
        if (selectedRole === "regional_leader") {
          setChurchOptions([], "Select region");
        } else if (selectedRole === "district_leader") {
          setChurchOptions([], "Select district");
        } else if (selectedRole === "local_leader") {
          setChurchOptions([], "Select church");
        }
        return;
      }

      if (selectedRole === "regional_leader") {
        loadRegions(zoneId).then(function (regions) {
          setChurchOptions(regions, "Select region");
        });
        return;
      }

      loadRegions(zoneId);
    });

    regionField.select.addEventListener("change", function () {
      var selectedRole = roleSelect.value;
      var regionId = regionField.select.value;
      clearChain("region");

      if (!regionId) {
        if (selectedRole === "district_leader") {
          setChurchOptions([], "Select district");
        } else if (selectedRole === "local_leader") {
          setChurchOptions([], "Select church");
        }
        return;
      }

      if (selectedRole === "district_leader") {
        loadDistricts(regionId).then(function (districts) {
          setChurchOptions(districts, "Select district");
        });
        return;
      }

      loadDistricts(regionId);
    });

    districtField.select.addEventListener("change", function () {
      var districtId = districtField.select.value;
      if (!districtId) {
        setChurchOptions([], "Select church");
        return;
      }
      loadChurches(districtId).then(function (churches) {
        setChurchOptions(churches, "Select church");
      });
    });

    roleSelect.addEventListener("change", syncRoleUI);
    syncRoleUI();
  });
})();

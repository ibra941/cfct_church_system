(function () {
  "use strict";

  var LEVELS = [
    {
      key: "zone",
      label: "Zone",
      endpoint: function () { return "/admin/accounts/user/api/zones/"; },
      visibleForRoles: ["zone_leader", "regional_leader", "district_leader", "local_leader"],
      finalForRoles: ["zone_leader"],
    },
    {
      key: "region",
      label: "Region",
      endpoint: function (parentValue) {
        return "/admin/accounts/user/api/regions/" + (parentValue ? "?zone_id=" + parentValue : "");
      },
      visibleForRoles: ["regional_leader", "district_leader", "local_leader"],
      finalForRoles: ["regional_leader"],
    },
    {
      key: "district",
      label: "District",
      endpoint: function (parentValue) {
        return "/admin/accounts/user/api/districts/" + (parentValue ? "?region_id=" + parentValue : "");
      },
      visibleForRoles: ["district_leader", "local_leader"],
      finalForRoles: ["district_leader"],
    },
    {
      key: "church",
      label: "Church",
      endpoint: function (parentValue) {
        return "/admin/accounts/user/api/churches/" + (parentValue ? "?district_id=" + parentValue : "");
      },
      visibleForRoles: ["local_leader"],
      finalForRoles: ["local_leader"],
    },
  ];

  function byId(id) {
    return document.getElementById(id);
  }

  function setOptions(selectEl, items, placeholder) {
    selectEl.innerHTML = "";
    var first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder || "---------";
    selectEl.appendChild(first);

    (items || []).forEach(function (item) {
      var opt = document.createElement("option");
      opt.value = String(item.id);
      opt.textContent = item.name;
      selectEl.appendChild(opt);
    });
  }

  function makeRow(level) {
    var row = document.createElement("div");
    row.className = "form-row field-cascade-" + level.key;
    row.id = "cascade-row-" + level.key;
    row.style.display = "none";

    var wrapper = document.createElement("div");

    var label = document.createElement("label");
    label.htmlFor = "cascade-" + level.key;
    label.textContent = "Select " + level.label + ":";

    var select = document.createElement("select");
    select.id = "cascade-" + level.key;
    select.name = "cascade_" + level.key;
    select.className = "vTextField";

    setOptions(select, [], "Select " + level.label);

    wrapper.appendChild(label);
    wrapper.appendChild(select);
    row.appendChild(wrapper);
    return row;
  }

  function fetchJson(url, onDone) {
    fetch(url, {
      method: "GET",
      credentials: "same-origin",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
      .then(function (resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.json();
      })
      .then(function (data) {
        onDone(null, Array.isArray(data) ? data : []);
      })
      .catch(function (err) {
        onDone(err, []);
      });
  }

  function selectedRole() {
    var roleEl = byId("id_role");
    return roleEl ? roleEl.value : "";
  }

  function updateHiddenValue() {
    var role = selectedRole();
    var hidden = byId("id_church_id_hidden");
    if (!hidden) return;

    var value = "";
    LEVELS.forEach(function (level) {
      if (level.finalForRoles.indexOf(role) !== -1) {
        var sel = byId("cascade-" + level.key);
        value = sel ? sel.value : "";
      }
    });
    hidden.value = value;
  }

  function clearAfter(index, role) {
    for (var i = index + 1; i < LEVELS.length; i++) {
      var lvl = LEVELS[i];
      var row = byId("cascade-row-" + lvl.key);
      var sel = byId("cascade-" + lvl.key);
      if (sel) setOptions(sel, [], "Select " + lvl.label);
      if (row) {
        row.style.display = lvl.visibleForRoles.indexOf(role) !== -1 ? "" : "none";
      }
    }
  }

  function loadLevel(index, parentValue) {
    var role = selectedRole();
    var level = LEVELS[index];
    if (!level || level.visibleForRoles.indexOf(role) === -1) return;

    var row = byId("cascade-row-" + level.key);
    var select = byId("cascade-" + level.key);
    if (!row || !select) return;

    row.style.display = "";
    setOptions(select, [], "Loading...");

    fetchJson(level.endpoint(parentValue), function (err, items) {
      if (err) {
        setOptions(select, [], "Unable to load " + level.label);
      } else {
        setOptions(select, items, "Select " + level.label);
      }
      updateHiddenValue();
    });
  }

  function onRoleChanged() {
    var role = selectedRole();
    var hidden = byId("id_church_id_hidden");
    if (hidden) hidden.value = "";

    for (var i = 0; i < LEVELS.length; i++) {
      var level = LEVELS[i];
      var row = byId("cascade-row-" + level.key);
      var sel = byId("cascade-" + level.key);
      if (sel) setOptions(sel, [], "Select " + level.label);
      if (row) row.style.display = level.visibleForRoles.indexOf(role) !== -1 ? "" : "none";
    }

    if (!role || role === "national_leader") return;

    loadLevel(0, null);
  }

  function onLevelChanged(levelIndex) {
    var role = selectedRole();
    var current = byId("cascade-" + LEVELS[levelIndex].key);
    var selected = current ? current.value : "";

    clearAfter(levelIndex, role);

    var nextIndex = levelIndex + 1;
    if (selected && nextIndex < LEVELS.length) {
      if (LEVELS[nextIndex].visibleForRoles.indexOf(role) !== -1) {
        loadLevel(nextIndex, selected);
      }
    }

    updateHiddenValue();
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.body || !document.body.classList.contains("add-form")) return;

    var roleEl = byId("id_role");
    if (!roleEl) return;

    var roleRow = roleEl.closest(".form-row") || roleEl.closest("p") || roleEl.parentNode;
    if (!roleRow || !roleRow.parentNode) return;

    var insertAfter = roleRow;
    for (var i = 0; i < LEVELS.length; i++) {
      var row = makeRow(LEVELS[i]);
      insertAfter.parentNode.insertBefore(row, insertAfter.nextSibling);
      insertAfter = row;
    }

    for (var j = 0; j < LEVELS.length; j++) {
      (function (idx) {
        var sel = byId("cascade-" + LEVELS[idx].key);
        if (sel) {
          sel.addEventListener("change", function () {
            onLevelChanged(idx);
          });
        }
      })(j);
    }

    roleEl.addEventListener("change", onRoleChanged);
    onRoleChanged();
  });
})();

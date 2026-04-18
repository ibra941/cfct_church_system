(function () {
  "use strict";

  /* -----------------------------------------------------------------------
     Cascade config
     Each level lists which roles make it visible and which role considers
     it the "final" destination (= value stored in church_id_hidden).
  ----------------------------------------------------------------------- */
  var LEVELS = [
    {
      key: "zone",
      label: "Zone",
      endpoint: function () { return "/admin/accounts/user/api/zones/"; },
      visibleForRoles: ["zone_leader", "regional_leader", "district_leader", "local_leader"],
      finalForRoles:   ["zone_leader"],
    },
    {
      key: "region",
      label: "Region",
      endpoint: function (pv) { return "/admin/accounts/user/api/regions/" + (pv ? "?zone_id=" + pv : ""); },
      visibleForRoles: ["regional_leader", "district_leader", "local_leader"],
      finalForRoles:   ["regional_leader"],
    },
    {
      key: "district",
      label: "District",
      endpoint: function (pv) { return "/admin/accounts/user/api/districts/" + (pv ? "?region_id=" + pv : ""); },
      visibleForRoles: ["district_leader", "local_leader"],
      finalForRoles:   ["district_leader"],
    },
    {
      key: "church",
      label: "Church",
      endpoint: function (pv) { return "/admin/accounts/user/api/churches/" + (pv ? "?district_id=" + pv : ""); },
      visibleForRoles: ["local_leader"],
      finalForRoles:   ["local_leader"],
    },
  ];

  /* helpers */
  function $id(id)  { return document.getElementById(id); }
  function includes(arr, val) { return arr.indexOf(val) !== -1; }

  function setOptions(select, items, emptyLabel) {
    select.innerHTML = "";
    var blank = document.createElement("option");
    blank.value = "";
    blank.textContent = emptyLabel || "---------";
    select.appendChild(blank);
    (items || []).forEach(function (item) {
      var opt = document.createElement("option");
      opt.value = String(item.id);
      opt.textContent = item.name;
      select.appendChild(opt);
    });
  }

  function makeRow(level) {
    var outer = document.createElement("div");
    outer.id    = "cascade-row-" + level.key;
    outer.className = "form-row";
    outer.style.cssText = "display:none; margin-top:8px;";

    var inner = document.createElement("div");
    inner.style.cssText = "padding:4px 0;";

    var lbl = document.createElement("label");
    lbl.htmlFor    = "cascade-" + level.key;
    lbl.textContent = "Select " + level.label + ":";
    lbl.style.cssText = "display:inline-block; min-width:140px; font-weight:bold;";

    var sel = document.createElement("select");
    sel.id        = "cascade-" + level.key;
    sel.name      = "cascade_" + level.key;
    sel.style.cssText = "min-width:300px; padding:4px 6px;";
    setOptions(sel, [], "Select " + level.label);

    /* hint shown when no items were returned */
    var hint = document.createElement("span");
    hint.id = "cascade-hint-" + level.key;
    hint.style.cssText = "margin-left:10px; color:#c00; font-size:0.85em; display:none;";

    inner.appendChild(lbl);
    inner.appendChild(sel);
    inner.appendChild(hint);
    outer.appendChild(inner);
    return outer;
  }

  function showHint(key, msg) {
    var hint = $id("cascade-hint-" + key);
    if (!hint) return;
    hint.innerHTML = msg;
    hint.style.display = msg ? "inline" : "none";
  }

  function fetchJson(url, cb) {
    fetch(url, {
      method: "GET",
      credentials: "same-origin",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) { cb(null, Array.isArray(d) ? d : []); })
      .catch(function (e) { cb(e, []); });
  }

  function updateHidden() {
    var role   = ($id("id_role") || {}).value || "";
    var hidden = $id("id_church_id_hidden");
    if (!hidden) return;
    var val = "";
    LEVELS.forEach(function (lvl) {
      if (includes(lvl.finalForRoles, role)) {
        val = ($id("cascade-" + lvl.key) || {}).value || "";
      }
    });
    hidden.value = val;
  }

  function loadLevel(index, parentValue) {
    var role  = ($id("id_role") || {}).value || "";
    var level = LEVELS[index];
    if (!level || !includes(level.visibleForRoles, role)) return;

    var row = $id("cascade-row-" + level.key);
    var sel = $id("cascade-" + level.key);
    if (!row || !sel) return;

    row.style.display = "";
    setOptions(sel, [], "Loading...");
    showHint(level.key, "");

    fetchJson(level.endpoint(parentValue), function (err, items) {
      if (err) {
        setOptions(sel, [], "Error loading " + level.label);
        showHint(level.key, "Could not load options.");
        return;
      }
      if (items.length === 0) {
        setOptions(sel, [], "— No " + level.label + "s found —");
        showHint(
          level.key,
          'No ' + level.label.toLowerCase() + 's exist yet. '
          + '<a href="/admin/churches/church/add/" target="_blank">Add one in Church admin</a> then reload this page.'
        );
      } else {
        setOptions(sel, items, "Select " + level.label);
        showHint(level.key, "");
      }
      updateHidden();
    });
  }

  function clearFrom(afterIndex, role) {
    for (var i = afterIndex + 1; i < LEVELS.length; i++) {
      var lvl = LEVELS[i];
      var row = $id("cascade-row-" + lvl.key);
      var sel = $id("cascade-" + lvl.key);
      if (sel) setOptions(sel, [], "Select " + lvl.label);
      showHint(lvl.key, "");
      if (row) row.style.display = includes(lvl.visibleForRoles, role) ? "" : "none";
    }
  }

  function onRoleChange() {
    var role   = ($id("id_role") || {}).value || "";
    var hidden = $id("id_church_id_hidden");
    if (hidden) hidden.value = "";

    /* reset all */
    LEVELS.forEach(function (lvl) {
      var row = $id("cascade-row-" + lvl.key);
      var sel = $id("cascade-" + lvl.key);
      if (sel) setOptions(sel, [], "Select " + lvl.label);
      showHint(lvl.key, "");
      if (row) row.style.display = includes(lvl.visibleForRoles, role) ? "" : "none";
    });

    if (!role || role === "national_leader") return;

    /* load first visible level */
    for (var i = 0; i < LEVELS.length; i++) {
      if (includes(LEVELS[i].visibleForRoles, role)) {
        loadLevel(i, null);
        break;
      }
    }
  }

  function onLevelChange(index) {
    var role = ($id("id_role") || {}).value || "";
    var sel  = $id("cascade-" + LEVELS[index].key);
    var val  = sel ? sel.value : "";

    clearFrom(index, role);

    var next = index + 1;
    if (val && next < LEVELS.length && includes(LEVELS[next].visibleForRoles, role)) {
      loadLevel(next, val);
    }
    updateHidden();
  }

  /* ── init ───────────────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    /* Only run on the Add User admin form */
    if (!$id("id_church_id_hidden")) return;

    var roleEl = $id("id_role");
    if (!roleEl) return;

    /* Insert cascade rows after the role field's parent row */
    var roleRow = roleEl.closest(".form-row") || roleEl.closest("p") || roleEl.parentNode;
    if (!roleRow || !roleRow.parentNode) return;

    var marker = roleRow;
    LEVELS.forEach(function (lvl, idx) {
      var row = makeRow(lvl);
      marker.parentNode.insertBefore(row, marker.nextSibling);
      marker = row;

      var sel = $id("cascade-" + lvl.key);
      if (sel) {
        (function (i) {
          sel.addEventListener("change", function () { onLevelChange(i); });
        })(idx);
      }
    });

    roleEl.addEventListener("change", onRoleChange);
    /* Trigger for current value (e.g. when page reloads on validation error) */
    onRoleChange();
  });
})();

    {
      key: "region",
      label: "Region",
      endpoint: function (parentValue) {
        return (
          "/admin/accounts/user/api/regions/" +
          (parentValue ? "?zone_id=" + parentValue : "")
        );
      },
      visibleForRoles: ["regional_leader", "district_leader", "local_leader"],
      finalForRoles: ["regional_leader"],
    },
    {
      key: "district",
      label: "District",
      endpoint: function (parentValue) {
        return (
          "/admin/accounts/user/api/districts/" +
          (parentValue ? "?region_id=" + parentValue : "")
        );
      },
      visibleForRoles: ["district_leader", "local_leader"],
      finalForRoles: ["district_leader"],
    },
    {
      key: "church",
      label: "Church",
      endpoint: function (parentValue) {
        return (
          "/admin/accounts/user/api/churches/" +
          (parentValue ? "?district_id=" + parentValue : "")
        );
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
        row.style.display =
          lvl.visibleForRoles.indexOf(role) !== -1 ? "" : "none";
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
      if (row)
        row.style.display =
          level.visibleForRoles.indexOf(role) !== -1 ? "" : "none";
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
    // Do not rely on body classes (they vary by admin versions/themes).
    // If the hidden field exists, we are on the custom Add User form.
    if (!byId("id_church_id_hidden")) return;

    var roleEl = byId("id_role");
    if (!roleEl) return;

    var roleRow =
      roleEl.closest(".form-row") || roleEl.closest("p") || roleEl.parentNode;
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

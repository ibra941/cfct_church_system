(function () {
  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function parseChurchType(text) {
    var match = text.match(/\(([^)]+)\)\s*$/);
    return match ? match[1].trim().toLowerCase() : "";
  }

  onReady(function () {
    var roleSelect = document.getElementById("id_role");
    var churchSelect = document.getElementById("id_church");

    if (!roleSelect || !churchSelect) {
      return;
    }

    var allOptions = Array.prototype.slice
      .call(churchSelect.options)
      .map(function (opt) {
        return {
          value: opt.value,
          text: opt.text,
          selected: opt.selected,
          isEmpty: !opt.value,
          churchType: opt.value ? parseChurchType(opt.text) : "",
        };
      });

    var roleToType = {
      zone_leader: "zone",
      regional_leader: "region",
      district_leader: "district",
      local_leader: "local",
    };

    function rebuildOptions() {
      var selectedRole = roleSelect.value;
      var expectedType = roleToType[selectedRole] || null;
      var previousValue = churchSelect.value;

      churchSelect.innerHTML = "";

      allOptions.forEach(function (opt) {
        if (opt.isEmpty) {
          var emptyOpt = new Option(opt.text, opt.value);
          churchSelect.add(emptyOpt);
          return;
        }

        if (!expectedType || opt.churchType === expectedType) {
          var next = new Option(opt.text, opt.value);
          churchSelect.add(next);
        }
      });

      if (selectedRole === "national_leader") {
        churchSelect.value = "";
        churchSelect.disabled = true;
      } else {
        churchSelect.disabled = false;
        var stillExists = Array.prototype.some.call(
          churchSelect.options,
          function (opt) {
            return opt.value === previousValue;
          },
        );
        churchSelect.value = stillExists ? previousValue : "";
      }
    }

    roleSelect.addEventListener("change", rebuildOptions);
    rebuildOptions();
  });
})();

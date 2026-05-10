(function () {
  // var DEFAULT_API_BASE = "http://localhost:5000/api";
  var DEFAULT_API_BASE = "https://atlas-7uvm.onrender.com/api";
  var raw =
    typeof window.ATLAS_API_BASE === "string"
      ? window.ATLAS_API_BASE.trim()
      : "";
  window.ATLAS_API_BASE = (raw || DEFAULT_API_BASE).replace(/\/+$/, "");
})();

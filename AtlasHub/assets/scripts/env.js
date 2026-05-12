(function () {
  //var DEFAULT_API_BASE = "http://localhost:5000/api";
  var DEFAULT_API_BASE = "https://atlas-7uvm.onrender.com/api";
  var raw =
    typeof window.ATLAS_API_BASE === "string"
      ? window.ATLAS_API_BASE.trim()
      : "";
  window.ATLAS_API_BASE = (raw || DEFAULT_API_BASE).replace(/\/+$/, "");

  // Google Maps / Places API key (domain-restricted in Google Console).
  // Set this to your real key to enable autocomplete + map pin rendering.
  var rawGoogleKey =
    typeof window.ATLAS_GOOGLE_MAPS_API_KEY === "string"
      ? window.ATLAS_GOOGLE_MAPS_API_KEY.trim()
      : "";
  window.ATLAS_GOOGLE_MAPS_API_KEY = rawGoogleKey || "AIzaSyDsWCytXlCNUOH0u59QFdY4guSB_fd6Q1E";
})();

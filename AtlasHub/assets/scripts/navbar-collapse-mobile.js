/**
 * Mobile nav: stagger nav-link items when the Bootstrap collapse opens.
 * Avoids opacity animations on .navbar-collapse — fill-mode forwards from slideUp
 * left the panel at opacity 0 after close, so the next open looked broken.
 */
(function () {
  function init() {
    var navbarCollapse = document.querySelector("#navbarSupportedContent");
    if (!navbarCollapse) return;

    function clearCollapseMotion(el) {
      el.style.animation = "";
      el.style.opacity = "";
      el.style.transform = "";
    }

    navbarCollapse.addEventListener("show.bs.collapse", function () {
      clearCollapseMotion(navbarCollapse);
    });

    var navItems = document.querySelectorAll(".navbar-nav .nav-item");
    navbarCollapse.addEventListener("shown.bs.collapse", function () {
      navItems.forEach(function (item, index) {
        item.style.opacity = "0";
        item.style.transform = "translateX(-10px)";
        window.setTimeout(function () {
          item.style.transition = "opacity 0.25s ease, transform 0.25s ease";
          item.style.opacity = "1";
          item.style.transform = "translateX(0)";
        }, index * 50);
      });
    });

    navbarCollapse.addEventListener("hidden.bs.collapse", function () {
      navItems.forEach(function (item) {
        item.style.opacity = "";
        item.style.transform = "";
        item.style.transition = "";
      });
      clearCollapseMotion(navbarCollapse);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

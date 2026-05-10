document.addEventListener("DOMContentLoaded", function () {
  if (typeof AOS !== "undefined") {
    AOS.init({
      duration: 1500,
    });
  }

  const loader = document.querySelector(".my-loader");
  const loaderBody = document.querySelector(".my-loader-body");

  function scrollToHash() {
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.querySelector(hash);
    if (!target) return;
    // Resources page: inactive Bootstrap tab panes are hidden; resource.js shows the tab then scrolls.
    if (
      target.classList.contains("tab-pane") &&
      document.getElementById("myTabContent")?.contains(target)
    ) {
      return;
    }
    const navbar = document.querySelector(".navbar.fixed-top");
    const offset = navbar ? navbar.getBoundingClientRect().height + 12 : 0;
    const top =
      target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: "smooth",
    });
  }

  if (loader && loaderBody) {
    loader.style.display = "flex";
    loaderBody.style.display = "none";

    setTimeout(function () {
      loader.style.display = "none";
      loaderBody.style.display = "block";
      scrollToHash();
    }, 1000);
  } else {
    scrollToHash();
  }

  const scrollToTopBtn = document.getElementById("scrollToTopBtn");
  if (scrollToTopBtn) {
    scrollToTopBtn.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }

  function removeAOSOnMobile() {
    if (window.innerWidth <= 768) {
      document.querySelectorAll("[data-aos]").forEach(function (element) {
        element.removeAttribute("data-aos");
      });
    }
  }

  window.onload = function () {
    removeAOSOnMobile();
  };

  window.onresize = function () {
    removeAOSOnMobile();
  };
});

const delay = 4000; // ms

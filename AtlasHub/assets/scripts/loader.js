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
    if (hash) {
      const target = document.querySelector(hash);
      if (target) {
        const offsetTop = target.offsetTop;
        window.scrollTo({
          top: offsetTop,
          behavior: "smooth",
        });
      }
    }
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

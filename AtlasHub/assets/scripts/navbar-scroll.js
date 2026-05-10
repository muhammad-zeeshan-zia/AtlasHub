/**
 * Progressive navbar transparency on scroll (site-wide). Keeps bar visible.
 */
(function () {
  function updateNavbarScrollState() {
    const nav = document.querySelector("nav.navbar.nav-background");
    if (!nav) return;
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    nav.classList.toggle("nav-background--scrolled", y > 24);
  }

  document.addEventListener("DOMContentLoaded", updateNavbarScrollState);
  window.addEventListener("scroll", updateNavbarScrollState, { passive: true });
})();

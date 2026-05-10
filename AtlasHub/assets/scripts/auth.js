document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = window.ATLAS_API_BASE;
  const authModalEl = document.getElementById("authModal");
  const authOpenBtn = document.getElementById("openAuthModalBtn");
  const authForm = document.getElementById("authModalForm");
  const authEmail = document.getElementById("authModalEmail");
  const authPassword = document.getElementById("authModalPassword");
  const authAdminToggle = document.getElementById("authAdminToggle");
  const authSignupBtn = document.getElementById("authSignupBtn");
  const authSubmitBtn = document.getElementById("authModalSubmitBtn");
  const authNameWrap = document.getElementById("authNameWrap");
  const authName = document.getElementById("authModalName");
  const authMsg = document.getElementById("authModalMsg");
  const authLogoutBtn = document.getElementById("authLogoutBtn");
  const authModalTabsRoot = document.getElementById("authModalTabs");
  const authAdminRow = document.getElementById("authAdminRow");
  const authForgotLink = document.getElementById("authForgotPasswordLink");
  const authFooterHint = document.getElementById("authModalFooterHint");
  const authForgotRow = document.getElementById("authForgotRow");

  if (!authOpenBtn) return;

  const modal =
    authModalEl && window.bootstrap ? new bootstrap.Modal(authModalEl) : null;

  let authActiveTab = "signin";
  let sidebarBackdropEl = null;
  let sidebarEl = null;
  let sidebarLogoutBound = false;

  const escapeHtml = (value) => {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  };

  const userInitials = (name) => {
    if (!name || typeof name !== "string") return "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
    }
    return name.trim().slice(0, 2).toUpperCase() || "?";
  };

  const ensureUserSidebar = () => {
    if (document.getElementById("atlasUserSidebarBackdrop")) {
      sidebarBackdropEl = document.getElementById("atlasUserSidebarBackdrop");
      sidebarEl = document.getElementById("atlasUserSidebar");
      return;
    }

    const backdrop = document.createElement("div");
    backdrop.id = "atlasUserSidebarBackdrop";
    backdrop.className = "atlas-user-sidebar-backdrop";
    backdrop.setAttribute("aria-hidden", "true");

    const aside = document.createElement("aside");
    aside.id = "atlasUserSidebar";
    aside.className = "atlas-user-sidebar";
    aside.setAttribute("aria-hidden", "true");
    aside.setAttribute("aria-label", "Account menu");

    aside.innerHTML = `
      <div class="atlas-user-sidebar-panel">
        <button type="button" class="btn-close atlas-user-sidebar-close" aria-label="Close menu"></button>
        <div class="atlas-user-sidebar-header">
          <div class="atlas-user-sidebar-avatar-lg" id="sidebarUserAvatarLg" aria-hidden="true"></div>
          <p class="atlas-user-sidebar-name" id="sidebarUserName"></p>
          <p class="atlas-user-sidebar-role" id="sidebarUserRole"></p>
        </div>
        <button type="button" class="atlas-user-sidebar-logout" id="sidebarLogoutBtn">Log out</button>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(aside);

    sidebarBackdropEl = backdrop;
    sidebarEl = aside;

    backdrop.addEventListener("click", () => closeUserSidebar());

    aside.querySelector(".atlas-user-sidebar-close")?.addEventListener("click", () => closeUserSidebar());

    if (!sidebarLogoutBound) {
      sidebarLogoutBound = true;
      document.body.addEventListener("click", (event) => {
        const logoutBtn = event.target.closest("#sidebarLogoutBtn");
        if (!logoutBtn) return;
        event.preventDefault();
        clearSession();
        refreshAuthButton();
        closeUserSidebar();
      });
    }
  };

  const populateUserSidebar = (session) => {
    ensureUserSidebar();
    const user = session?.user;
    if (!user || !sidebarEl) return;

    const initials = userInitials(user.name);
    const avatarLg = sidebarEl.querySelector("#sidebarUserAvatarLg");
    const nameEl = sidebarEl.querySelector("#sidebarUserName");
    const roleEl = sidebarEl.querySelector("#sidebarUserRole");

    if (avatarLg) avatarLg.textContent = initials;
    if (nameEl) nameEl.textContent = user.name || "";
    if (roleEl) {
      const role = user.role === "admin" ? "Administrator" : "Community member";
      roleEl.textContent = role;
    }
  };

  const openUserSidebar = () => {
    const session = getSession();
    if (!session?.user) return;
    populateUserSidebar(session);
    ensureUserSidebar();
    sidebarBackdropEl?.classList.add("atlas-user-sidebar-open");
    sidebarEl?.classList.add("atlas-user-sidebar-open");
    sidebarBackdropEl?.setAttribute("aria-hidden", "false");
    sidebarEl?.setAttribute("aria-hidden", "false");
    document.body.classList.add("atlas-user-sidebar-no-scroll");
    authOpenBtn.setAttribute("aria-expanded", "true");
  };

  const closeUserSidebar = () => {
    sidebarBackdropEl?.classList.remove("atlas-user-sidebar-open");
    sidebarEl?.classList.remove("atlas-user-sidebar-open");
    sidebarBackdropEl?.setAttribute("aria-hidden", "true");
    sidebarEl?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("atlas-user-sidebar-no-scroll");
    authOpenBtn.setAttribute("aria-expanded", "false");
  };

  const syncAuthModalUi = () => {
    if (!authModalTabsRoot) return;
    const isSignup = authActiveTab === "signup";

    document.querySelectorAll("[data-auth-panel]").forEach((panel) => {
      const match =
        panel.getAttribute("data-auth-panel") === (isSignup ? "signup" : "signin");
      panel.classList.toggle("d-none", !match);
    });

    authModalTabsRoot.querySelectorAll("[data-auth-tab]").forEach((btn) => {
      const tab = btn.getAttribute("data-auth-tab");
      const active = tab === authActiveTab;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    if (authNameWrap) {
      if (isSignup) authNameWrap.classList.remove("d-none");
      else authNameWrap.classList.add("d-none");
    }

    if (authAdminRow) authAdminRow.classList.toggle("d-none", isSignup);

    if (authForgotRow) authForgotRow.classList.toggle("d-none", isSignup);

    if (authSubmitBtn) authSubmitBtn.classList.toggle("d-none", isSignup);

    if (authSignupBtn) {
      if (isSignup) authSignupBtn.classList.remove("d-none");
      else authSignupBtn.classList.add("d-none");
    }

    if (authFooterHint) {
      authFooterHint.textContent = isSignup
        ? "Already have an account? Use Sign In above."
        : "Don't have an account? Use the tab above to create one.";
    }
  };

  const getSession = () => {
    try {
      return JSON.parse(localStorage.getItem("atlasAuth") || "null");
    } catch (_error) {
      return null;
    }
  };

  const emitAuthChange = () => {
    window.dispatchEvent(new CustomEvent("atlas-auth-changed"));
  };

  const setSession = (session) => {
    localStorage.setItem("atlasAuth", JSON.stringify(session));
    emitAuthChange();
  };

  const clearSession = () => {
    localStorage.removeItem("atlasAuth");
    emitAuthChange();
  };

  const syncAdminReviewNav = () => {
    const session = getSession();
    const show = session?.user?.role === "admin";
    document.querySelectorAll("[data-admin-review-nav]").forEach((el) => {
      el.classList.toggle("d-none", !show);
    });
  };

  const refreshAuthButton = () => {
    const session = getSession();
    authLogoutBtn?.classList.add("d-none");

    if (session?.user) {
      const initials = escapeHtml(userInitials(session.user.name));
      const safeName = escapeHtml(session.user.name);
      authOpenBtn.classList.add("atlas-auth-chip-btn");
      authOpenBtn.innerHTML = `<span class="atlas-nav-avatar" aria-hidden="true">${initials}</span><span class="atlas-nav-name">${safeName}</span>`;
      authOpenBtn.setAttribute(
        "aria-label",
        `Open account menu for ${session.user.name}`
      );
      authOpenBtn.setAttribute("aria-expanded", "false");
      authOpenBtn.setAttribute("aria-haspopup", "dialog");
    } else {
      authOpenBtn.classList.remove("atlas-auth-chip-btn");
      authOpenBtn.textContent = "Login";
      authOpenBtn.removeAttribute("aria-label");
      authOpenBtn.removeAttribute("aria-expanded");
      authOpenBtn.removeAttribute("aria-haspopup");
      closeUserSidebar();
    }

    syncAdminReviewNav();
  };

  const setMsg = (message, isError = false) => {
    if (!authMsg) return;
    authMsg.textContent = message;
    authMsg.style.color = isError ? "#b42318" : "#17613a";
  };

  authOpenBtn.addEventListener("click", () => {
    const session = getSession();
    if (session?.user) {
      if (sidebarEl?.classList.contains("atlas-user-sidebar-open")) {
        closeUserSidebar();
      } else {
        openUserSidebar();
      }
      return;
    }

    setMsg("");
    if (authModalTabsRoot) {
      authActiveTab = "signin";
      syncAuthModalUi();
    }
    modal?.show();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebarEl?.classList.contains("atlas-user-sidebar-open")) {
      closeUserSidebar();
    }
  });

  authForgotLink?.addEventListener("click", (event) => {
    event.preventDefault();
  });

  authModalTabsRoot?.querySelectorAll("[data-auth-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-auth-tab");
      if (!tab || tab === authActiveTab) return;
      authActiveTab = tab === "signup" ? "signup" : "signin";
      setMsg("");
      syncAuthModalUi();
    });
  });

  if (authModalTabsRoot) syncAuthModalUi();

  authAdminToggle?.addEventListener("change", () => {
    if (authModalTabsRoot) syncAuthModalUi();
    else {
      const isAdmin = authAdminToggle.checked;
      if (authNameWrap) authNameWrap.classList.toggle("d-none", isAdmin);
      if (authSignupBtn) authSignupBtn.classList.toggle("d-none", isAdmin);
    }
  });

  if (authForm) {
    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (authModalTabsRoot && authActiveTab === "signup") {
        authSignupBtn?.click();
        return;
      }
      try {
        const payload = {
          email: authEmail.value.trim(),
          password: authPassword.value,
          role: authAdminToggle.checked ? "admin" : "user"
        };

        const response = await fetch(`${API_BASE}/users/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Login failed.");

        setSession(data);
        refreshAuthButton();
        setMsg("Login successful.");
        setTimeout(() => modal?.hide(), 500);
      } catch (error) {
        setMsg(error.message, true);
      }
    });
  }

  authSignupBtn?.addEventListener("click", async () => {
    try {
      const response = await fetch(`${API_BASE}/users/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authName?.value?.trim(),
          email: authEmail.value.trim(),
          password: authPassword.value
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Signup failed.");
      setSession(data);
      refreshAuthButton();
      setMsg("Signup successful.");
      setTimeout(() => modal?.hide(), 500);
    } catch (error) {
      setMsg(error.message, true);
    }
  });

  authLogoutBtn?.addEventListener("click", () => {
    clearSession();
    refreshAuthButton();
    setMsg("Logged out.");
  });

  window.addEventListener("atlas-auth-changed", () => {
    refreshAuthButton();
  });

  refreshAuthButton();
});

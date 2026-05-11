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
  const authMainFields = document.getElementById("authMainFields");
  const authOtpPanel = document.getElementById("authOtpPanel");
  const authForgotPanel = document.getElementById("authForgotPanel");
  const authModalSubtitle = document.getElementById("authModalSubtitle");
  const authOtpTitle = document.getElementById("authOtpTitle");
  const authOtpLead = document.getElementById("authOtpLead");
  const authModalOtp = document.getElementById("authModalOtp");
  const authVerifyOtpBtn = document.getElementById("authVerifyOtpBtn");
  const authResendOtpBtn = document.getElementById("authResendOtpBtn");
  const authOtpBackBtn = document.getElementById("authOtpBackBtn");
  const authForgotStep1 = document.getElementById("authForgotStep1");
  const authForgotStep2 = document.getElementById("authForgotStep2");
  const authForgotEmail = document.getElementById("authForgotEmail");
  const authForgotOtp = document.getElementById("authForgotOtp");
  const authForgotNewPassword = document.getElementById("authForgotNewPassword");
  const authForgotConfirmPassword = document.getElementById("authForgotConfirmPassword");
  const authForgotSendBtn = document.getElementById("authForgotSendBtn");
  const authForgotResetBtn = document.getElementById("authForgotResetBtn");
  const authForgotBackBtn = document.getElementById("authForgotBackBtn");

  if (!authOpenBtn) return;

  const modal =
    authModalEl && window.bootstrap ? new bootstrap.Modal(authModalEl) : null;

  let authActiveTab = "signin";
  let sidebarBackdropEl = null;
  let sidebarEl = null;
  let sidebarLogoutBound = false;

  /** @type {null | 'signup' | 'login'} */
  let otpMode = null;
  /** @type {{ name: string, email: string, password: string } | null} */
  let pendingSignup = null;
  /** @type {{ email: string, password: string, role: string } | null} */
  let pendingLogin = null;

  const defaultSubtitle = "Please sign in or create an account.";

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

  const parseJson = async (response) => {
    try {
      return await response.json();
    } catch (_e) {
      return {};
    }
  };

  const setLoadingState = (button, loadingLabel) => {
    if (!button) return { button, previousLabel: null };
    const previousLabel = button.textContent;
    button.disabled = true;
    button.classList.add("auth-modal-btn-loading");
    if (loadingLabel) button.textContent = loadingLabel;
    return { button, previousLabel };
  };

  const clearLoadingState = ({ button, previousLabel }) => {
    if (!button) return;
    button.disabled = false;
    button.classList.remove("auth-modal-btn-loading");
    if (previousLabel != null) button.textContent = previousLabel;
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

  const showMainAuthView = () => {
    otpMode = null;
    pendingSignup = null;
    pendingLogin = null;
    authMainFields?.classList.remove("d-none");
    authOtpPanel?.classList.add("d-none");
    authForgotPanel?.classList.add("d-none");
    authForgotStep1?.classList.remove("d-none");
    authForgotStep2?.classList.add("d-none");
    if (authModalOtp) authModalOtp.value = "";
    if (authForgotOtp) authForgotOtp.value = "";
    if (authForgotNewPassword) authForgotNewPassword.value = "";
    if (authForgotConfirmPassword) authForgotConfirmPassword.value = "";
    if (authModalSubtitle) authModalSubtitle.textContent = defaultSubtitle;
    authFooterHint?.classList.remove("d-none");
    if (authModalTabsRoot) syncAuthModalUi();
  };

  const showOtpView = (mode, leadText) => {
    otpMode = mode;
    authMainFields?.classList.add("d-none");
    authOtpPanel?.classList.remove("d-none");
    authForgotPanel?.classList.add("d-none");
    if (authOtpTitle) {
      authOtpTitle.textContent =
        mode === "signup" ? "Finish creating your account" : "Verify your sign-in";
    }
    if (authOtpLead) authOtpLead.textContent = leadText || "";
    if (authModalOtp) authModalOtp.value = "";
    authFooterHint?.classList.add("d-none");
    if (authModalSubtitle) {
      authModalSubtitle.textContent = "Enter the code we emailed you.";
    }
  };

  const showForgotView = () => {
    otpMode = null;
    pendingSignup = null;
    pendingLogin = null;
    authMainFields?.classList.add("d-none");
    authOtpPanel?.classList.add("d-none");
    authForgotPanel?.classList.remove("d-none");
    authForgotStep1?.classList.remove("d-none");
    authForgotStep2?.classList.add("d-none");
    if (authForgotEmail && authEmail) {
      authForgotEmail.value = authEmail.value.trim();
    }
    authFooterHint?.classList.add("d-none");
    if (authModalSubtitle) authModalSubtitle.textContent = "Reset your password.";
  };

  const showForgotStep2 = () => {
    authForgotStep1?.classList.add("d-none");
    authForgotStep2?.classList.remove("d-none");
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

    if (authFooterHint && !otpMode && authForgotPanel?.classList.contains("d-none")) {
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

  authModalEl?.addEventListener("hidden.bs.modal", () => {
    showMainAuthView();
    setMsg("");
    authActiveTab = "signin";
    if (authModalTabsRoot) syncAuthModalUi();
  });

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
    showMainAuthView();
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
    setMsg("");
    showForgotView();
  });

  authOtpBackBtn?.addEventListener("click", () => {
    setMsg("");
    showMainAuthView();
  });

  authForgotBackBtn?.addEventListener("click", () => {
    setMsg("");
    if (authForgotStep2 && !authForgotStep2.classList.contains("d-none")) {
      authForgotStep2.classList.add("d-none");
      authForgotStep1?.classList.remove("d-none");
      return;
    }
    showMainAuthView();
  });

  authForgotSendBtn?.addEventListener("click", async () => {
    const loading = setLoadingState(authForgotSendBtn, "Sending code...");
    try {
      const email = authForgotEmail?.value?.trim();
      if (!email) {
        setMsg("Enter your email.", true);
        return;
      }
      const response = await fetch(`${API_BASE}/users/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await parseJson(response);
      if (!response.ok) throw new Error(data.message || "Request failed.");
      setMsg(data.message || "If an account exists, we sent a code.", false);
      showForgotStep2();
    } catch (error) {
      setMsg(error.message, true);
    } finally {
      clearLoadingState(loading);
    }
  });

  authForgotResetBtn?.addEventListener("click", async () => {
    const loading = setLoadingState(authForgotResetBtn, "Updating...");
    try {
      const email = authForgotEmail?.value?.trim();
      const otp = authForgotOtp?.value?.trim();
      const newPassword = authForgotNewPassword?.value || "";
      const confirm = authForgotConfirmPassword?.value || "";
      if (!email || !otp) {
        setMsg("Email and verification code are required.", true);
        return;
      }
      if (newPassword.length < 8) {
        setMsg("Password must be at least 8 characters.", true);
        return;
      }
      if (newPassword !== confirm) {
        setMsg("Passwords do not match.", true);
        return;
      }
      const response = await fetch(`${API_BASE}/users/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await parseJson(response);
      if (!response.ok) throw new Error(data.message || "Reset failed.");
      setMsg(data.message || "Password updated.", false);
      showMainAuthView();
    } catch (error) {
      setMsg(error.message, true);
    } finally {
      clearLoadingState(loading);
    }
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

  authVerifyOtpBtn?.addEventListener("click", async () => {
    const loading = setLoadingState(authVerifyOtpBtn, "Verifying...");
    try {
      const otp = authModalOtp?.value?.trim();
      if (!otp) {
        setMsg("Enter the verification code.", true);
        return;
      }

      if (otpMode === "signup" && pendingSignup) {
        const response = await fetch(`${API_BASE}/users/signup/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: pendingSignup.email,
            otp,
            name: pendingSignup.name,
            password: pendingSignup.password
          })
        });
        const data = await parseJson(response);
        if (!response.ok) throw new Error(data.message || "Verification failed.");
        setSession(data);
        refreshAuthButton();
        setMsg("Account verified. Welcome!");
        showMainAuthView();
        setTimeout(() => modal?.hide(), 600);
        return;
      }

      if (otpMode === "login" && pendingLogin) {
        const response = await fetch(`${API_BASE}/users/login/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: pendingLogin.email,
            otp,
            role: pendingLogin.role
          })
        });
        const data = await parseJson(response);
        if (!response.ok) throw new Error(data.message || "Verification failed.");
        setSession(data);
        refreshAuthButton();
        setMsg("Signed in successfully.");
        showMainAuthView();
        setTimeout(() => modal?.hide(), 500);
        return;
      }

      setMsg("Something went wrong. Go back and try again.", true);
    } catch (error) {
      setMsg(error.message, true);
    } finally {
      clearLoadingState(loading);
    }
  });

  authResendOtpBtn?.addEventListener("click", async () => {
    const loading = setLoadingState(authResendOtpBtn, "Resending...");
    try {
      if (otpMode === "signup" && pendingSignup) {
        const response = await fetch(`${API_BASE}/users/signup/request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: pendingSignup.name,
            email: pendingSignup.email,
            password: pendingSignup.password
          })
        });
        const data = await parseJson(response);
        if (!response.ok) throw new Error(data.message || "Could not resend.");
        setMsg(data.message || "A new code was sent.", false);
        return;
      }

      if (otpMode === "login" && pendingLogin) {
        const response = await fetch(`${API_BASE}/users/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: pendingLogin.email,
            password: pendingLogin.password,
            role: pendingLogin.role
          })
        });
        const data = await parseJson(response);
        if (response.ok && data.token) {
          setSession(data);
          refreshAuthButton();
          setMsg("You are already verified. Signed in.");
          showMainAuthView();
          setTimeout(() => modal?.hide(), 500);
          return;
        }
        if (response.status === 403 && data.needsOtp) {
          setMsg(data.message || "A new code was sent.", false);
          return;
        }
        throw new Error(data.message || "Could not resend.");
      }
    } catch (error) {
      setMsg(error.message, true);
    } finally {
      clearLoadingState(loading);
    }
  });

  if (authForm) {
    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (authModalTabsRoot && authActiveTab === "signup") {
        authSignupBtn?.click();
        return;
      }
      const loading = setLoadingState(authSubmitBtn, "Signing in...");
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
        const data = await parseJson(response);

        if (response.status === 403 && data.needsOtp) {
          pendingLogin = {
            email: payload.email,
            password: payload.password,
            role: payload.role
          };
          showOtpView(
            "login",
            data.message ||
              "Enter the verification code we sent to your email to finish signing in."
          );
          setMsg("", false);
          return;
        }

        if (!response.ok) throw new Error(data.message || "Login failed.");

        setSession(data);
        refreshAuthButton();
        setMsg("Login successful.");
        setTimeout(() => modal?.hide(), 500);
      } catch (error) {
        setMsg(error.message, true);
      } finally {
        clearLoadingState(loading);
      }
    });
  }

  authSignupBtn?.addEventListener("click", async () => {
    const loading = setLoadingState(authSignupBtn, "Creating...");
    try {
      const name = authName?.value?.trim();
      const email = authEmail.value.trim();
      const password = authPassword.value;

      if (!name || !email || !password) {
        setMsg("Name, email, and password are required.", true);
        return;
      }

      const response = await fetch(`${API_BASE}/users/signup/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const data = await parseJson(response);
      if (!response.ok) throw new Error(data.message || "Could not start signup.");

      pendingSignup = { name, email, password };
      showOtpView(
        "signup",
        data.message || "Enter the code we emailed you to activate your account."
      );
      setMsg("", false);
    } catch (error) {
      setMsg(error.message, true);
    } finally {
      clearLoadingState(loading);
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

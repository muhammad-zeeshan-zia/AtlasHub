document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = window.ATLAS_API_BASE;

  function handleDonationReturnFromStripe() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("donation_success") !== "1") return;

    const sessionId = params.get("session_id") || "";
    const modalEl = document.getElementById("donateSuccessModal");
    if (!modalEl || typeof bootstrap === "undefined") return;

    const sessionEl = modalEl.querySelector("[data-donate-success-session]");
    if (sessionEl) {
      sessionEl.textContent =
        sessionId.length > 28 ? `${sessionId.slice(0, 24)}…` : sessionId || "—";
    }

    const loaderPresent = Boolean(document.querySelector(".my-loader"));
    const showDelayMs = loaderPresent ? 1050 : 150;

    window.setTimeout(() => {
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl, {
        backdrop: "static",
        keyboard: false
      });
      modal.show();

      window.setTimeout(() => {
        modal.hide();
        const u = new URL(window.location.href);
        u.search = "";
        u.hash = "#donate";
        history.replaceState(null, "", `${u.pathname}${u.hash}`);

        window.requestAnimationFrame(() => {
          document.getElementById("donate")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        });
      }, 4000);
    }, showDelayMs);
  }

  handleDonationReturnFromStripe();

  const gateEl = document.getElementById("donateGateMessage");
  const activePanel = document.getElementById("donateActivePanel");
  const amountInput = document.getElementById("donateAmountInput");
  const checkoutBtn = document.getElementById("donateCheckoutBtn");
  const msgEl = document.getElementById("donateMsg");

  if (!gateEl || !activePanel || !amountInput || !checkoutBtn) {
    return;
  }

  const getSession = () => {
    try {
      return JSON.parse(localStorage.getItem("atlasAuth") || "null");
    } catch (_error) {
      return null;
    }
  };

  const setMsg = (text, isError = false) => {
    if (!msgEl) return;
    msgEl.textContent = text || "";
    msgEl.classList.toggle("donateMsg--error", Boolean(isError && text));
  };

  const syncDonateUi = () => {
    setMsg("");
    const session = getSession();

    if (!session?.user) {
      gateEl.textContent =
        "Sign in with a community account to donate. Use Login in the navigation bar, then choose Sign In or Create Account.";
      gateEl.classList.remove("d-none");
      activePanel.classList.add("d-none");
      return;
    }

    if (session.user.role !== "user") {
      gateEl.textContent =
        "Donations are limited to community member accounts. Administrator accounts cannot use this donation checkout.";
      gateEl.classList.remove("d-none");
      activePanel.classList.add("d-none");
      return;
    }

    gateEl.classList.add("d-none");
    activePanel.classList.remove("d-none");
  };

  document.querySelectorAll("[data-donate-amt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const raw = btn.getAttribute("data-donate-amt");
      const n = Number(raw);
      if (Number.isFinite(n)) {
        amountInput.value = n.toFixed(2);
      }
      amountInput.focus();
    });
  });

  checkoutBtn.addEventListener("click", async () => {
    setMsg("");
    const session = getSession();

    if (!session?.token || session.user?.role !== "user") {
      syncDonateUi();
      setMsg("Please sign in as a community member to continue.", true);
      return;
    }

    const amount = parseFloat(String(amountInput.value).trim());
    if (!Number.isFinite(amount) || amount < 1) {
      setMsg("Enter a donation of at least $1.00.", true);
      amountInput.focus();
      return;
    }

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Starting checkout…";

    try {
      const response = await fetch(`${API_BASE}/donations/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({ amountUsd: amount })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Could not start checkout.");
      }

      if (!data.url) {
        throw new Error("Checkout URL missing. Check server payment configuration.");
      }

      window.location.assign(data.url);
    } catch (error) {
      setMsg(error.message, true);
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Continue to secure checkout";
    }
  });

  syncDonateUi();
  window.addEventListener("atlas-auth-changed", syncDonateUi);
});

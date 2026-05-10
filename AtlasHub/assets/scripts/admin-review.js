document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = window.ATLAS_API_BASE;

  const listEl = document.getElementById("adminResourceList");
  const emptyEl = document.getElementById("adminEmptyState");
  const msgEl = document.getElementById("adminReviewMsg");
  const tabsContainer = document.querySelector(".admin-review-tabs");
  const tabs = Array.from(document.querySelectorAll(".admin-tab"));

  if (!listEl || !tabsContainer) return;

  const state = {
    currentTab: "pending",
    resources: [],
    loading: false
  };

  const STATUS_META = {
    pending:  { label: "Pending",  icon: "bi-hourglass-split",   badge: "is-pending"  },
    approved: { label: "Approved", icon: "bi-check-circle-fill", badge: "is-approved" },
    rejected: { label: "Rejected", icon: "bi-x-circle-fill",     badge: "is-rejected" }
  };

  const escapeHTML = (value) => {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const parseFiniteCoord = (value) => {
    if (value === null || value === undefined) return NaN;
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    if (typeof value === "string") {
      const t = value.trim();
      if (t === "" || /^null$/i.test(t) || /^undefined$/i.test(t)) return NaN;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  };

  const hasMapCoords = (r) => {
    const lat = parseFiniteCoord(r?.latitude);
    const lng = parseFiniteCoord(r?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng);
  };

  const googleMapsUrl = (lat, lng) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;

  const formatDate = (value) => {
    if (!value) return "";
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric"
      });
    } catch (_e) {
      return "";
    }
  };

  const getSession = () => {
    try {
      return JSON.parse(localStorage.getItem("atlasAuth") || "null");
    } catch (_error) {
      return null;
    }
  };

  const setMsg = (text, kind = "info") => {
    msgEl.textContent = text || "";
    msgEl.classList.remove("is-error", "is-success", "is-info");
    if (!text) return;
    if (kind === "error")   msgEl.classList.add("is-error");
    if (kind === "success") msgEl.classList.add("is-success");
    if (kind === "info")    msgEl.classList.add("is-info");
  };

  const showSkeletons = () => {
    emptyEl.classList.add("d-none");
    listEl.innerHTML = Array.from({ length: 4 })
      .map(() => `<div class="admin-skeleton-card" aria-hidden="true"></div>`)
      .join("");
  };

  const showGate = () => {
    emptyEl.classList.add("d-none");
    listEl.innerHTML = `
      <div class="admin-review-gate" style="grid-column: 1 / -1;">
        <i class="bi bi-shield-lock" aria-hidden="true"></i>
        <h2 class="admin-review-gate-title">Admin login required</h2>
        <p class="admin-review-gate-text">
          Please sign in as an administrator using the Login button in the navbar to review resources.
        </p>
      </div>
    `;
  };

  const updateCounts = (resources) => {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    resources.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status] += 1;
    });
    document.getElementById("countPending").textContent = counts.pending;
    document.getElementById("countApproved").textContent = counts.approved;
    document.getElementById("countRejected").textContent = counts.rejected;
  };

  const renderResources = () => {
    const visible = state.resources.filter((r) => r.status === state.currentTab);

    if (visible.length === 0) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("d-none");
      const meta = STATUS_META[state.currentTab];
      emptyEl.querySelector(".admin-empty-title").textContent =
        `No ${meta.label.toLowerCase()} resources`;
      emptyEl.querySelector(".admin-empty-text").textContent =
        state.currentTab === "pending"
          ? "All caught up — there are no pending submissions to review."
          : `There are no ${meta.label.toLowerCase()} resources right now.`;
      return;
    }

    emptyEl.classList.add("d-none");

    listEl.innerHTML = visible.map((r) => {
      const status = STATUS_META[r.status] || STATUS_META.pending;

      const metaItems = [
        r.phone
          ? `<div class="admin-meta-item">
               <i class="bi bi-telephone" aria-hidden="true"></i>
               <span>${escapeHTML(r.phone)}</span>
             </div>`
          : "",
        r.address
          ? `<div class="admin-meta-item">
               <i class="bi bi-geo-alt" aria-hidden="true"></i>
               <span>${escapeHTML(r.address)}</span>
             </div>`
          : "",
        hasMapCoords(r)
          ? `<div class="admin-meta-item admin-meta-item--map">
               <a class="admin-map-link"
                  href="${googleMapsUrl(parseFiniteCoord(r.latitude), parseFiniteCoord(r.longitude))}"
                  target="_blank"
                  rel="noopener noreferrer">
                 <i class="bi bi-geo-alt-fill" aria-hidden="true"></i>
                 View on map
               </a>
             </div>`
          : "",
        r.website
          ? `<div class="admin-meta-item">
               <i class="bi bi-globe" aria-hidden="true"></i>
               <span><a href="${escapeHTML(r.website)}" target="_blank" rel="noopener noreferrer">${escapeHTML(r.website)}</a></span>
             </div>`
          : "",
        r.hours
          ? `<div class="admin-meta-item">
               <i class="bi bi-clock" aria-hidden="true"></i>
               <span>${escapeHTML(r.hours)}</span>
             </div>`
          : "",
        r.createdAt
          ? `<div class="admin-meta-item">
               <i class="bi bi-calendar-event" aria-hidden="true"></i>
               <span>Submitted ${escapeHTML(formatDate(r.createdAt))}</span>
             </div>`
          : "",
        r.status !== "pending" && r.approvedAt
          ? `<div class="admin-meta-item">
               <i class="bi bi-clock-history" aria-hidden="true"></i>
               <span>${r.status === "approved" ? "Approved" : "Updated"} ${escapeHTML(formatDate(r.approvedAt))}${
                 r.approvedBy?.name ? ` by ${escapeHTML(r.approvedBy.name)}` : ""
               }</span>
             </div>`
          : ""
      ].filter(Boolean).join("");

      const buildBtn = (status, label, icon, mod) => `
        <button type="button"
                class="admin-status-btn admin-status-btn--${mod} ${r.status === status ? "is-current" : ""}"
                data-id="${escapeHTML(r._id)}"
                data-status="${status}"
                ${r.status === status ? "disabled aria-current=\"true\"" : ""}>
          <i class="bi ${icon}" aria-hidden="true"></i>
          ${label}
        </button>
      `;

      return `
        <article class="admin-resource-card" data-id="${escapeHTML(r._id)}">
          <header class="admin-resource-card-head">
            <div class="admin-resource-card-head-text">
              <h3 class="admin-resource-card-title">${escapeHTML(r.orgName)}</h3>
              <span class="admin-resource-card-category">${escapeHTML(r.category)}</span>
            </div>
            <span class="admin-status-badge ${status.badge}">
              <i class="bi ${status.icon}" aria-hidden="true"></i>
              ${status.label}
            </span>
          </header>

          <p class="admin-resource-desc">${escapeHTML(r.description)}</p>

          <div class="admin-resource-meta">${metaItems}</div>

          <div class="admin-status-actions" role="group" aria-label="Change resource status">
            <span class="admin-status-actions-label">Set status</span>
            ${buildBtn("pending",  "Pending",  "bi-hourglass-split",   "pending")}
            ${buildBtn("approved", "Approve",  "bi-check-lg",          "approved")}
            ${buildBtn("rejected", "Reject",   "bi-x-lg",              "rejected")}
          </div>
        </article>
      `;
    }).join("");
  };

  const loadResources = async () => {
    const session = getSession();
    if (!session || session.user?.role !== "admin") {
      showGate();
      ["countPending", "countApproved", "countRejected"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "0";
      });
      setMsg("Sign in as an admin from the navbar to manage resources.", "error");
      return;
    }

    state.loading = true;
    showSkeletons();
    setMsg("Loading resources…", "info");

    try {
      const response = await fetch(`${API_BASE}/admin/resources`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to load resources.");
      }
      state.resources = Array.isArray(data) ? data : [];
      updateCounts(state.resources);
      renderResources();
      setMsg(state.resources.length ? "" : "No resources have been submitted yet.", "info");
    } catch (error) {
      listEl.innerHTML = "";
      setMsg(error.message || "Failed to load resources.", "error");
    } finally {
      state.loading = false;
    }
  };

  const switchTab = (status) => {
    if (!STATUS_META[status]) return;
    state.currentTab = status;
    tabs.forEach((tab) => {
      const isActive = tab.dataset.status === status;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    renderResources();
  };

  const setStatus = async (id, newStatus, btn) => {
    const session = getSession();
    if (!session || session.user?.role !== "admin") {
      setMsg("Admin login required.", "error");
      return;
    }

    if (!STATUS_META[newStatus]) return;

    const card = btn?.closest(".admin-resource-card");
    const prevStatus =
      state.resources.find((r) => r._id === id)?.status || "pending";

    if (newStatus === prevStatus) return;

    if (card) card.style.opacity = "0.6";
    btn?.setAttribute("disabled", "disabled");
    setMsg("Updating status…", "info");

    try {
      const response = await fetch(`${API_BASE}/admin/resources/${id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Action failed.");

      const updated = data.resource;
      const idx = state.resources.findIndex((r) => r._id === id);
      if (idx !== -1 && updated) {
        const existing = state.resources[idx];
        state.resources[idx] = {
          ...existing,
          ...updated
        };
      }

      updateCounts(state.resources);
      renderResources();
      setMsg(`Resource marked as ${STATUS_META[newStatus].label.toLowerCase()}.`, "success");
    } catch (error) {
      if (card) card.style.opacity = "";
      setMsg(error.message || "Action failed.", "error");
    }
  };

  tabsContainer.addEventListener("click", (event) => {
    const tab = event.target.closest(".admin-tab");
    if (!tab) return;
    switchTab(tab.dataset.status);
  });

  listEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".admin-status-btn");
    if (!btn || btn.disabled) return;
    const id = btn.getAttribute("data-id");
    const newStatus = btn.getAttribute("data-status");
    if (!id || !newStatus) return;
    setStatus(id, newStatus, btn);
  });

  loadResources();
});

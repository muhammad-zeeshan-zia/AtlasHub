document.addEventListener("DOMContentLoaded", function () {
  const API_BASE = window.ATLAS_API_BASE;
  const searchInput = document.getElementById("searchInput");
  const tabContent = document.getElementById("myTabContent");
  const navTabs = document.getElementById("resourceTabs");
  const savedResourcesHint = document.getElementById("savedResourcesHint");
  const savedResourcesList = document.getElementById("savedResourcesList");

  if (!searchInput || !tabContent) {
    return;
  }

  const panes = Array.from(tabContent.querySelectorAll(".tab-pane"));
  const categoryToPaneId = {
    Crisis: "crisis",
    "Mental Health": "mental",
    "Affordable Healthcare": "healthcare",
    Housing: "housing",
    Food: "food",
    Transportation: "transportation",
    "Legal Help": "legal",
    "Clothing and Household": "clothing",
    "Family Resources": "family",
    "Home Repair": "homerepair",
    "Libraries and Resources": "libraries",
    "Police Departments": "police",
    Hospitals: "hospital",
    "Victim Support": "victim",
    "Special Needs Services": "specialNeed"
  };

  let approvedResourcesCache = [];
  let savedResourcesCache = [];
  const savedIds = new Set();

  let initialActivePaneId = null;
  panes.forEach((pane) => {
    if (pane.classList.contains("active")) {
      initialActivePaneId = pane.id;
    }
  });

  const getSession = () => {
    try {
      return JSON.parse(localStorage.getItem("atlasAuth") || "null");
    } catch (_error) {
      return null;
    }
  };

  function resetView() {
    panes.forEach((pane) => {
      pane.style.display = "";

      if (pane.id === initialActivePaneId) {
        pane.classList.add("show", "active");
      } else {
        pane.classList.remove("show", "active");
      }

      const cards = pane.querySelectorAll(".resourceCard");
      cards.forEach((card) => {
        card.style.display = "";
        card.classList.remove("search-hit");
      });
    });

    if (navTabs) {
      const links = navTabs.querySelectorAll(".nav-link");
      links.forEach((link) => {
        link.classList.remove("fw-bold", "text-primary");
        const target = link.getAttribute("data-bs-target");
        if (
          target &&
          initialActivePaneId &&
          target === "#" + initialActivePaneId
        ) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      });
    }
  }

  function performFilter() {
    const term = searchInput.value.toLowerCase().trim();

    if (navTabs) {
      navTabs.style.display = term ? "none" : "";
    }

    if (!term) {
      resetView();
      return;
    }

    panes.forEach((pane) => {
      let hasMatch = false;
      const cards = pane.querySelectorAll(".resourceCard");

      cards.forEach((card) => {
        const text = (card.textContent || card.innerText || "").toLowerCase();
        const keywords = (
          card.getAttribute("data-keywords") || ""
        ).toLowerCase();

        const haystack = text + " " + keywords;

        const match = haystack.includes(term);

        card.style.display = match ? "" : "none";
        card.classList.toggle("search-hit", !!match);

        if (match) {
          hasMatch = true;
        }
      });

      const tabBtn = navTabs
        ? navTabs.querySelector('[data-bs-target="#' + pane.id + '"]')
        : null;

      if (hasMatch) {
        pane.style.display = "block";
        pane.classList.add("show");
        if (tabBtn) {
          tabBtn.classList.add("fw-bold", "text-primary");
        }
      } else {
        pane.style.display = "none";
        pane.classList.remove("show", "active");
        if (tabBtn) {
          tabBtn.classList.remove("fw-bold", "text-primary");
        }
      }
    });
  }

  searchInput.addEventListener("input", performFilter);

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const normalizeUrl = (url) => {
    if (!url || url === "N/A") return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  };

  const toPhoneHref = (phone) => (phone || "").replace(/[^\d+]/g, "");
  const toSmsHref = (value) => (value || "").replace(/[^\d+]/g, "");

  /** Coerce API/Mongo JSON values; Number(null) and Number("") are wrongly 0 — reject those. */
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

  /** Driving (etc.) directions from the user's current location to the destination (Google Maps URL API). */
  const googleMapsDirectionsFromHereUrl = (lat, lng, addressFallback) => {
    const dest =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? `${lat},${lng}`
        : String(addressFallback ?? "").trim();
    if (!dest) return "";
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
  };

  const renderSectionContacts = (contacts = []) =>
    contacts
      .map((contact) => {
        const method = contact.method || "phone";
        const actionLabel = contact.actionLabel || "Call";
        const value = contact.value || "";
        const note = contact.note || "";

        if (!value) return "";

        let href = "#";
        let icon = "bi-telephone-fill";
        if (method === "text") {
          href = `sms:${escapeHtml(toSmsHref(value))}`;
          icon = "bi-chat-dots-fill";
        } else if (method === "link") {
          href = escapeHtml(normalizeUrl(value));
          icon = "bi-globe2";
        } else {
          href = `tel:${escapeHtml(toPhoneHref(value))}`;
          icon = "bi-telephone-fill";
        }

        return `
          <div class="formatCard">
            <a class="callButton" href="${href}" ${method === "link" ? 'target="_blank" rel="noopener"' : ""}>
              <i class="bi ${icon}"></i> ${escapeHtml(value)}
            </a>
            ${note ? `<span>— <strong>${escapeHtml(actionLabel)}</strong> ${escapeHtml(note)}</span>` : `<span>— <strong>${escapeHtml(actionLabel)}</strong></span>`}
          </div>
        `;
      })
      .join("");

  const renderStructuredSections = (item) => {
    if (!Array.isArray(item.sections) || !item.sections.length) return "";

    return item.sections
      .map(
        (section) => `
      ${section.heading ? `<p class="sectionTitle underline"><strong>${escapeHtml(section.heading)}</strong></p>` : ""}
      ${renderSectionContacts(section.contacts || [])}
      ${section.footerNote ? `<div class="smallLine">${escapeHtml(section.footerNote)}</div>` : ""}
    `
      )
      .join("");
  };

  const createDynamicResourceCard = (item, listKind = "category") => {
    const wrapper = document.createElement("div");
    wrapper.className =
      listKind === "saved"
        ? "resourceCard resource-card user-saved-listing"
        : "resourceCard resource-card user-submitted-card";

    const rid = item._id ? String(item._id) : "";
    if (rid) {
      wrapper.setAttribute("data-resource-id", rid);
    }

    const sectionKeywordText = Array.isArray(item.sections)
      ? item.sections
        .map((section) => {
          const contactText = Array.isArray(section.contacts)
            ? section.contacts.map((contact) => `${contact.value || ""} ${contact.note || ""}`).join(" ")
            : "";
          return `${section.heading || ""} ${section.footerNote || ""} ${contactText}`;
        })
        .join(" ")
      : "";
    wrapper.setAttribute("data-keywords", `${item.keywords || ""} ${sectionKeywordText} ${item.orgName || ""}`.trim());

    const websiteUrl = normalizeUrl(item.website);
    const websiteText = (item.website || "").replace(/^https?:\/\//i, "");
    const hasPhone = item.phone && item.phone !== "N/A";
    const hasAddress = item.address && item.address !== "N/A";
    const hasHours = item.hours && item.hours !== "N/A";
    const hasContactNote = item.contactNote && item.contactNote !== "N/A";
    const contactAction = item.contactAction || "Call";
    const hasStructuredSections = Array.isArray(item.sections) && item.sections.length > 0;

    const session = getSession();
    // Bookmark/Save button disabled (requested).
    // const showBookmark = Boolean(rid && session?.token);
    // const bookmarkSaved = rid && savedIds.has(rid);
    // const bookmarkHtml = showBookmark
    //   ? `<button type="button"
    //       class="resource-bookmark-btn"
    //       data-resource-id="${escapeHtml(rid)}"
    //       aria-label="${bookmarkSaved ? "Remove saved resource" : "Save resource"}"
    //       aria-pressed="${bookmarkSaved ? "true" : "false"}"
    //       title="${bookmarkSaved ? "Saved — click to remove" : "Save resource"}">
    //       <i class="bi ${bookmarkSaved ? "bi-bookmark-fill" : "bi-bookmark"}" aria-hidden="true"></i>
    //     </button>`
    //   : "";
    const bookmarkHtml = "";

    const mapLat = parseFiniteCoord(item.latitude);
    const mapLng = parseFiniteCoord(item.longitude);
    const mapsHref = hasAddress ? googleMapsDirectionsFromHereUrl(mapLat, mapLng, item.address) : "";

    wrapper.innerHTML = `
      <div class="cardHeaderBand resource-card-head-row">
        <h1 class="resourceCardTitle">${escapeHtml(item.orgName)}</h1>
        ${bookmarkHtml}
      </div>
      <div class="cardBody">
        <p class="resourceCardDesc">${escapeHtml(item.description)}</p>
        ${hasStructuredSections ? renderStructuredSections(item) : ""}
        ${hasAddress && mapsHref
        ? `<div class="formatCard">
                <a class="addressFormat resource-address-maps-link"
                  href="${escapeHtml(mapsHref)}"
                  target="_blank"
                  rel="noopener noreferrer">
                  <i class="bi bi-geo-alt" aria-hidden="true"></i> ${escapeHtml(item.address)}
                </a>
              </div>`
        : hasAddress
          ? `<div class="formatCard">
                <span class="addressFormat">
                  <i class="bi bi-geo-alt" aria-hidden="true"></i> ${escapeHtml(item.address)}
                </span>
              </div>`
          : ""
      }
        ${!hasStructuredSections && hasPhone
        ? `<div class="formatCard">
                <a class="callButton" href="tel:${escapeHtml(toPhoneHref(item.phone))}">
                  <i class="bi bi-telephone-fill"></i> ${escapeHtml(item.phone)}
                </a>
                ${hasContactNote
          ? `<span>— <strong>${escapeHtml(contactAction)}</strong> ${escapeHtml(item.contactNote)}</span>`
          : `<span>— <strong>${escapeHtml(contactAction)}</strong></span>`
        }
              </div>`
        : ""
      }
        ${hasHours
        ? `<div class="smallLine mt-2"><strong>Hours:</strong> ${escapeHtml(item.hours)}</div>`
        : ""
      }
        ${websiteUrl
        ? `<div class="websiteRow mt-3">
                <span class="websiteLink"><i class="bi bi-globe2"></i> Website:</span>
                <a class="resourceCardLink" href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener">
                  ${escapeHtml(websiteText)}
                </a>
              </div>`
        : ""
      }
      </div>
    `;

    return wrapper;
  };

  const clearCategoryDynamicCards = () => {
    tabContent.querySelectorAll(".user-submitted-card").forEach((card) => card.remove());
  };

  const renderSavedPane = () => {
    if (!savedResourcesHint || !savedResourcesList) return;

    const session = getSession();
    savedResourcesList.innerHTML = "";

    if (!session?.token) {
      savedResourcesHint.classList.remove("d-none");
      savedResourcesHint.textContent =
        "Sign in with Login in the navigation bar to bookmark community-submitted resources and view them here.";
      return;
    }

    if (!savedResourcesCache.length) {
      savedResourcesHint.classList.remove("d-none");
      savedResourcesHint.textContent =
        "No saved resources yet. Open any category tab and tap the bookmark on a community-submitted listing.";
      return;
    }

    savedResourcesHint.classList.add("d-none");
    savedResourcesCache.forEach((item) => {
      savedResourcesList.appendChild(createDynamicResourceCard(item, "saved"));
    });
  };

  const refreshSavedBookmarks = async () => {
    const session = getSession();
    savedIds.clear();
    savedResourcesCache = [];

    if (!session?.token) {
      renderSavedPane();
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/users/me/saved-resources`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data.message || "Could not load saved resources.");
      }
      savedResourcesCache = Array.isArray(data) ? data : [];
      savedResourcesCache.forEach((r) => {
        if (r._id) savedIds.add(String(r._id));
      });
    } catch (error) {
      console.error(error.message || error);
    }

    renderSavedPane();
  };

  const renderApprovedResourcesIntoTabs = (resources) => {
    clearCategoryDynamicCards();
    resources.forEach((item) => {
      const paneId = categoryToPaneId[item.category];
      if (!paneId) return;
      const targetPane = document.getElementById(paneId);
      if (!targetPane) return;
      targetPane.prepend(createDynamicResourceCard(item, "category"));
    });
  };

  const loadApprovedResources = async () => {
    try {
      const response = await fetch(`${API_BASE}/resources/approved`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load approved resources.");
      }
      approvedResourcesCache = Array.isArray(data) ? data : [];
      renderApprovedResourcesIntoTabs(approvedResourcesCache);
    } catch (error) {
      console.error(error.message);
    }
  };

  const syncBookmarkUiForId = (resourceId, isSaved) => {
    const esc =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(resourceId)
        : resourceId;
    tabContent.querySelectorAll(`[data-resource-id="${esc}"]`).forEach((root) => {
      const btn = root.classList.contains("resource-bookmark-btn")
        ? root
        : root.querySelector(".resource-bookmark-btn");
      if (!btn) return;
      btn.setAttribute("aria-pressed", isSaved ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        isSaved ? "Remove saved resource" : "Save resource"
      );
      btn.title = isSaved ? "Saved — click to remove" : "Save resource";
      const icon = btn.querySelector("i");
      if (icon) {
        icon.classList.toggle("bi-bookmark-fill", isSaved);
        icon.classList.toggle("bi-bookmark", !isSaved);
      }
    });
  };

  // Bookmark/Save click handler disabled (requested).
  // tabContent.addEventListener("click", async (event) => {
  //   const btn = event.target.closest(".resource-bookmark-btn");
  //   if (!btn) return;
  //
  //   const session = getSession();
  //   if (!session?.token) return;
  //
  //   const resourceId = btn.getAttribute("data-resource-id");
  //   if (!resourceId) return;
  //
  //   event.preventDefault();
  //
  //   const wasSaved = savedIds.has(resourceId);
  //   btn.disabled = true;
  //
  //   try {
  //     if (wasSaved) {
  //       const response = await fetch(`${API_BASE}/users/me/saved-resources/${resourceId}`, {
  //         method: "DELETE",
  //         headers: { Authorization: `Bearer ${session.token}` }
  //       });
  //       const data = await response.json().catch(() => ({}));
  //       if (!response.ok) {
  //         throw new Error(data.message || "Could not remove saved resource.");
  //       }
  //       savedIds.delete(resourceId);
  //       savedResourcesCache = savedResourcesCache.filter((r) => String(r._id) !== resourceId);
  //       syncBookmarkUiForId(resourceId, false);
  //       btn.closest(".user-saved-listing")?.remove();
  //       renderSavedPane();
  //     } else {
  //       const response = await fetch(`${API_BASE}/users/me/saved-resources`, {
  //         method: "POST",
  //         headers: {
  //           Authorization: `Bearer ${session.token}`,
  //           "Content-Type": "application/json"
  //         },
  //         body: JSON.stringify({ resourceId })
  //       });
  //       const data = await response.json().catch(() => ({}));
  //       if (!response.ok) {
  //         throw new Error(data.message || "Could not save resource.");
  //       }
  //       savedIds.add(resourceId);
  //       const fromList =
  //         approvedResourcesCache.find((r) => String(r._id) === resourceId) || data.resource;
  //       if (fromList && !savedResourcesCache.some((r) => String(r._id) === resourceId)) {
  //         savedResourcesCache.unshift(fromList);
  //       }
  //       syncBookmarkUiForId(resourceId, true);
  //       renderSavedPane();
  //     }
  //   } catch (error) {
  //     console.error(error.message || error);
  //     alert(error.message || "Something went wrong.");
  //   } finally {
  //     btn.disabled = false;
  //   }
  // });

  const bootstrapResources = async () => {
    await refreshSavedBookmarks();
    await loadApprovedResources();
    renderSavedPane();
  };

  function scrollPaneBelowFixedNavbar(pane) {
    if (!pane) return;
    const navbar = document.querySelector(".navbar.fixed-top");
    const gap = 12;
    const offset = navbar ? navbar.getBoundingClientRect().height + gap : 96;
    const run = () => {
      const top = pane.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }

  function activateResourceTabFromHash() {
    const hash = (window.location.hash || "").replace(/^#/, "").trim();
    if (!hash) return;
    const pane = document.getElementById(hash);
    if (!pane || !pane.classList.contains("tab-pane")) return;
    const esc =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(hash)
        : hash;
    const trigger = document.querySelector(`button[data-bs-target="#${esc}"]`);
    if (trigger && typeof bootstrap !== "undefined" && bootstrap.Tab) {
      const tab = bootstrap.Tab.getOrCreateInstance(trigger);
      trigger.addEventListener(
        "shown.bs.tab",
        () => scrollPaneBelowFixedNavbar(pane),
        { once: true }
      );
      tab.show();
    } else {
      scrollPaneBelowFixedNavbar(pane);
    }
  }

  activateResourceTabFromHash();
  window.addEventListener("hashchange", activateResourceTabFromHash);

  bootstrapResources();

  window.addEventListener("atlas-auth-changed", () => {
    bootstrapResources();
  });
});

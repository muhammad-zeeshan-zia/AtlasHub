document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.ATLAS_API_BASE;
  const form = document.getElementById('resourceSubmitForm');
  const msg = document.getElementById('formMsg');
  const clearBtn = document.getElementById('clearFormBtn');
  const confirm = document.getElementById('confirm');
  const submitBtn = form.querySelector('button[type="submit"]');
  const contactSections = document.getElementById('contactSections');
  const addSectionBtn = document.getElementById('addSectionBtn');
  const latInput = document.getElementById('resourceLatitude');
  const lngInput = document.getElementById('resourceLongitude');
  const mapEl = document.getElementById('resourceLocationMap');
  const clearMapPinBtn = document.getElementById('clearMapPinBtn');

  const ADMIN_EDIT_RESOURCE_ID = (() => {
    try {
      const path = window.location.pathname || '';
      if (!/admin-edit-resource\.html/i.test(path)) return '';
      const id = new URLSearchParams(window.location.search || '').get('id');
      return (id || '').trim();
    } catch (_e) {
      return '';
    }
  })();
  const isAdminEdit = Boolean(ADMIN_EDIT_RESOURCE_ID);

  const getSession = () => {
    try {
      return JSON.parse(localStorage.getItem('atlasAuth') || 'null');
    } catch (_error) {
      return null;
    }
  };

  const escapeHtmlAttr = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const displayOptionalField = (value) => {
    if (value === null || value === undefined) return '';
    const s = String(value).trim();
    if (s === '' || s === 'N/A') return '';
    return s;
  };

  let resourceMap = null;
  let resourceMarker = null;
  let resourceAutocomplete = null;
  let resourceGeocoder = null;
  let googleRef = null;

  const DEFAULT_MAP_CENTER = { lat: 39.96, lng: -75.75 };
  const DEFAULT_MAP_ZOOM = 10;

  const clearResourceMapPin = () => {
    if (latInput) latInput.value = '';
    if (lngInput) lngInput.value = '';
    if (resourceMarker) {
      resourceMarker.setMap(null);
      resourceMarker = null;
    }
    if (resourceMap) {
      resourceMap.setCenter(DEFAULT_MAP_CENTER);
      resourceMap.setZoom(DEFAULT_MAP_ZOOM);
    }
  };

  const syncMapCoords = (lat, lng) => {
    if (!latInput || !lngInput) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    latInput.value = Number(lat).toFixed(6);
    lngInput.value = Number(lng).toFixed(6);
  };

  const setResourcePin = (lat, lng, { centerMap = true } = {}) => {
    if (!resourceMap) return;

    const position = { lat: Number(lat), lng: Number(lng) };
    syncMapCoords(position.lat, position.lng);

    if (!resourceMarker) {
      resourceMarker = new googleRef.maps.Marker({
        position,
        map: resourceMap,
        draggable: true
      });

      resourceMarker.addListener('dragend', () => {
        const pos = resourceMarker?.getPosition();
        if (!pos) return;
        syncMapCoords(pos.lat(), pos.lng());
      });
    } else {
      resourceMarker.setPosition(position);
    }

    if (centerMap) {
      resourceMap.panTo(position);
    }
  };

  const loadGoogleMaps = ({ apiKey, libraries = [] }) => {
    if (window.google?.maps) return Promise.resolve(window.google);
    if (window.__atlasGoogleMapsPromise) return window.__atlasGoogleMapsPromise;

    window.__atlasGoogleMapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const libs = libraries.length ? `&libraries=${encodeURIComponent(libraries.join(','))}` : '';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}${libs}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Failed to load Google Maps API.'));
      document.head.appendChild(script);
    });

    return window.__atlasGoogleMapsPromise;
  };

  const initAtlasResourceLocationMap = async () => {
    if (!mapEl || !window.ATLAS_GOOGLE_MAPS_API_KEY) return;
    if (window.ATLAS_GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') return;

    const google = await loadGoogleMaps({
      apiKey: window.ATLAS_GOOGLE_MAPS_API_KEY,
      libraries: ['places']
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(err);
      return null;
    });

    if (!google?.maps) return;

    googleRef = google;
    resourceGeocoder = new google.maps.Geocoder();

    resourceMap = new google.maps.Map(mapEl, {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      mapTypeControl: false
    });

    resourceMap.addListener('click', (e) => {
      const lat = e?.latLng?.lat?.();
      const lng = e?.latLng?.lng?.();
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setResourcePin(lat, lng, { centerMap: true });
    });

    const addressInput = document.getElementById('address');
    if (addressInput && google.maps.places?.Autocomplete) {
      resourceAutocomplete = new google.maps.places.Autocomplete(addressInput, {
        types: ['address'],
        fields: ['geometry', 'formatted_address']
      });

      resourceAutocomplete.addListener('place_changed', () => {
        const place = resourceAutocomplete?.getPlace?.();
        const loc = place?.geometry?.location;
        if (!loc) return;

        const lat = loc.lat();
        const lng = loc.lng();
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        if (place.formatted_address) addressInput.value = place.formatted_address;
        setResourcePin(lat, lng, { centerMap: true });
      });
    }

    // Optional: if the user types an address and leaves the field,
    // geocode it and place the pin (autocomplete already handles click selection).
    if (addressInput && resourceGeocoder) {
      let geocodeBusy = false;
      const tryGeocodeTypedAddress = () => {
        if (geocodeBusy) return;
        const typed = (addressInput.value || "").trim();
        if (!typed) return;

        const latExisting = (latInput?.value || "").trim();
        const lngExisting = (lngInput?.value || "").trim();
        if (latExisting && lngExisting) return;

        geocodeBusy = true;
        resourceGeocoder.geocode({ address: typed }, (results, status) => {
          geocodeBusy = false;
          if (status !== "OK" || !Array.isArray(results) || !results[0]?.geometry?.location) return;

          const loc = results[0].geometry.location;
          setResourcePin(loc.lat(), loc.lng(), { centerMap: true });
        });
      };

      addressInput.addEventListener("keydown", (ev) => {
        if (ev.key !== "Enter") return;
        ev.preventDefault();
        tryGeocodeTypedAddress();
      });

      addressInput.addEventListener("blur", () => {
        // Delay slightly so place selection (autocomplete) can update coords first.
        setTimeout(tryGeocodeTypedAddress, 150);
      });
    }
  };

  clearMapPinBtn?.addEventListener('click', clearResourceMapPin);

  if (!form) return;

  /** Recalculate AOS positions after layout height changes (e.g. removing a contact section). */
  const refreshAOS = () => {
    if (typeof AOS === 'undefined') return;
    requestAnimationFrame(() => {
      if (typeof AOS.refreshHard === 'function') {
        AOS.refreshHard();
      } else if (typeof AOS.refresh === 'function') {
        AOS.refresh();
      }
    });
  };

  const createContactRowHtml = (contact = {}) => `
    <div class="contact-row border rounded p-2 mb-2">
      <div class="row g-2">
        <div class="col-md-2">
          <select class="formInput contact-method">
            <option value="phone" ${contact.method === 'phone' ? 'selected' : ''}>Phone</option>
            <option value="text" ${contact.method === 'text' ? 'selected' : ''}>Text</option>
            <option value="link" ${contact.method === 'link' ? 'selected' : ''}>Link</option>
          </select>
        </div>
        <div class="col-md-2">
          <input class="formInput contact-action-label" type="text" placeholder="Call / Text" value="${escapeHtmlAttr(contact.actionLabel || '')}">
        </div>
        <div class="col-md-3">
          <input class="formInput contact-value" type="text" placeholder="Number or URL" value="${escapeHtmlAttr(contact.value || '')}">
        </div>
        <div class="col-md-4">
          <input class="formInput contact-note" type="text" placeholder="Note after dash" value="${escapeHtmlAttr(contact.note || '')}">
        </div>
        <div class="col-md-1 d-grid">
          <button type="button" class="btn btn-outline-danger remove-contact-btn">x</button>
        </div>
      </div>
    </div>
  `;

  const addSection = (section = {}) => {
    if (!contactSections) return;

    const sectionBlock = document.createElement('div');
    sectionBlock.className = 'section-block border rounded p-3';
    sectionBlock.innerHTML = `
      <div class="row g-2 mb-2">
        <div class="col-md-8">
          <input class="formInput section-heading" type="text" placeholder="Section heading (bold line)" value="${escapeHtmlAttr(section.heading || '')}">
        </div>
        <div class="col-md-4 d-grid">
          <button type="button" class="btn btn-outline-danger remove-section-btn">Remove Section</button>
        </div>
      </div>
      <div class="contact-rows"></div>
      <button type="button" class="btn btn-outline-primary btn-sm add-contact-btn mb-2">Add Contact Row</button>
      <input class="formInput section-footer-note" type="text" placeholder="Footer note below rows (optional)" value="${escapeHtmlAttr(section.footerNote || '')}">
    `;

    const rowsContainer = sectionBlock.querySelector('.contact-rows');
    const contacts = Array.isArray(section.contacts) && section.contacts.length ? section.contacts : [{}];
    contacts.forEach((contact) => {
      rowsContainer.insertAdjacentHTML('beforeend', createContactRowHtml(contact));
    });

    contactSections.appendChild(sectionBlock);
  };

  const populateFormFromResource = (r) => {
    const org = document.getElementById('orgName');
    if (org) org.value = r.orgName != null ? String(r.orgName) : '';

    const cat = document.getElementById('category');
    if (cat) {
      const val = (r.category || '').trim();
      let matched = false;
      Array.from(cat.options).forEach((opt) => {
        const isMatch = opt.value === val;
        opt.selected = isMatch;
        if (isMatch) matched = true;
      });
      if (val && !matched) {
        cat.add(new Option(val, val, true, true));
      }
    }

    const web = document.getElementById('website');
    if (web) web.value = displayOptionalField(r.website);

    const phoneEl = document.getElementById('phone');
    if (phoneEl) phoneEl.value = displayOptionalField(r.phone);

    const addr = document.getElementById('address');
    if (addr) addr.value = displayOptionalField(r.address);

    const latN = typeof r.latitude === 'number' ? r.latitude : Number(r.latitude);
    const lngN = typeof r.longitude === 'number' ? r.longitude : Number(r.longitude);
    if (latInput && lngInput) {
      if (Number.isFinite(latN) && Number.isFinite(lngN)) {
        latInput.value = latN.toFixed(6);
        lngInput.value = lngN.toFixed(6);
      } else {
        latInput.value = '';
        lngInput.value = '';
      }
    }

    const desc = document.getElementById('description');
    if (desc) desc.value = r.description != null ? String(r.description) : '';

    const hours = document.getElementById('hours');
    if (hours) hours.value = displayOptionalField(r.hours);

    const kw = document.getElementById('keywords');
    if (kw) kw.value = r.keywords != null ? String(r.keywords) : '';

    if (contactSections) {
      contactSections.innerHTML = '';
      const sections = Array.isArray(r.sections) && r.sections.length ? r.sections : [];
      if (sections.length) {
        sections.forEach((sec) =>
          addSection({
            heading: sec.heading || '',
            footerNote: sec.footerNote || '',
            contacts: Array.isArray(sec.contacts) && sec.contacts.length ? sec.contacts : [{}]
          })
        );
      }
      refreshAOS();
    }

    if (confirm) confirm.checked = true;
  };

  function showMessage(type, html) {
    msg.className = `formMsg ${type === 'success' ? 'formMsgSuccess' : 'formMsgError'}`;
    msg.innerHTML = `
      <div class="addressFormat" style="display:inline-block;">
        ${html}
      </div>
    `;
  }

  function setInvalid(el, invalid) {
    if (!el) return;

    if (invalid) {
      el.setAttribute('aria-invalid', 'true');
      el.style.borderColor = 'rgba(180, 30, 30, 0.45)';
      el.style.boxShadow = '0 0 0 4px rgba(180, 30, 30, 0.12)';
    } else {
      el.removeAttribute('aria-invalid');
      el.style.borderColor = '';
      el.style.boxShadow = '';
    }
  }

  form.addEventListener('input', e => setInvalid(e.target, false));
  form.addEventListener('change', e => setInvalid(e.target, false));

  clearBtn?.addEventListener('click', () => {
    form.reset();
    clearResourceMapPin();
    msg.textContent = '';
    msg.className = 'formMsg';
    form.querySelectorAll('input, select, textarea').forEach(el => setInvalid(el, false));
    if (contactSections) {
      contactSections.innerHTML = '';
    }
    refreshAOS();
  });

  addSectionBtn?.addEventListener('click', () => {
    addSection();
    refreshAOS();
  });

  contactSections?.addEventListener('click', (event) => {
    if (event.target.closest('.remove-section-btn')) {
      event.target.closest('.section-block')?.remove();
      refreshAOS();
      return;
    }

    if (event.target.closest('.add-contact-btn')) {
      const sectionBlock = event.target.closest('.section-block');
      const rowsContainer = sectionBlock?.querySelector('.contact-rows');
      rowsContainer?.insertAdjacentHTML('beforeend', createContactRowHtml({}));
      refreshAOS();
      return;
    }

    if (event.target.closest('.remove-contact-btn')) {
      event.target.closest('.contact-row')?.remove();
      refreshAOS();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    form.querySelectorAll('input, select, textarea').forEach(el => setInvalid(el, false));

    // Validation
    if (!form.checkValidity()) {
      const invalidEls = Array.from(form.querySelectorAll('input, select, textarea'))
        .filter(el => !el.checkValidity());

      invalidEls.forEach(el => setInvalid(el, true));
      invalidEls[0]?.focus();

      showMessage(
        'error',
        `<i class="bi bi-exclamation-triangle-fill"></i> Please fill out all required fields before submitting.`
      );
      return;
    }

    if (!confirm?.checked) {
      setInvalid(confirm, true);
      confirm.focus();

      showMessage(
        'error',
        isAdminEdit
          ? `<i class="bi bi-exclamation-triangle-fill"></i> Please confirm the information is accurate before saving.`
          : `<i class="bi bi-exclamation-triangle-fill"></i> Please confirm the information is accurate before submitting.`
      );
      return;
    }

    const latTrim = latInput?.value?.trim() || '';
    const lngTrim = lngInput?.value?.trim() || '';
    let latitude = null;
    let longitude = null;
    if (latTrim || lngTrim) {
      const latN = Number(latTrim);
      const lngN = Number(lngTrim);
      if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
        showMessage(
          'error',
          `<i class="bi bi-exclamation-triangle-fill"></i> Map coordinates look invalid. Clear the pin or click the map again.`
        );
        return;
      }
      latitude = latN;
      longitude = lngN;
    }

    const params = {
      orgName: document.getElementById('orgName').value,
      category: document.getElementById('category').value,
      website: document.getElementById('website').value || 'N/A',
      phone: document.getElementById('phone').value || 'N/A',
      address: document.getElementById('address').value || 'N/A',
      latitude,
      longitude,
  description: document.getElementById('description').value || '',
      hours: document.getElementById('hours').value || 'N/A',
      keywords: document.getElementById('keywords').value || '',
      sections: Array.from(document.querySelectorAll('.section-block')).map((sectionEl) => ({
        heading: sectionEl.querySelector('.section-heading')?.value?.trim() || '',
        footerNote: sectionEl.querySelector('.section-footer-note')?.value?.trim() || '',
        contacts: Array.from(sectionEl.querySelectorAll('.contact-row')).map((rowEl) => ({
          method: rowEl.querySelector('.contact-method')?.value || 'phone',
          actionLabel: rowEl.querySelector('.contact-action-label')?.value?.trim() || 'Call',
          value: rowEl.querySelector('.contact-value')?.value?.trim() || '',
          note: rowEl.querySelector('.contact-note')?.value?.trim() || ''
        })).filter((contact) => contact.value)
      })).filter((section) => section.heading || section.footerNote || section.contacts.length)
    };

    try {
      const session = isAdminEdit ? getSession() : null;
      if (isAdminEdit && (!session?.token || session.user?.role !== 'admin')) {
        showMessage(
          'error',
          `<i class="bi bi-shield-lock"></i> Admin session expired. Sign in again to save changes.`
        );
        return;
      }

      const response = isAdminEdit
        ? await fetch(`${API_BASE}/admin/resources/${ADMIN_EDIT_RESOURCE_ID}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.token}`
            },
            body: JSON.stringify(params)
          })
        : await fetch(`${API_BASE}/resources`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
          });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || (isAdminEdit ? 'Update failed.' : 'Submission failed.'));
      }

      if (isAdminEdit) {
        if (data.resource) {
          populateFormFromResource(data.resource);
        }
        msg.className = 'formMsg formMsgSuccess';
        msg.innerHTML = `
          <div class="addressFormat" style="display:inline-block;">
            <i class="bi bi-check-circle-fill"></i>
            Resource updated successfully.
          </div>
        `;
      } else {
        form.reset();
        clearResourceMapPin();
        if (contactSections) contactSections.innerHTML = '';
        msg.className = 'formMsg formMsgSuccess';
        msg.innerHTML = `
          <div class="addressFormat" style="display:inline-block;">
            <i class="bi bi-check-circle-fill"></i>
            Resource submitted successfully! Waiting for admin approval.
          </div>
        `;
        refreshAOS();
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = isAdminEdit
        ? `<i class="bi bi-check-circle-fill"></i> Saved!`
        : `<i class="bi bi-check-circle-fill"></i> Submitted!`;

      setTimeout(() => {
        if (!submitBtn) return;
        submitBtn.disabled = false;
        submitBtn.innerHTML = isAdminEdit
          ? `<i class="bi bi-check2-circle"></i> Save changes`
          : `<i class="bi bi-send-fill"></i> Submit Resource`;
      }, 2000);
    } catch (error) {
      showMessage('error', `<i class="bi bi-exclamation-triangle-fill"></i> ${error.message}`);
    }
  });

  (async () => {
    if (isAdminEdit) {
      if (submitBtn) {
        submitBtn.innerHTML = `<i class="bi bi-check2-circle"></i> Save changes`;
      }

      const session = getSession();
      if (!session?.token || session.user?.role !== 'admin') {
        showMessage(
          'error',
          `<i class="bi bi-shield-lock"></i> Admin login required. Use Login in the navbar, then open this page again from Admin Review.`
        );
        form.querySelectorAll('input, select, textarea, button').forEach((el) => {
          el.disabled = true;
        });
        return;
      }

      try {
        msg.textContent = 'Loading resource…';
        msg.className = 'formMsg';

        const res = await fetch(`${API_BASE}/admin/resources/${ADMIN_EDIT_RESOURCE_ID}`, {
          headers: { Authorization: `Bearer ${session.token}` }
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || 'Failed to load resource.');
        }

        populateFormFromResource(data);
        msg.textContent = '';
        msg.className = 'formMsg';
      } catch (err) {
        showMessage('error', `<i class="bi bi-exclamation-triangle-fill"></i> ${err.message || 'Failed to load resource.'}`);
        form.querySelectorAll('input, select, textarea, button').forEach((el) => {
          el.disabled = true;
        });
        return;
      }
    }

    await initAtlasResourceLocationMap();

    if (resourceMap && googleRef) {
      const latS = latInput?.value?.trim() || '';
      const lngS = lngInput?.value?.trim() || '';
      if (latS && lngS) {
        const latN = Number(latS);
        const lngN = Number(lngS);
        if (Number.isFinite(latN) && Number.isFinite(lngN)) {
          setResourcePin(latN, lngN, { centerMap: true });
        }
      }
    }
  })();
});
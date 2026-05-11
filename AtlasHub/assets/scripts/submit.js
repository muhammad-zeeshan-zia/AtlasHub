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
          <input class="formInput contact-action-label" type="text" placeholder="Call / Text" value="${contact.actionLabel || ''}">
        </div>
        <div class="col-md-3">
          <input class="formInput contact-value" type="text" placeholder="Number or URL" value="${contact.value || ''}">
        </div>
        <div class="col-md-4">
          <input class="formInput contact-note" type="text" placeholder="Note after dash" value="${contact.note || ''}">
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
          <input class="formInput section-heading" type="text" placeholder="Section heading (bold line)" value="${section.heading || ''}">
        </div>
        <div class="col-md-4 d-grid">
          <button type="button" class="btn btn-outline-danger remove-section-btn">Remove Section</button>
        </div>
      </div>
      <div class="contact-rows"></div>
      <button type="button" class="btn btn-outline-primary btn-sm add-contact-btn mb-2">Add Contact Row</button>
      <input class="formInput section-footer-note" type="text" placeholder="Footer note below rows (optional)" value="${section.footerNote || ''}">
    `;

    const rowsContainer = sectionBlock.querySelector('.contact-rows');
    const contacts = Array.isArray(section.contacts) && section.contacts.length ? section.contacts : [{}];
    contacts.forEach((contact) => {
      rowsContainer.insertAdjacentHTML('beforeend', createContactRowHtml(contact));
    });

    contactSections.appendChild(sectionBlock);
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
      addSection();
    }
  });

  addSectionBtn?.addEventListener('click', () => addSection());

  contactSections?.addEventListener('click', (event) => {
    if (event.target.closest('.remove-section-btn')) {
      event.target.closest('.section-block')?.remove();
      return;
    }

    if (event.target.closest('.add-contact-btn')) {
      const sectionBlock = event.target.closest('.section-block');
      const rowsContainer = sectionBlock?.querySelector('.contact-rows');
      rowsContainer?.insertAdjacentHTML('beforeend', createContactRowHtml({}));
      return;
    }

    if (event.target.closest('.remove-contact-btn')) {
      event.target.closest('.contact-row')?.remove();
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
        `<i class="bi bi-exclamation-triangle-fill"></i> Please confirm the information is accurate before submitting.`
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
      description: document.getElementById('description').value,
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
      const response = await fetch(`${API_BASE}/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Submission failed.');
      }

      form.reset();
      clearResourceMapPin();
      msg.className = 'formMsg formMsgSuccess';
      msg.innerHTML = `
          <div class="addressFormat" style="display:inline-block;">
            <i class="bi bi-check-circle-fill"></i>
            Resource submitted successfully! Waiting for admin approval.
          </div>
        `;

      submitBtn.disabled = true;
      submitBtn.innerHTML = `
          <i class="bi bi-check-circle-fill"></i>
          Submitted!
        `;

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <i class="bi bi-send-fill"></i>
            Submit Resource
          `;
      }, 2000);
    } catch (error) {
      showMessage('error', `<i class="bi bi-exclamation-triangle-fill"></i> ${error.message}`);
    }
  });

  addSection();
  initAtlasResourceLocationMap();
});
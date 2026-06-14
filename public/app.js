/* ═══════════════════════════════════════════════════════════════════════════
   RSVP APP — Client-side JavaScript
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

// ─── Envelope Intro Overlay ───────────────────────────────────────────────────
(function initEnvelope() {
  const overlay   = document.getElementById('env-overlay');
  const topText   = document.getElementById('env-top-text');
  const stage     = document.getElementById('env-stage');
  const envelope  = document.getElementById('envelope');
  const seal      = document.getElementById('env-seal');
  const card      = document.getElementById('env-card');
  const enterBtn  = document.getElementById('env-enter-btn');
  const cta       = document.getElementById('env-cta');
  const skipBtn   = document.getElementById('env-skip');

  if (!overlay) return;

  let opened  = false;
  let leaving = false;

  // Lock body scroll while overlay is active
  document.body.style.overflow = 'hidden';

  // ── Step 1: Animate elements in sequentially ──────────────────────────────
  function animateIn() {
    // Eyebrow text fades up
    setTimeout(() => topText?.classList.add('is-visible'), 350);
    // Envelope stage springs in
    setTimeout(() => stage?.classList.add('is-visible'),   780);
    // "Open your invitation" CTA pulses in
    setTimeout(() => cta?.classList.add('is-visible'),    1450);
  }

  // ── Step 2: Open the envelope ─────────────────────────────────────────────
  function openEnvelope() {
    if (opened || leaving) return;
    opened = true;

    // Start background music as soon as they interact
    if (typeof window.playBackgroundMusic === 'function') window.playBackgroundMusic();

    // Fade the CTA button out
    cta?.classList.remove('is-visible');
    cta?.classList.add('is-fading');

    // Stop the floating animation so it doesn't fight the open transform
    envelope?.classList.add('is-opening');

    // Seal pops/breaks (small spring then vanishes)
    setTimeout(() => seal?.classList.add('is-breaking'), 140);

    // Flap opens: rotateX(-180deg) with perspective — 1.05s transition
    setTimeout(() => envelope?.classList.add('is-open'), 360);

    // Card rises from inside envelope once flap is mostly open (~65% through)
    setTimeout(() => {
      card?.classList.add('is-rising');
      topText?.classList.add('is-open');
      card?.removeAttribute('aria-hidden');
    }, 980);

    // "View Invitation" button appears on card after it has fully risen
    setTimeout(() => {
      enterBtn?.classList.add('is-visible');
      enterBtn?.focus({ preventScroll: true });
    }, 1750);
  }

  // ── Step 3: Exit overlay and reveal the page ──────────────────────────────
  function enterSite() {
    if (leaving) return;
    leaving = true;

    // Start background music (in case they skipped)
    if (typeof window.playBackgroundMusic === 'function') window.playBackgroundMusic();

    // Slide the overlay up (defined in CSS as overlay-leave keyframe)
    overlay?.classList.add('is-leaving');

    // After animation completes, fully remove overlay from layout
    setTimeout(() => {
      overlay.setAttribute('hidden', '');
      overlay.style.display = 'none';
      document.body.style.overflow = '';
      // Move focus to the main RSVP button for keyboard navigation
      document.querySelector('.hero-cta')?.focus({ preventScroll: true });
    }, 980);
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  // Clicking the envelope body itself triggers opening
  envelope?.addEventListener('click', openEnvelope);
  // Or clicking the CTA button below
  cta?.addEventListener('click', openEnvelope);
  // "View Invitation" button on the risen card exits the overlay
  enterBtn?.addEventListener('click', enterSite);
  // Skip button dismisses immediately
  skipBtn?.addEventListener('click', enterSite);
  // ESC key also skips
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !leaving) enterSite();
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  animateIn();
})();

// ─── Hero Parallax Photo ──────────────────────────────────────────────────────
(function initParallax() {
  const photo = document.getElementById('hero-photo');
  const hero  = document.getElementById('hero');
  if (!photo || !hero) return;

  // Respect the user's motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  let lastY   = 0;

  // Parallax depth: 0.4 means photo moves 40% as fast as the page scrolls.
  // This makes the photo feel "deeper" than the content above it.
  const DEPTH = 0.40;

  function applyParallax() {
    const scrollY   = window.scrollY;
    const heroH     = hero.offsetHeight;

    // Only run the effect while the hero is in view
    if (scrollY > heroH) { ticking = false; return; }

    // Positive scrollY → translateY moves photo DOWN relative to page,
    // appearing to scroll slower than the content → classic parallax.
    const offset = scrollY * DEPTH;
    photo.style.transform = `translateY(${offset}px)`;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    lastY = window.scrollY;
    if (!ticking) {
      requestAnimationFrame(applyParallax);
      ticking = true;
    }
  }, { passive: true });

  // Set initial position (in case page is loaded mid-scroll)
  applyParallax();
})();

// ─── Gallery Slider & Lightbox ──────────────────────────────────────────────────
(function initGallery() {
  const track = document.getElementById('gallery-track');
  const lightbox  = document.getElementById('lightbox');
  const lbImg     = document.getElementById('lightbox-img');
  const lbCaption = document.getElementById('lightbox-caption');
  const lbClose   = document.getElementById('lightbox-close');
  const lbPrev    = document.getElementById('lightbox-prev');
  const lbNext    = document.getElementById('lightbox-next');
  if (!track || !lightbox) return;

  // 1. Clone items for seamless CSS looping
  const originalItems = [...track.querySelectorAll('.gallery-item')];
  originalItems.forEach(item => {
    const clone = item.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true'); // Hide clones from screen readers
    track.appendChild(clone);
  });

  // 2. Lightbox Logic (works on both original and cloned items)
  const allItems = [...track.querySelectorAll('.gallery-item')];
  let current = 0;

  function open(index) {
    track.style.animationPlayState = 'paused'; // Pause the marquee
    current = ((index % allItems.length) + allItems.length) % allItems.length;
    const img = allItems[current].querySelector('img');
    const newImg = lbImg.cloneNode(false);
    newImg.src = img.src;
    newImg.alt = img.alt;
    newImg.id  = 'lightbox-img';
    lbImg.replaceWith(newImg);
    lbCaption.textContent = ''; 
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function close() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    track.style.animationPlayState = ''; // Resume marquee
    allItems[current].focus();
  }

  // Open on click
  allItems.forEach((item, i) => {
    item.addEventListener('click', () => open(i));
    if (!item.hasAttribute('aria-hidden')) {
      item.setAttribute('tabindex', '0');
    }
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
    });
  });

  lbClose.addEventListener('click', close);
  lbPrev.addEventListener('click', () => open(current - 1));
  lbNext.addEventListener('click', () => open(current + 1));

  // Click backdrop to close
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  open(current - 1);
    if (e.key === 'ArrowRight') open(current + 1);
  });
})();

// ─── Countdown Timer ─────────────────────────────────────────────────────────
(function initCountdown() {
  // Wedding: Saturday 8 August 2026 at 15:00:00 local Sri Lanka time (UTC+5:30)
  const weddingDate = new Date('2026-08-08T15:00:00+05:30');

  const els = {
    days:  document.getElementById('cd-days'),
    hours: document.getElementById('cd-hours'),
    mins:  document.getElementById('cd-mins'),
    secs:  document.getElementById('cd-secs'),
  };

  function pad(n) { return String(n).padStart(2, '0'); }

  function tick() {
    const now  = Date.now();
    const diff = weddingDate - now;

    if (diff <= 0) {
      Object.values(els).forEach(el => { if (el) el.textContent = '00'; });
      return;
    }

    const totalSecs  = Math.floor(diff / 1000);
    const totalMins  = Math.floor(totalSecs / 60);
    const totalHours = Math.floor(totalMins / 60);
    const days  = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const mins  = totalMins % 60;
    const secs  = totalSecs % 60;

    if (els.days)  els.days.textContent  = pad(days);
    if (els.hours) els.hours.textContent = pad(hours);
    if (els.mins)  els.mins.textContent  = pad(mins);
    if (els.secs)  els.secs.textContent  = pad(secs);
  }

  tick();
  setInterval(tick, 1000);
})();

// ─── Scroll Reveal (IntersectionObserver) ────────────────────────────────────
(function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  // Observe all reveal elements
  document.querySelectorAll('.reveal-up').forEach(el => observer.observe(el));

  // Hero elements are immediately visible (above fold)
  document.querySelectorAll('.hero .reveal-up').forEach(el => {
    // Small delay to allow CSS to apply initial state, then animate
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('is-visible'));
    });
  });
})();

// ─── Attendance Toggle ────────────────────────────────────────────────────────
(function initAttendToggle() {
  const yesBtn = document.querySelector('.attend-btn--yes');
  const noBtn  = document.querySelector('.attend-btn--no');
  const yesRadio = document.getElementById('attend-yes');
  const noRadio  = document.getElementById('attend-no');

  function updateToggle() {
    yesBtn?.classList.toggle('is-selected', yesRadio?.checked);
    noBtn?.classList.toggle('is-selected', noRadio?.checked);
  }

  // Initialize
  updateToggle();

  yesRadio?.addEventListener('change', updateToggle);
  noRadio?.addEventListener('change', updateToggle);

  // Clicking labels already toggles radios, but ensure visual update
  yesBtn?.addEventListener('click', () => setTimeout(updateToggle, 0));
  noBtn?.addEventListener('click', () => setTimeout(updateToggle, 0));
})();

// ─── Guest Counter ────────────────────────────────────────────────────────────
(function initGuestsSelector() {
  const display = document.getElementById('guests');
  const decBtn  = document.getElementById('guests-dec');
  const incBtn  = document.getElementById('guests-inc');
  if (!display || !decBtn || !incBtn) return;

  const MIN = 1, MAX = 5;

  function updateButtons() {
    const val = parseInt(display.value, 10);
    decBtn.disabled = val <= MIN;
    incBtn.disabled = val >= MAX;
  }

  decBtn.addEventListener('click', () => {
    const val = parseInt(display.value, 10);
    if (val > MIN) {
      display.value = val - 1;
      updateButtons();
      display.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  incBtn.addEventListener('click', () => {
    const val = parseInt(display.value, 10);
    if (val < MAX) {
      display.value = val + 1;
      updateButtons();
      display.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  updateButtons();
})();

// ─── Guest Menu Selections (Reception RSVP only) ──────────────────────────────
(function initGuestMenuSelections() {
  const container = document.getElementById('guest-menu-selections');
  const guestsInput = document.getElementById('guests');
  const rsvpForm = document.getElementById('rsvp-form');
  if (!container || !guestsInput || !rsvpForm) return;

  function renderGuestFields(count) {
    const prevSelections = captureSelections();
    container.innerHTML = '';

    for (let i = 1; i <= count; i++) {
      const card = document.createElement('div');
      card.className = 'guest-selection-card';
      
      const isFirst = i === 1;
      const headerText = isFirst ? 'Guest 1 (You)' : `Guest ${i}`;
      
      let nameFieldHtml = '';
      if (!isFirst) {
        const prevName = prevSelections[i]?.name || '';
        nameFieldHtml = `
          <div class="form-group">
            <label class="form-label" for="guest_${i}_name">Full Name <span class="form-required" aria-label="required">*</span></label>
            <input class="form-input guest-name-input" type="text" id="guest_${i}_name" placeholder="Guest ${i} full name" required value="${prevName}" />
            <span class="form-error" id="guest_${i}_name-error" role="alert"></span>
          </div>
        `;
      }

      const prevStarter = prevSelections[i]?.starter || 'Chicken Caesar Salad';
      const prevSoup = prevSelections[i]?.soup || 'Roasted Butternut Soup';
      const prevMain = prevSelections[i]?.main || 'Stuffed Chicken Breast';
      const prevDessert = prevSelections[i]?.dessert || 'Red Velvet Bloom';
      const prevBeverage = prevSelections[i]?.beverage || 'Alcoholic';

      card.innerHTML = `
        <div class="guest-selection-header">${headerText}</div>
        ${nameFieldHtml}
        
        <div class="form-row form-row--2" style="margin-bottom: 0;">
          <div class="form-group">
            <label class="form-label" for="guest_${i}_starter">Starter Selection <span class="form-required" aria-label="required">*</span></label>
            <select class="form-input guest-starter-select" id="guest_${i}_starter" name="guest_${i}_starter" required>
              <option value="Chicken Caesar Salad" ${prevStarter === 'Chicken Caesar Salad' ? 'selected' : ''}>Chicken Caesar Salad</option>
              <option value="Pumpkin Panna Cotta" ${prevStarter === 'Pumpkin Panna Cotta' ? 'selected' : ''}>Pumpkin Panna Cotta</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="guest_${i}_soup">Soup <span class="form-required" aria-label="required">*</span></label>
            <select class="form-input guest-soup-select" id="guest_${i}_soup" name="guest_${i}_soup" required>
              <option value="Roasted Butternut Soup" ${prevSoup === 'Roasted Butternut Soup' ? 'selected' : ''}>Roasted Butternut Soup</option>
              <option value="Skip Soup" ${prevSoup === 'Skip Soup' ? 'selected' : ''}>Skip Soup</option>
            </select>
          </div>
        </div>

        <div class="form-row form-row--2" style="margin-bottom: 0;">
          <div class="form-group">
            <label class="form-label" for="guest_${i}_main">Main Course <span class="form-required" aria-label="required">*</span></label>
            <select class="form-input guest-main-select" id="guest_${i}_main" name="guest_${i}_main" required>
              <option value="Stuffed Chicken Breast" ${prevMain === 'Stuffed Chicken Breast' ? 'selected' : ''}>Stuffed Chicken Breast</option>
              <option value="Trio of Seafood" ${prevMain === 'Trio of Seafood' ? 'selected' : ''}>Trio of Seafood</option>
              <option value="Spaghetti Alfredo" ${prevMain === 'Spaghetti Alfredo' ? 'selected' : ''}>Spaghetti Alfredo (Veg)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="guest_${i}_dessert">Dessert Selection <span class="form-required" aria-label="required">*</span></label>
            <select class="form-input guest-dessert-select" id="guest_${i}_dessert" name="guest_${i}_dessert" required>
              <option value="Red Velvet Bloom" ${prevDessert === 'Red Velvet Bloom' ? 'selected' : ''}>Red Velvet Bloom</option>
              <option value="Fresh Fruit Platter" ${prevDessert === 'Fresh Fruit Platter' ? 'selected' : ''}>Fresh Fruit Platter</option>
            </select>
          </div>
        </div>

        <div class="form-row form-row--2" style="margin-bottom: 0;">
          <div class="form-group">
            <label class="form-label">Beverage Preference <span class="form-required" aria-label="required">*</span></label>
            <div class="menu-beverage-toggle">
              <label class="beverage-option">
                <input type="radio" name="guest_${i}_beverage" value="Alcoholic" ${prevBeverage === 'Alcoholic' ? 'checked' : ''} />
                <span>Alcoholic</span>
              </label>
              <label class="beverage-option">
                <input type="radio" name="guest_${i}_beverage" value="Non-Alcoholic" ${prevBeverage === 'Non-Alcoholic' ? 'checked' : ''} />
                <span>Non-Alcoholic</span>
              </label>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);

      // Setup real-time validation on typing
      if (!isFirst) {
        const input = card.querySelector('.guest-name-input');
        input?.addEventListener('input', () => {
          if (input.value.trim().length >= 2) {
            input.classList.remove('is-invalid');
            const errorEl = document.getElementById(`guest_${i}_name-error`);
            if (errorEl) errorEl.textContent = '';
          }
        });
      }
    }
  }

  function captureSelections() {
    const selections = {};
    const cards = container.querySelectorAll('.guest-selection-card');
    cards.forEach((card, index) => {
      const i = index + 1;
      const nameInput = card.querySelector('.guest-name-input');
      const name = nameInput ? nameInput.value.trim() : '';
      const starter = card.querySelector('.guest-starter-select')?.value || '';
      const soup = card.querySelector('.guest-soup-select')?.value || '';
      const main = card.querySelector('.guest-main-select')?.value || '';
      const dessert = card.querySelector('.guest-dessert-select')?.value || '';
      const beverage = card.querySelector(`input[name="guest_${i}_beverage"]:checked`)?.value || '';
      selections[i] = { name, starter, soup, main, dessert, beverage };
    });
    return selections;
  }

  // Initial render
  renderGuestFields(parseInt(guestsInput.value, 10));

  // Re-render when count changes
  guestsInput.addEventListener('change', () => {
    const val = parseInt(guestsInput.value, 10) || 1;
    renderGuestFields(val);
  });

  // Expose helper to validate and gather choices during submit
  window.getMenuSelectionsData = function() {
    let valid = true;
    const cards = container.querySelectorAll('.guest-selection-card');
    const selections = [];

    cards.forEach((card, index) => {
      const i = index + 1;
      const nameInput = card.querySelector('.guest-name-input');
      let name = '';
      if (nameInput) {
        name = nameInput.value.trim();
        const errorEl = document.getElementById(`guest_${i}_name-error`);
        if (!name || name.length < 2) {
          nameInput.classList.add('is-invalid');
          if (errorEl) errorEl.textContent = 'Please enter guest name.';
          valid = false;
        } else {
          nameInput.classList.remove('is-invalid');
          if (errorEl) errorEl.textContent = '';
        }
      }
      const starter = card.querySelector('.guest-starter-select')?.value || 'Chicken Caesar Salad';
      const soup = card.querySelector('.guest-soup-select')?.value || 'Roasted Butternut Soup';
      const main = card.querySelector('.guest-main-select')?.value || 'Stuffed Chicken Breast';
      const dessert = card.querySelector('.guest-dessert-select')?.value || 'Red Velvet Bloom';
      const beverage = card.querySelector(`input[name="guest_${i}_beverage"]:checked`)?.value || 'Alcoholic';
      selections.push({ guestNum: i, name, starter, soup, main, dessert, beverage });
    });

    return { valid, selections };
  };
})();

// ─── RSVP Form Submission ─────────────────────────────────────────────────────
(function initRsvpForm() {
  const form        = document.getElementById('rsvp-form');
  const successEl   = document.getElementById('rsvp-success');
  const submitBtn   = document.getElementById('submit-btn');
  const globalError = document.getElementById('form-error-global');

  if (!form) return;

  // Validation helpers
  function showFieldError(fieldId, message) {
    const errorEl = document.getElementById(`${fieldId}-error`);
    const inputEl = document.getElementById(fieldId);
    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.classList.add('is-invalid');
  }

  function clearFieldError(fieldId) {
    const errorEl = document.getElementById(`${fieldId}-error`);
    const inputEl = document.getElementById(fieldId);
    if (errorEl) errorEl.textContent = '';
    if (inputEl) inputEl.classList.remove('is-invalid');
  }

  function validateForm(data) {
    let valid = true;

    clearFieldError('name');

    if (!data.name || data.name.trim().length < 2) {
      showFieldError('name', 'Please enter your full name.');
      valid = false;
    }

    return valid;
  }

  // Real-time validation feedback
  document.getElementById('name')?.addEventListener('blur', function () {
    if (this.value.trim().length >= 2) clearFieldError('name');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    globalError.textContent = '';

    const formData = new FormData(form);
    
    let menuChoicesStr = null;
    if (typeof window.getMenuSelectionsData === 'function') {
      const { valid, selections } = window.getMenuSelectionsData();
      if (!valid) return;
      
      // Format selections as a readable string: "Guest 1 (You): Salad / Soup / Main / Dessert [Alcoholic]; Guest 2 (John): Panna Cotta / Soup / Seafood / Fruit [Non-Alcoholic]"
      menuChoicesStr = selections.map(s => {
        const label = s.guestNum === 1 ? 'Guest 1 (You)' : `Guest ${s.guestNum} (${s.name})`;
        return `${label}: ${s.starter} / ${s.soup} / ${s.main} / ${s.dessert} [${s.beverage}]`;
      }).join('; ');
    }

    const eventsAttending = formData.getAll('events_attending');
    const eventsStr = eventsAttending.length ? eventsAttending.join(', ') : '';

    const data = {
      name:      formData.get('name')?.trim(),
      phone:     formData.get('phone')?.trim() || '',
      guests:    formData.get('guests'),
      attending: formData.get('attending'),
      eventsAttending: eventsStr,
      dietary:   formData.get('dietary')?.trim() || '',
      message:   formData.get('message')?.trim() || '',
      eventType: formData.get('eventType')?.trim() || 'wedding',
      menuChoices: menuChoicesStr
    };

    if (!validateForm(data)) return;

    // Loading state
    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong. Please try again.');
      }

      // Show success
      form.hidden = true;

      const isAttending = data.attending === 'true' || data.attending === true;
      const successMsgEl = successEl.querySelector('.rsvp-success__msg');
      if (successMsgEl) {
        if (isAttending) {
          successMsgEl.textContent = "We can't wait to celebrate with you 💙";
        } else {
          successMsgEl.textContent = "We're so sorry you won't be able to make it. You will be missed! 💙";
        }
      }

      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    } catch (err) {
      globalError.textContent = err.message;
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
    }
  });
})();

// ─── Background Music ────────────────────────────────────────────────────────
(function initMusic() {
  const bgMusic = document.getElementById('bg-music');
  const toggleBtn = document.getElementById('music-toggle');
  if (!bgMusic || !toggleBtn) return;
  
  const iconOn = toggleBtn.querySelector('.icon-sound-on');
  const iconOff = toggleBtn.querySelector('.icon-sound-off');

  bgMusic.volume = 0.5; // Soften the volume slightly

  function toggleMusic() {
    if (bgMusic.paused) {
      if (bgMusic.currentTime < 17) bgMusic.currentTime = 17;
      bgMusic.play().catch(e => console.log('Playback prevented:', e));
      iconOn.style.display = 'block';
      iconOff.style.display = 'none';
    } else {
      bgMusic.pause();
      iconOn.style.display = 'none';
      iconOff.style.display = 'block';
    }
  }

  toggleBtn.addEventListener('click', toggleMusic);

  // Expose function so envelope logic can trigger playback
  window.playBackgroundMusic = function() {
    toggleBtn.hidden = false;
    if (bgMusic.paused) {
      if (bgMusic.currentTime < 17) bgMusic.currentTime = 17;
      bgMusic.play().catch(e => console.log('Playback prevented:', e));
      iconOn.style.display = 'block';
      iconOff.style.display = 'none';
    }
  };
})();

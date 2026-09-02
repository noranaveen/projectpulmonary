/* =========================================================
   PROJECT PULMONARY — INTERACTIONS
   ========================================================= */
(function(){
  "use strict";

  /* ---------- header scroll state ---------- */
  const header = document.querySelector('.site-header');
  const onScrollHeader = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 18);
  };
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive:true });

  /* ---------- mobile nav ---------- */
  const toggle = document.querySelector('[data-menu-toggle]');
  const shell = document.querySelector('[data-nav-shell]');
  if (toggle && shell) {
    toggle.addEventListener('click', () => {
      const open = shell.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    shell.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      shell.classList.remove('is-open');
      toggle.setAttribute('aria-expanded','false');
    }));
  }

  /* ---------- scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.rv, .rv-l, .rv-r, .rv-scale');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold:.16, rootMargin:'0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-in'));
  }

  /* ---------- mouse-responsive ambient background ---------- */
  const ambient = document.querySelector('.ambient');
  const cursorGlow = document.querySelector('.cursor-glow');
  if (ambient || cursorGlow) {
    window.addEventListener('pointermove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 40;
      const y = (e.clientY / window.innerHeight - 0.5) * 40;
      if (ambient) {
        ambient.style.setProperty('--mx', x.toFixed(1));
        ambient.style.setProperty('--my', y.toFixed(1));
      }
      if (cursorGlow) {
        cursorGlow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
      }
    }, { passive:true });
  }

  /* ---------- tilt effect for mission cards ---------- */
  document.querySelectorAll('.mcard').forEach(card => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(800px) rotateX(${(-py*7).toFixed(2)}deg) rotateY(${(px*7).toFixed(2)}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });

  /* ---------- animated counters (count up once) ---------- */
  const counters = document.querySelectorAll('[data-count-to]');
  if (counters.length && 'IntersectionObserver' in window) {
    const countIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseFloat(el.getAttribute('data-count-to'));
        const suffix = el.getAttribute('data-suffix') || '';
        const prefix = el.getAttribute('data-prefix') || '';
        const duration = 1600;
        const start = performance.now();
        function tick(now){
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = Math.floor(eased * target);
          el.textContent = prefix + val.toLocaleString() + suffix;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = prefix + target.toLocaleString() + suffix;
        }
        requestAnimationFrame(tick);
        countIo.unobserve(el);
      });
    }, { threshold:.5 });
    counters.forEach(el => countIo.observe(el));
  }

  /* ---------- blog article filters (Articles index) ---------- */
  document.querySelectorAll('[data-articles-grid]').forEach((grid) => {
    const filters = document.querySelectorAll('.article-filter');
    const cards = grid.querySelectorAll('.blog-card');
    const countEl = document.querySelector('.articles-count');
    if (!filters.length || !cards.length) return;
    filters.forEach((btn) => {
      btn.addEventListener('click', () => {
        filters.forEach(f => f.classList.remove('is-active'));
        btn.classList.add('is-active');
        const filter = btn.getAttribute('data-filter');
        let visible = 0;
        cards.forEach((card) => {
          const match = filter === 'all' || card.getAttribute('data-category') === filter;
          card.style.display = match ? '' : 'none';
          if (match) visible++;
        });
        if (countEl) countEl.textContent = `${visible} article${visible === 1 ? '' : 's'}`;
      });
    });
  });

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    const wrap = item.querySelector('.faq-a-wrap');
    if (!q || !wrap) return;
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      item.closest('.faq-list')?.querySelectorAll('.faq-item.is-open').forEach(other => {
        if (other !== item) {
          other.classList.remove('is-open');
          const w = other.querySelector('.faq-a-wrap');
          if (w) w.style.maxHeight = null;
        }
      });
      if (isOpen) {
        item.classList.remove('is-open');
        wrap.style.maxHeight = null;
      } else {
        item.classList.add('is-open');
        wrap.style.maxHeight = wrap.scrollHeight + 'px';
      }
    });
  });

  /* ---------- draggable collage ---------- */
  document.querySelectorAll('[data-collage]').forEach((collage) => {
    const track = collage.querySelector('.collage-track');
    const prev = collage.querySelector('[data-collage-prev]');
    const next = collage.querySelector('[data-collage-next]');
    if (!track) return;
    let isDown = false, startX = 0, scrollLeft = 0, dragDistance = 0;
    const step = () => Math.min(track.clientWidth * 0.8, 420);
    const startDrag = (x) => { isDown = true; startX = x; scrollLeft = track.scrollLeft; dragDistance = 0; track.classList.add('dragging'); };
    const moveDrag = (x) => { if (!isDown) return; dragDistance += Math.abs(x - startX); track.scrollLeft = scrollLeft - (x - startX) * 1.3; };
    const endDrag = () => { isDown = false; track.classList.remove('dragging'); track.dataset.dragged = dragDistance > 6 ? '1' : '0'; };
    track.addEventListener('mousedown', e => startDrag(e.pageX));
    track.addEventListener('mousemove', e => { if (isDown) { e.preventDefault(); moveDrag(e.pageX); } });
    window.addEventListener('mouseup', endDrag);
    track.addEventListener('mouseleave', endDrag);
    track.addEventListener('touchstart', e => startDrag(e.touches[0].clientX), { passive:true });
    track.addEventListener('touchmove', e => moveDrag(e.touches[0].clientX), { passive:true });
    track.addEventListener('touchend', endDrag);
    [prev, next].forEach(btn => btn && btn.addEventListener('click', () => {
      track.scrollBy({ left: step() * (btn.hasAttribute('data-collage-next') ? 1 : -1), behavior:'smooth' });
    }));

    const progressBar = collage.parentElement?.querySelector('.collage-progress-bar');
    if (progressBar) {
      const syncProgress = () => {
        const max = track.scrollWidth - track.clientWidth;
        const ratio = max > 0 ? track.scrollLeft / max : 0;
        const barWidth = Math.max(12, (track.clientWidth / track.scrollWidth) * 100);
        progressBar.style.width = barWidth + '%';
        progressBar.style.left = (ratio * (100 - barWidth)) + '%';
      };
      syncProgress();
      track.addEventListener('scroll', syncProgress, { passive:true });
      window.addEventListener('resize', syncProgress);
    }

    /* auto-scroll */
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      let autoActive = true;
      let resumeTimer = null;
      const AUTO_SPEED = 0.5;
      const pauseAuto = () => { autoActive = false; clearTimeout(resumeTimer); };
      const resumeAutoLater = () => { clearTimeout(resumeTimer); resumeTimer = setTimeout(() => { autoActive = true; }, 2600); };
      collage.addEventListener('mouseenter', pauseAuto);
      collage.addEventListener('mouseleave', resumeAutoLater);
      track.addEventListener('touchstart', pauseAuto, { passive:true });
      track.addEventListener('touchend', resumeAutoLater);
      [prev, next].forEach(btn => btn && btn.addEventListener('click', () => { pauseAuto(); resumeAutoLater(); }));
      const tick = () => {
        if (autoActive && !isDown) {
          const max = track.scrollWidth - track.clientWidth;
          if (max > 1) {
            if (track.scrollLeft >= max - 1) track.scrollLeft = 0;
            else track.scrollLeft += AUTO_SPEED;
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  });

  /* ---------- generic mailto forms ---------- */
  document.querySelectorAll('[data-mailto-form]').forEach((form) => {
    form.addEventListener('submit', function () {
      const to = form.getAttribute('data-mailto-form');
      const data = new FormData(form);
      const parts = [];
      form.querySelectorAll('[name]').forEach((field) => {
        const name = field.getAttribute('name');
        const label = field.closest('.field')?.querySelector('label')?.textContent || name;
        if (name === 'message') return;
        parts.push(`${label}: ${data.get(name) || ''}`);
      });
      const subject = encodeURIComponent(data.get('subject') || `Message from ${data.get('name') || 'website'}`);
      const body = encodeURIComponent(parts.join('\n') + `\n\nMessage:\n${data.get('message') || ''}`);
      form.action = `mailto:${to}?subject=${subject}&body=${body}`;
    });
  });

  /* ---------- Formspree forms (AJAX submit) ---------- */
  document.querySelectorAll('[data-formspree-form]').forEach((form) => {
    const status = form.querySelector('[data-form-status]');
    const submitBtn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }
      if (status) status.textContent = "We'll get back to you as soon as we can.";
      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      }).then((response) => {
        if (response.ok) {
          form.reset();
          if (status) status.textContent = "Thanks, your message has been sent. We'll be in touch soon.";
          if (submitBtn) { submitBtn.textContent = 'Message Sent'; }
        } else {
          if (status) status.textContent = 'Something went wrong. Please try again or email us directly.';
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Message'; }
        }
      }).catch(() => {
        if (status) status.textContent = 'Something went wrong. Please try again or email us directly.';
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Message'; }
      });
    });
  });

  /* ---------- breath-line scroll spine ---------- */
  const breathPath = document.querySelector('.breath-line path');
  if (breathPath) {
    const len = breathPath.getTotalLength ? breathPath.getTotalLength() : 1000;
    breathPath.style.strokeDasharray = len;
    breathPath.style.strokeDashoffset = len;
    const updateBreath = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      breathPath.style.strokeDashoffset = len - (len * p);
    };
    updateBreath();
    window.addEventListener('scroll', updateBreath, { passive:true });
    window.addEventListener('resize', updateBreath);
  }

  /* ---------- auto-scroll testimonials (About page reflections) ---------- */
  document.querySelectorAll('.voices-rail-wide').forEach((rail) => {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
    let active = true;
    let resumeTimer = null;
    const pause = () => { active = false; clearTimeout(resumeTimer); };
    const resumeLater = () => { clearTimeout(resumeTimer); resumeTimer = setTimeout(() => { active = true; }, 3200); };
    rail.addEventListener('mouseenter', pause);
    rail.addEventListener('mouseleave', resumeLater);
    rail.addEventListener('touchstart', pause, { passive:true });
    rail.addEventListener('touchend', resumeLater);
    rail.addEventListener('click', pause);
    const tick = () => {
      if (active) {
        const max = rail.scrollWidth - rail.clientWidth;
        if (max > 1) {
          if (rail.scrollLeft >= max - 1) rail.scrollLeft = 0;
          else rail.scrollLeft += 0.4;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  /* ---------- photo lightbox (masonry + mini-collage) ---------- */
  const zoomableImgs = document.querySelectorAll('.masonry img, .mini-collage img, .collage-card img');
  if (zoomableImgs.length) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button><img alt="">';
    document.body.appendChild(overlay);
    const overlayImg = overlay.querySelector('img');
    const closeBtn = overlay.querySelector('.lightbox-close');

    const openLightbox = (src, alt) => {
      overlayImg.src = src;
      overlayImg.alt = alt || '';
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };
    const closeLightbox = () => {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    };
    zoomableImgs.forEach(img => {
      img.addEventListener('click', () => {
        const track = img.closest('.collage-track');
        if (track && track.dataset.dragged === '1') return;
        openLightbox(img.currentSrc || img.src, img.alt);
      });
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLightbox(); });
    closeBtn.addEventListener('click', closeLightbox);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
  }

})();

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

  /* ---------- scroll reveal (robust: never leaves content hidden) ---------- */
  const revealEls = Array.from(document.querySelectorAll('.rv'));
  const sweep = () => {
    const limit = window.innerHeight * 0.96;
    revealEls.forEach(el => {
      if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < limit) el.classList.add('is-in');
    });
  };
  let sweepQueued = false;
  window.addEventListener('scroll', () => {
    if (sweepQueued) return;
    sweepQueued = true;
    requestAnimationFrame(() => { sweepQueued = false; sweep(); });
  }, { passive:true });
  window.addEventListener('resize', sweep);
  window.addEventListener('load', sweep);
  sweep();
  /* anchor jumps and print: show everything */
  window.addEventListener('hashchange', () => revealEls.forEach(el => el.classList.add('is-in')));
  window.addEventListener('beforeprint', () => revealEls.forEach(el => el.classList.add('is-in')));

  /* ---------- hero video: respect reduced motion + pause toggle ---------- */
  const heroVideo = document.querySelector('[data-hero-video]');
  const heroToggle = document.querySelector('[data-video-toggle]');
  if (heroVideo) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const setIcon = () => {
      if (!heroToggle) return;
      const paused = heroVideo.paused;
      heroToggle.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
      heroToggle.innerHTML = paused
        ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
    };
    if (reduce) { heroVideo.removeAttribute('autoplay'); heroVideo.pause(); }
    heroVideo.addEventListener('play', setIcon);
    heroVideo.addEventListener('pause', setIcon);
    setIcon();
    if (heroToggle) heroToggle.addEventListener('click', () => { heroVideo.paused ? heroVideo.play() : heroVideo.pause(); });
  }

  /* ---------- click-to-play testimonial videos (sound on) ---------- */
  document.querySelectorAll('[data-vcard]').forEach((card) => {
    const video = card.querySelector('video');
    const btn = card.querySelector('.play');
    if (!video || !btn) return;
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-vcard] video').forEach(v => { if (v !== video) v.pause(); });
      card.classList.add('is-playing');
      video.controls = true;
      video.muted = false;
      video.play();
    });
    video.addEventListener('ended', () => { card.classList.remove('is-playing'); video.controls = false; video.load(); });
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
    const reduceCount = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    counters.forEach(el => {
      if (reduceCount) return; /* real number is already in the HTML */
      el.textContent = (el.getAttribute('data-prefix') || '') + '0' + (el.getAttribute('data-suffix') || '');
      countIo.observe(el);
    });
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
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); q.click(); } });
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
        q.setAttribute('aria-expanded','false');
      } else {
        item.classList.add('is-open');
        wrap.style.maxHeight = wrap.scrollHeight + 'px';
        q.setAttribute('aria-expanded','true');
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
  const zoomableImgs = document.querySelectorAll('.gallery img, .collage-card img');
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


  /* ---------- partner logos: show the name until a logo file is added ---------- */
  document.querySelectorAll('.partner img').forEach(img => {
    const swap = () => {
      if (!img.parentNode) return;
      const s = document.createElement('span');
      s.className = 'partner-name';
      s.textContent = img.getAttribute('alt') || '';
      img.replaceWith(s);
    };
    img.addEventListener('error', swap, { once:true });
  });


  /* =========================================================
     Fire + water motion (all of it switches off for reduced motion)
     ========================================================= */
  const reduceAll = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- hero embers: a few warm sparks rising from the bottom ---------- */
  document.querySelectorAll('[data-embers]').forEach((cv) => {
    if (reduceAll) { cv.remove(); return; }
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), parts = [], running = true;
    const size = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr,0,0,dpr,0,0); };
    const spawn = (init) => ({
      x: Math.random() * w,
      y: init ? Math.random() * h : h + 10,
      r: .8 + Math.random() * 1.8,
      vy: .35 + Math.random() * .9,
      sway: Math.random() * Math.PI * 2,
      life: 0,
      max: 260 + Math.random() * 320
    });
    size();
    const count = () => Math.round(Math.min(46, Math.max(18, w / 32)));
    for (let i = 0; i < count(); i++) parts.push(spawn(true));
    window.addEventListener('resize', size);
    new IntersectionObserver(es => { running = es[0].isIntersecting; if (running) requestAnimationFrame(frame); }).observe(cv);
    function frame(){
      if (!running) return;
      ctx.clearRect(0,0,w,h);
      ctx.globalCompositeOperation = 'lighter';
      parts.forEach((p, i) => {
        p.life++; p.sway += .02; p.y -= p.vy; p.x += Math.sin(p.sway) * .35;
        const fade = Math.min(1, p.life / 40) * Math.max(0, 1 - p.life / p.max) * Math.min(1, p.y / (h * .35));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(255,190,110,${.9 * fade})`);
        g.addColorStop(.4, `rgba(255,122,61,${.45 * fade})`);
        g.addColorStop(1, 'rgba(255,90,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
        if (p.life > p.max || p.y < -10) parts[i] = spawn(false);
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  /* ---------- typed rotating word in the hero ---------- */
  document.querySelectorAll('[data-typed]').forEach((el) => {
    const words = el.getAttribute('data-typed').split('|');
    if (reduceAll || words.length < 2) return;
    let wi = 0, ci = words[0].length, deleting = true;
    const step = () => {
      const word = words[wi];
      if (deleting) {
        ci--; el.textContent = word.slice(0, ci);
        if (ci <= 0) { deleting = false; wi = (wi + 1) % words.length; return setTimeout(step, 260); }
        return setTimeout(step, 38);
      }
      const next = words[wi]; ci++; el.textContent = next.slice(0, ci);
      if (ci >= next.length) { deleting = true; return setTimeout(step, 2200); }
      setTimeout(step, 70);
    };
    setTimeout(step, 2600);
  });

  /* ---------- mission band: smoke clears, lungs draw, words light up as you scroll ---------- */
  document.querySelectorAll('[data-mission]').forEach((band) => {
    const text = band.querySelector('[data-words]');
    const keys = ['lung','cancer','prevention','firefighters,','pulmonary','rehabilitation','wildfire','carcinogens.'];
    let words = [];
    if (text) {
      const raw = text.textContent.trim().split(/\s+/);
      text.innerHTML = raw.map((wd, i) => `<span class="w${i > 1 && keys.includes(wd.toLowerCase()) ? ' key' : ''}">${wd}</span>`).join(' ');
      words = Array.from(text.querySelectorAll('.w'));
    }
    const paths = Array.from(band.querySelectorAll('.lungs .lp'));
    paths.forEach(pth => { try { pth.style.setProperty('--len', Math.ceil(pth.getTotalLength())); } catch(e){} });
    const cv = band.querySelector('[data-smoke]');
    let progress = 0;
    const update = () => {
      const r = band.getBoundingClientRect(), vh = window.innerHeight;
      progress = Math.max(0, Math.min(1, (vh * .85 - r.top) / (r.height * .9)));
      const lit = Math.round(progress * 1.25 * words.length);
      words.forEach((wd, i) => wd.classList.toggle('on', i < lit));
      paths.forEach((pth, i) => pth.style.setProperty('--draw', Math.max(0, Math.min(1, progress * 1.6 - i * .08)).toFixed(3)));
    };
    if (reduceAll) { words.forEach(wd => wd.classList.add('on')); paths.forEach(pth => pth.style.setProperty('--draw', 1)); if (cv) cv.remove(); return; }
    update();
    window.addEventListener('scroll', () => requestAnimationFrame(update), { passive:true });
    window.addEventListener('resize', update);

    /* smoke: soft grey puffs that thin out as the statement is read */
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, puffs = [], running = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr,0,0,dpr,0,0); };
    size(); window.addEventListener('resize', size);
    const mk = () => ({ x: Math.random() * w, y: h + 60 + Math.random() * h * .5, r: 60 + Math.random() * 120, vy: .25 + Math.random() * .45, vx: (Math.random() - .5) * .25, a: .05 + Math.random() * .07 });
    for (let i = 0; i < 18; i++) { const p = mk(); p.y = Math.random() * h; puffs.push(p); }
    new IntersectionObserver(es => { running = es[0].isIntersecting; if (running) requestAnimationFrame(frame); }).observe(band);
    function frame(){
      if (!running) return;
      ctx.clearRect(0,0,w,h);
      const thin = 1 - progress * .85;
      puffs.forEach((p, i) => {
        p.y -= p.vy; p.x += p.vx; p.r += .06;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(190,196,220,${p.a * thin})`);
        g.addColorStop(1, 'rgba(190,196,220,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        if (p.y + p.r < -20) puffs[i] = mk();
      });
      requestAnimationFrame(frame);
    }
  });

  /* ---------- water droplet fills when it scrolls into view ---------- */
  const drops = document.querySelectorAll('[data-drop]');
  if (drops.length) {
    if (reduceAll || !('IntersectionObserver' in window)) drops.forEach(d => d.classList.add('is-in'));
    else {
      const dio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); dio.unobserve(e.target); } }), { threshold:.4 });
      drops.forEach(d => dio.observe(d));
    }
  }

  /* ---------- gallery videos: only play while visible ---------- */
  document.querySelectorAll('.gallery video, .tri video').forEach(v => {
    if (!('IntersectionObserver' in window)) return;
    if (reduceAll) { v.removeAttribute('autoplay'); v.pause(); return; }
    new IntersectionObserver(es => es.forEach(e => { e.isIntersecting ? v.play().catch(()=>{}) : v.pause(); }), { threshold:.2 }).observe(v);
  });


  /* ---------- click-to-load YouTube (About page news videos) ---------- */
  document.querySelectorAll('[data-yt]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-yt');
      btn.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${btn.getAttribute('aria-label') || 'Video'}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
      btn.style.cursor = 'default';
    }, { once:true });
  });

})();

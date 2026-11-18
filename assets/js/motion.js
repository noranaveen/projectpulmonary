/* Project Pulmonary: scroll motion, full-image framing, chapter directory */
(function () {
  'use strict';
  const base = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/js\/motion\.js.*$/, '') : 'assets/';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- 1. show every photo in full: blurred backdrop + contain ---------- */
  const FIT = [
    '.gallery figure>img', '.faces figure>img', '.clip figure>img', '.seg-img>img',
    '.grid-3 .card>img', '.uses .card>img', '.give .card>img', '.steps .step>img',
    '.article-cover>img', '.split-media>img', '.hw-photo>img', '.origin-photos figure>img',
    '.program-media .main>img', '.program-media .inset>img', '.rec-photos figure>img',
    '.recog-photo>img', '.chapter-card>img', '.ts-photo>img', '.cm-media:not(.cm-logo)>img', '.bt-card>img', '.photo-card>img'
  ].join(',');
  document.querySelectorAll(FIT).forEach((img) => {
    if (img.closest('.pp-frame')) return;
    const src = new URL(img.getAttribute('src'), location.href).href;
    const wrap = document.createElement('span');
    wrap.className = 'pp-frame';
    wrap.style.setProperty('--pp-bg', `url("${src}")`);
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
  });
  document.querySelectorAll('.blog-card-banner.has-photo').forEach((b) => {
    const m = /url\((['"]?)(.*?)\1\)/.exec(b.style.backgroundImage || '');
    if (!m) return;
    b.style.setProperty('--pp-bg', `url("${new URL(m[2], location.href).href}")`);
    b.classList.add('pp-banner');
  });

  /* ---------- 2. scroll-linked effects (one rAF loop) ---------- */
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hero = document.querySelector('.hero');
  const parallax = Array.from(document.querySelectorAll('[data-parallax]'));
  const vrows = Array.from(document.querySelectorAll('[data-vmarq] .vm-row'));
  const burst = document.querySelector('[data-burst]');
  const bcards = burst ? Array.from(burst.querySelectorAll('.bt-card')) : [];
  const btitle = burst && burst.querySelector('.bt-title');
  const pstack = Array.from(document.querySelectorAll('[data-pstack] .program'));
  const bar = document.createElement('div'); bar.className = 'scroll-bar'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  // scattered start positions for the photo burst (deterministic)
  const seed = [[-0.62,-0.38,-24],[0.58,-0.46,18],[-0.7,0.42,14],[0.66,0.4,-20],[-0.08,-0.62,9],[0.12,0.66,-12],[0.82,-0.02,26],[-0.86,0.04,-30]];
  const ease = (x) => 1 - Math.pow(1 - x, 3);

  let lastY = window.scrollY, vel = 0, mqx = [0, 0];
  if (vrows.length) vrows.forEach((r, i) => { r._w = r.querySelector('.vm-track').scrollWidth / 2; });

  function frame() {
    const vh = window.innerHeight, y = window.scrollY;
    const dy = y - lastY; lastY = y;
    vel += (dy - vel) * 0.18;
    const docH = document.documentElement.scrollHeight - vh;
    bar.style.transform = `scaleX(${docH > 0 ? (y / docH).toFixed(4) : 0})`;

    if (hero && !reduce) {
      const r = hero.getBoundingClientRect();
      const p = clamp(-r.top / (r.height * 0.9), 0, 1);
      hero.style.setProperty('--hp', p.toFixed(4));
    }
    if (vrows.length) {
      vrows.forEach((r, i) => {
        const dir = +r.dataset.dir || 1;
        mqx[i] = (mqx[i] || 0) + dir * (reduce ? 0 : 0.6 + Math.abs(vel) * 0.9);
        const w = r._w || 1;
        let x = mqx[i] % w; if (x > 0) x -= w;
        r.firstElementChild.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${reduce ? 0 : clamp(-vel * 0.35, -14, 14).toFixed(2)}deg)`;
      });
    }
    if (burst && !reduce) {
      const r = burst.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      const q = ease(clamp(p / 0.75, 0, 1));
      bcards.forEach((c, i) => {
        const [sx, sy, sr] = seed[i % seed.length];
        const k = 1 - q;
        c.style.transform = `translate3d(${(sx * k * 100).toFixed(2)}vw,${(sy * k * 100).toFixed(2)}vh,0) rotate(${(sr * k).toFixed(2)}deg) scale(${(0.55 + 0.45 * q).toFixed(3)})`;
        c.style.opacity = clamp(0.25 + q * 1.2, 0, 1).toFixed(3);
      });
      if (btitle) btitle.style.setProperty('--bq', q.toFixed(3));
      burst.style.setProperty('--bp', p.toFixed(3));
    }
    if (pstack.length && !reduce) {
      pstack.forEach((c, i) => {
        const next = pstack[i + 1];
        let cover = 0;
        if (next) {
          const a = c.getBoundingClientRect(), b = next.getBoundingClientRect();
          cover = clamp((a.bottom - b.top) / a.height, 0, 1);
        }
        c.style.setProperty('--cv', cover.toFixed(3));
      });
    }
    if (!reduce) parallax.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const k = parseFloat(el.dataset.parallax) || 0.12;
      el.style.setProperty('--py', `${((r.top + r.height / 2 - vh / 2) * -k).toFixed(1)}px`);
    });
  }
  // continuous loop only while something animates; otherwise on scroll
  const loop = () => { frame(); requestAnimationFrame(loop); };
  if (vrows.length && !reduce) requestAnimationFrame(loop);
  else {
    let ticking = false;
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { frame(); ticking = false; }); } }, { passive: true });
  }
  window.addEventListener('resize', () => { vrows.forEach((r) => { r._w = r.querySelector('.vm-track').scrollWidth / 2; }); frame(); });
  window.addEventListener('load', frame);
  frame();

  /* ---------- 2b. headings: words rise out of a mask ---------- */
  document.querySelectorAll('h2.h-lg, h2.h-md').forEach((h) => {
    if (h.closest('.hero') || h.querySelector('*')) return;
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map((w, i) => `<span class="wm" aria-hidden="true"><span style="--w:${i}">${w}</span></span>`).join(' ');
    h.classList.add('split-h');
    h.setAttribute('data-reveal', '');
  });

  /* ---------- 2c. 3D tilt + spotlight, magnetic buttons ---------- */
  if (fine && !reduce) {
    document.querySelectorAll('.cm-card, .quote, .merch-card, .stat, .bt-card, .program-media, .lm-item, .card').forEach((el) => {
      el.classList.add('tilt');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--tx', ((y - 0.5) * -8).toFixed(2) + 'deg');
        el.style.setProperty('--ty', ((x - 0.5) * 10).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        el.classList.add('is-tilt');
      });
      el.addEventListener('pointerleave', () => { el.classList.remove('is-tilt'); el.style.setProperty('--tx', '0deg'); el.style.setProperty('--ty', '0deg'); });
    });
    document.querySelectorAll('.btn').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px,${((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1)}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
    if (hero) hero.addEventListener('pointermove', (e) => {
      hero.style.setProperty('--px', ((e.clientX / innerWidth) - 0.5).toFixed(3));
      hero.style.setProperty('--py2', ((e.clientY / innerHeight) - 0.5).toFixed(3));
    });
  }

  /* ---------- 3. reveal for fact visuals and other one-shot animations ---------- */
  const once = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { threshold: 0.35 });
    once.forEach((el) => io.observe(el));
  } else once.forEach((el) => el.classList.add('is-in'));

  /* ---------- 4. VOC molecules (skeletal formulas) ---------- */
  (function () {
    const hex = Array.from({ length: 6 }, (_, k) => { const a = Math.PI / 180 * (60 * k - 90); return [Math.cos(a), Math.sin(a)]; });
    const ring = { atoms: hex.map((p) => ({ p })), bonds: [[0,1,2],[1,2,1],[2,3,2],[3,4,1],[4,5,2],[5,0,1]] };
    const M = {
      benzene: ring,
      toluene: { atoms: [...ring.atoms, { p: [0, -2] }], bonds: [...ring.bonds, [0, 6, 1]] },
      styrene: { atoms: [...ring.atoms, { p: [0, -2] }, { p: [0.87, -2.5] }], bonds: [...ring.bonds, [0, 6, 1], [6, 7, 2]] },
      formaldehyde: { atoms: [{ p: [0, 0.2] }, { p: [0, -1.1], l: 'O' }, { p: [-1.05, 0.85], l: 'H' }, { p: [1.05, 0.85], l: 'H' }], bonds: [[0,1,2],[0,2,1],[0,3,1]] },
      acrolein: { atoms: [{ p: [-1.95, 0.5] }, { p: [-0.98, -0.1] }, { p: [0, 0.5] }, { p: [1, -0.1], l: 'O' }], bonds: [[0,1,2],[1,2,1],[2,3,2]] },
      butadiene: { atoms: [{ p: [-1.5, 0.3] }, { p: [-0.5, -0.3] }, { p: [0.5, 0.3] }, { p: [1.5, -0.3] }], bonds: [[0,1,2],[1,2,1],[2,3,2]] }
    };
    document.querySelectorAll('[data-voc]').forEach((svg) => {
      const m = M[svg.dataset.voc]; if (!m) return;
      // centre the molecule
      const xs = m.atoms.map((a) => a.p[0]), ys = m.atoms.map((a) => a.p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const P = (a) => [a.p[0] - cx, a.p[1] - cy];
      let h = '<g class="vm">';
      m.bonds.forEach(([i, j, o], n) => {
        const A = m.atoms[i], B = m.atoms[j];
        let [x1, y1] = P(A), [x2, y2] = P(B);
        const sh = (a, x, y, X, Y) => { if (!a.l) return [x, y]; const d = Math.hypot(X - x, Y - y); return [x + (X - x) / d * 0.32, y + (Y - y) / d * 0.32]; };
        [x1, y1] = sh(A, x1, y1, x2, y2); [x2, y2] = sh(B, x2, y2, x1, y1);
        h += `<line class="vb" style="--n:${n}" x1="${x1.toFixed(3)}" y1="${y1.toFixed(3)}" x2="${x2.toFixed(3)}" y2="${y2.toFixed(3)}"/>`;
        if (o === 2) {
          const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = -dy / L * 0.2, ny = dx / L * 0.2;
          // inner line for rings (toward centre), parallel line otherwise
          let ox = nx, oy = ny;
          if (svg.dataset.voc !== 'formaldehyde' && i < 6 && j < 6 && ['benzene','toluene','styrene'].includes(svg.dataset.voc)) {
            const mx = (x1 + x2) / 2 - P({ p: [0, 0] })[0], my = (y1 + y2) / 2 - P({ p: [0, 0] })[1];
            if (mx * nx + my * ny > 0) { ox = -nx; oy = -ny; }
          }
          const k = 0.18;
          h += `<line class="vb vb2" style="--n:${n + 0.5}" x1="${(x1 + dx * k + ox).toFixed(3)}" y1="${(y1 + dy * k + oy).toFixed(3)}" x2="${(x2 - dx * k + ox).toFixed(3)}" y2="${(y2 - dy * k + oy).toFixed(3)}"/>`;
        }
      });
      m.atoms.forEach((a, n) => {
        const [x, y] = P(a);
        h += a.l ? `<text class="va va-${a.l}" style="--n:${n}" x="${x.toFixed(3)}" y="${(y + 0.2).toFixed(3)}">${a.l}</text>` : `<circle class="vc" style="--n:${n}" cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r=".13"/>`;
      });
      const S = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 2.2) + 1.1;
      svg.setAttribute('viewBox', `${(-S / 2).toFixed(2)} ${(-S / 2).toFixed(2)} ${S.toFixed(2)} ${S.toFixed(2)}`);
      svg.innerHTML = h + '</g>';
    });
  })();

  /* ---------- 6. merch whirlwind + waitlist ---------- */
  const storm = document.querySelector('[data-storm]');
  if (storm) {
    const items = Array.from(storm.querySelectorAll('.mw-item'));
    const N = items.length;
    const cfg = items.map((el, i) => ({ el, ph: (i / N) * Math.PI * 2, h: (i * 0.618) % 1, sp: 0.55 + ((i * 37) % 10) / 22, rot: ((i * 53) % 40) - 20 }));
    let t0 = performance.now(), boost = 0, inView = false, enter = 0;
    const stage = storm.closest('.mw-stage');
    stage.addEventListener('pointerenter', () => { boost = 1; });
    stage.addEventListener('pointerleave', () => { boost = 0; });
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { inView = es[0].isIntersecting; }, { threshold: 0.1 }).observe(stage);
    let speed = 1;
    function spin(now) {
      const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
      if (inView || !('IntersectionObserver' in window)) {
        enter = Math.min(1, enter + dt * 1.4);
        speed += ((1 + boost * 1.6) - speed) * 0.05;
        const W = stage.clientWidth, H = stage.clientHeight;
        cfg.forEach((c) => {
          const m = reduce ? 0 : 1;
          c.ph += dt * c.sp * 0.55 * speed * m;                         // slow-motion orbit
          c.h = (c.h + dt * 0.022 * speed * m) % 1;                      // drift upward
          c.tx = (c.tx || 0) + dt * (0.6 + c.sp * 0.5) * m;             // tumble clock
          const y = 1 - c.h;
          const r = (0.1 + 0.4 * (1 - y)) * W * (0.35 + 0.65 * enter);
          const x = Math.cos(c.ph) * r;
          const z = Math.sin(c.ph);                                      // -1 back .. 1 front
          const depth = (z + 1) / 2;
          const s = (0.32 + 1.25 * Math.pow(depth, 1.6)) * (0.8 + 0.3 * (1 - y));
          const top = (0.1 + 0.78 * y) * H;
          const fade = Math.min(1, c.h * 5, (1 - c.h) * 5);
          const rx = Math.sin(c.tx) * 38, ry = Math.cos(c.tx * 0.8) * 55, rz = c.rot + Math.sin(c.tx * 0.6) * 25;
          c.el.style.transform = `translate3d(${(W / 2 + x).toFixed(1)}px,${top.toFixed(1)}px,0) translate(-50%,-50%) scale(${s.toFixed(3)}) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) rotate(${rz.toFixed(1)}deg)`;
          c.el.style.zIndex = String(Math.round(depth * 100));
          c.el.style.opacity = ((0.5 + 0.5 * depth) * fade * enter).toFixed(3);
          const blur = depth < 0.35 ? (0.35 - depth) * 9 : (depth > 0.9 ? (depth - 0.9) * 14 : 0);
          c.el.style.filter = `blur(${blur.toFixed(1)}px) brightness(${(0.7 + 0.4 * depth).toFixed(2)}) drop-shadow(0 ${(10 + depth * 24).toFixed(0)}px ${(14 + depth * 22).toFixed(0)}px rgba(0,0,0,${(0.25 + depth * 0.25).toFixed(2)}))`;
        });
      }
      requestAnimationFrame(spin);
    }
    requestAnimationFrame(spin);
  }
  document.querySelectorAll('[data-waitlist]').forEach((form) => {
    const btn = form.querySelector('button'), txt = form.querySelector('.mw-btn-txt'), status = form.querySelector('.mw-status');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      btn.disabled = true; txt.textContent = 'Adding you…';
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then((r) => {
          if (!r.ok) throw new Error('bad');
          form.classList.add('is-done');
          txt.textContent = 'You’re on the list!';
          status.textContent = 'Thanks! We’ll email you the moment the merch store opens.';
          const burst = document.createElement('span'); burst.className = 'mw-burst';
          const colors = ['#FFB13B', '#FF5A1F', '#C9B8FF', '#8FD3FF', '#6D28D9', '#fff'];
          for (let i = 0; i < 26; i++) {
            const b = document.createElement('i');
            const a = (i / 26) * Math.PI * 2, d = 60 + Math.random() * 70;
            b.style.cssText = `--x:${(Math.cos(a) * d).toFixed(0)}px;--y:${(Math.sin(a) * d - 30).toFixed(0)}px;--r:${(Math.random() * 540).toFixed(0)}deg;background:${colors[i % colors.length]}`;
            burst.appendChild(b);
          }
          btn.appendChild(burst); setTimeout(() => burst.remove(), 1400);
        })
        .catch(() => {
          btn.disabled = false; txt.textContent = 'Join the merch waitlist';
          status.textContent = 'Something went wrong. Please try again, or email projectpulmonary@gmail.com.';
        });
    });
  });

  /* ---------- 5. chapter directory: search + Leaflet map ---------- */
  const dir = document.querySelector('.dir[data-dir]');
  if (dir && window.PP_CHAPTERS) {
    const STATES = {AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const rows = window.PP_CHAPTERS.map(([school, city, region, country, lat, lng], i) => ({
      i, school, city, region, country, lat, lng,
      hay: norm([school, city, region, country, country === 'United States' ? 'USA US America' : ''].join(' '))
    })).sort((a, b) => (a.country === b.country ? 0 : a.country === 'United States' ? -1 : b.country === 'United States' ? 1 : a.country.localeCompare(b.country)) || a.region.localeCompare(b.region) || a.city.localeCompare(b.city));
    const input = dir.querySelector('.dir-input');
    const list = dir.querySelector('.dir-list');
    const count = dir.querySelector('.dir-count');
    const empty = dir.querySelector('.dir-empty');
    const emptyQ = dir.querySelector('.dir-q');
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let map = null, layer = null, markers = {};

    function initMap() {
      if (!window.L || map) return;
      map = L.map(dir.querySelector('.dir-map'), { scrollWheelZoom: false, worldCopyJump: true, zoomControl: true }).setView([30, -40], 2);
      const esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16, attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
      }).addTo(map);
      const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16 }).addTo(map);
      let fails = 0;
      esri.on('tileerror', () => {
        if (++fails !== 4) return;
        map.removeLayer(esri); map.removeLayer(labels);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
      });
      layer = L.layerGroup().addTo(map);
      rows.forEach((r) => {
        markers[r.i] = L.circleMarker([r.lat, r.lng], { radius: 7, weight: 2, color: '#fff', fillColor: '#6D28D9', fillOpacity: 0.95 })
          .bindPopup(`<strong>${esc(r.school)}</strong><br>${esc([r.city, r.region, r.country].filter(Boolean).join(', '))}`);
      });
      render();
    }

    function render() {
      const raw = input.value.trim();
      let q = norm(raw);
      if (/^[a-z]{2}$/.test(q) && STATES[q.toUpperCase()]) q = norm(STATES[q.toUpperCase()]);
      const terms = q ? q.split(' ') : [];
      const hits = rows.filter((r) => terms.every((t) => r.hay.includes(t)));
      if (!raw) { list.innerHTML = ''; count.textContent = ''; empty.hidden = true; dir.classList.remove('has-q'); return; }
      dir.classList.add('has-q');
      count.textContent = hits.length ? `${hits.length} chapter${hits.length === 1 ? '' : 's'} found` : '';
      empty.hidden = hits.length > 0;
      if (emptyQ) emptyQ.textContent = raw;
      list.innerHTML = hits.map((r) => `<li><div class="dir-item"><strong>${esc(r.school)}</strong><span>${esc([r.city, r.region, r.country].filter(Boolean).join(', '))}</span></div></li>`).join('');
      if (map) {
        layer.clearLayers();
        hits.forEach((r) => layer.addLayer(markers[r.i]));
        if (raw && hits.length) {
          const b = L.latLngBounds(hits.map((r) => [r.lat, r.lng]));
          map.flyToBounds(b.pad(0.4), { maxZoom: 9, duration: 0.8 });
        } else if (!raw) map.setView([30, -40], 2);
      }
    }
    let t = null;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 120); });
    dir.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); render(); });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-i]');
      if (!b || !map) return;
      const r = rows.find((x) => x.i === +b.dataset.i);
      map.flyTo([r.lat, r.lng], 10, { duration: 0.8 });
      markers[r.i].openPopup();
      if (window.innerWidth < 761) dir.querySelector('.dir-map').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    });
    dir.querySelectorAll('[data-dir-q]').forEach((c) => c.addEventListener('click', () => { input.value = c.dataset.dirQ; render(); }));
    render();
  }
})();

/* ---------- 7. About: Palisades fire map + synced incident counters ---------- */
(function () {
  const map = document.querySelector('[data-firemap]');
  if (!map) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const stage = map.querySelector('.fm-stage'), cv = map.querySelector('.fm-canvas'), ctx = cv.getContext('2d');
  const svgs = map.querySelectorAll('.fm-stage svg');
  const dayEl = map.querySelector('.fm-day'), dateEl = map.querySelector('.fm-date');

  // --- deterministic noise
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15;

  // --- geography (map units: x 0..1000, y 95..410)
  const LAND = new Path2D('M0,0H1000V352C940,340 900,328 840,318S700,300 600,296S420,300 320,296S120,292 0,300Z');
  const BURN = new Path2D('M352,298C344,262 372,224 414,198C466,164 528,128 600,120C662,114 724,136 756,174C780,204 776,252 752,284C734,306 702,308 662,304C600,300 520,302 460,302C410,303 362,306 352,298Z');
  const hit = document.createElement('canvas').getContext('2d');
  const IX = 700, IY = 150, WX = -0.8, WY = 0.6;            // ignition, wind blowing toward the southwest
  const C = 2, BX = 330, BY = 104, NX = 225, NY = 108;       // fire grid
  const arr = new Float32Array(NX * NY).fill(-1), shade = new Float32Array(NX * NY);
  let maxE = 0;
  for (let gy = 0; gy < NY; gy++) for (let gx = 0; gx < NX; gx++) {
    const x = BX + gx * C + 1, y = BY + gy * C + 1;
    const jx = (fbm(x * 0.02, y * 0.02) - 0.5) * 34, jy = (fbm(x * 0.02 + 9, y * 0.02 + 4) - 0.5) * 34;
    if (!hit.isPointInPath(BURN, x + jx, y + jy) || !hit.isPointInPath(BURN, x, y) || !hit.isPointInPath(LAND, x, y)) continue;
    const dx = x - IX, dy = y - IY, d = Math.hypot(dx, dy) || 1, cs = (dx * WX + dy * WY) / d;
    const e = d * (1 - 0.5 * cs) + fbm(x * 0.03 + 3, y * 0.03) * 70;
    arr[gy * NX + gx] = e; if (e > maxE) maxE = e;
    shade[gy * NX + gx] = fbm(x * 0.09, y * 0.09) * 0.7 + Math.random() * 0.3;
  }
  for (let i = 0; i < arr.length; i++) if (arr[i] >= 0) arr[i] = 0.015 + (arr[i] / maxE) * 0.82;
  const arrAt = (x, y) => { const gx = Math.floor((x - BX) / C), gy = Math.floor((y - BY) / C); return (gx < 0 || gy < 0 || gx >= NX || gy >= NY) ? -1 : arr[gy * NX + gx]; };

  // neighborhood lights
  const lights = [];
  const zone = (n, x0, x1, y0, y1) => { for (let k = 0; k < n * 3 && n > 0; k++) { const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
    if (!hit.isPointInPath(LAND, x, y + 5)) continue; lights.push({ x, y, a: arrAt(x, y), ph: rnd() * 6.28, s: 0.7 + rnd() * 0.9 }); n--; } };
  zone(70, 660, 790, 200, 300); zone(60, 800, 1000, 220, 330); zone(40, 860, 1000, 150, 225); zone(36, 20, 350, 268, 300); zone(26, 420, 600, 220, 300); zone(10, 560, 660, 150, 230);

  // ridges (contour-like lines)
  const ridges = [];
  for (let k = 0; k < 16; k++) { const y0 = 112 + k * 12.5, pts = []; for (let x = -10; x <= 1010; x += 10) pts.push([x, y0 + Math.sin(x * 0.006 + k) * 10 + (fbm(x * 0.008, k * 1.7) - 0.5) * 34]); ridges.push(pts); }

  // offscreen fire buffers
  const fc = document.createElement('canvas'); fc.width = NX; fc.height = NY; const fx = fc.getContext('2d'); const img = fx.createImageData(NX, NY);
  const hc = document.createElement('canvas'); hc.width = NX; hc.height = NY; const hx = hc.getContext('2d'); const himg = hx.createImageData(NX, NY);
  const gc = document.createElement('canvas'); gc.width = NX / 5; gc.height = NY / 5; const gx2 = gc.getContext('2d');
  const puff = document.createElement('canvas'); puff.width = puff.height = 64;
  { const p = puff.getContext('2d'), g = p.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(190,182,205,.55)'); g.addColorStop(.5, 'rgba(150,142,170,.22)'); g.addColorStop(1, 'rgba(120,112,140,0)'); p.fillStyle = g; p.fillRect(0, 0, 64, 64); }

  let V = { x: 0, y: 95, w: 1000, h: 315 }, sc = 1, dpr = 1;
  function layout() {
    const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const asp = r.width / r.height, w = Math.min(1000, 315 * asp);
    V = { x: (1000 - w) * 0.78, y: 95, w, h: w / asp };
    svgs.forEach((s) => { s.setAttribute('viewBox', `${V.x} ${V.y} ${V.w} ${V.h}`); s.setAttribute('preserveAspectRatio', 'none'); });
    sc = cv.width / V.w;
    const wt = map.querySelector('.fm-windtag'); if (wt) wt.setAttribute('transform', `translate(${Math.min(905, V.x + V.w - 30)},122)`);
    map.querySelectorAll('.fm-lbl text').forEach((tx) => { tx.classList.remove('fm-off'); try { const bb = tx.getBBox(); if (bb.width && (bb.x < V.x + 4 || bb.x + bb.width > V.x + V.w - 4)) tx.classList.add('fm-off'); } catch (e) {} });
  }

  const smoke = [], embers = [], streaks = [];
  for (let k = 0; k < 34; k++) streaks.push({ x: rnd() * 1100, y: 95 + rnd() * 320, l: 26 + rnd() * 40, v: 2 + rnd() * 2.5, o: 0.06 + rnd() * 0.12 });
  let fire = reduce ? 1 : 0, t = 0;

  function frame() {
    const r = map.getBoundingClientRect(), vh = window.innerHeight;
    const p = reduce ? 1 : clamp((vh * 0.92 - r.top) / (r.height * 0.6 + vh * 0.5), 0, 1);
    fire = clamp((p - 0.08) / 0.78, 0, 1);
    map.style.setProperty('--fire', fire.toFixed(3));
    map.style.setProperty('--beam', clamp((p - 0.88) / 0.12, 0, 1).toFixed(3));
    const el = Math.round(fire * 24); dayEl.textContent = Math.max(1, el); dateEl.textContent = 'Jan ' + (7 + el);
    map.classList.toggle('is-contained', fire >= 1);
  }

  function draw() {
    t++;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(sc, 0, 0, sc, -V.x * sc, -V.y * sc);
    // contours on land
    ctx.save(); ctx.clip(LAND); ctx.lineWidth = 1.1 / sc * dpr; ctx.strokeStyle = 'rgba(150,165,255,.13)';
    ridges.forEach((pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); });
    ctx.restore();
    // wind streaks
    const windA = fire >= 1 ? 0.35 : 1;
    ctx.lineCap = 'round'; ctx.lineWidth = 1.4;
    streaks.forEach((s) => { if (!reduce) { s.x += WX * s.v; s.y += WY * s.v; if (s.x < V.x - 60 || s.y > 420) { s.x = V.x + V.w + rnd() * 120; s.y = 60 + rnd() * 300; } }
      const g = ctx.createLinearGradient(s.x, s.y, s.x - WX * s.l, s.y - WY * s.l); g.addColorStop(0, `rgba(210,225,255,${s.o * windA})`); g.addColorStop(1, 'rgba(210,225,255,0)');
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - WX * s.l, s.y - WY * s.l); ctx.stroke(); });
    // lights
    ctx.globalCompositeOperation = 'lighter';
    lights.forEach((L) => { let a = 0.55 + 0.35 * Math.sin(t * 0.05 + L.ph), col = '255,222,150';
      if (L.a >= 0 && fire > L.a) { const s = fire - L.a; if (s < 0.04) { col = '255,140,60'; a = 1; } else return; }
      ctx.fillStyle = `rgba(${col},${a * 0.25})`; ctx.beginPath(); ctx.arc(L.x, L.y, 3.4 * L.s, 0, 6.29); ctx.fill();
      ctx.fillStyle = `rgba(${col},${a})`; ctx.beginPath(); ctx.arc(L.x, L.y, 0.9 * L.s, 0, 6.29); ctx.fill(); });
    ctx.globalCompositeOperation = 'source-over';
    // fire cells
    const d = img.data, h = himg.data, front = [];
    for (let i = 0; i < arr.length; i++) {
      const a0 = arr[i], o = i * 4; let R = 0, G = 0, B = 0, A = 0;
      if (a0 >= 0 && fire > a0) {
        const s = fire >= 1 ? 1 : fire - a0, fl = reduce ? 1 : 0.72 + Math.random() * 0.28;
        if (s < 0.022) { const k = s / 0.022; R = 255; G = (246 - 96 * k) * fl; B = (200 - 160 * k) * fl; A = 255; front.push(i); }
        else if (s < 0.1) { const k = (s - 0.022) / 0.078; R = (255 - 50 * k) * fl; G = (150 - 112 * k) * fl; B = 40 - 18 * k; A = 255; if (Math.random() < 0.15) front.push(i); }
        else if (s < 0.28) { const k = (s - 0.1) / 0.18; R = 205 - 179 * k; G = 38 - 22 * k; B = 22 + 2 * k; A = 255 - 20 * k; }
        else { const sh = shade[i]; R = 22 + sh * 40; G = 14 + sh * 18; B = 22 + sh * 16; A = 245; if (!reduce && fire < 1 && Math.random() < 0.004) { R = 255; G = 120; B = 40; } }
      }
      d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = A;
      const hot = a0 >= 0 && fire > a0 && fire < 1 && fire - a0 < 0.1;
      h[o] = hot ? R : 0; h[o + 1] = hot ? G : 0; h[o + 2] = hot ? B : 0; h[o + 3] = hot ? 255 : 0;
    }
    fx.putImageData(img, 0, 0); hx.putImageData(himg, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fc, BX, BY, NX * C, NY * C);
    gx2.clearRect(0, 0, gc.width, gc.height); gx2.drawImage(hc, 0, 0, gc.width, gc.height);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85;
    ctx.drawImage(gc, BX - 12, BY - 12, NX * C + 24, NY * C + 24);
    ctx.globalAlpha = 0.5; ctx.drawImage(gc, BX - 30, BY - 30, NX * C + 60, NY * C + 60);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // containment line
    if (fire >= 1) { ctx.save(); ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 0.4; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.6; ctx.shadowColor = '#FF8A3D'; ctx.shadowBlur = 8 * dpr; ctx.stroke(BURN); ctx.restore(); }
    // particles
    if (!reduce && front.length) {
      const n = Math.min(3, front.length / 140 + 0.4);
      for (let k = 0; k < n; k++) { const i = front[(Math.random() * front.length) | 0], x = BX + (i % NX) * C, y = BY + ((i / NX) | 0) * C;
        if (smoke.length < 120 && Math.random() < 0.6) smoke.push({ x, y, vx: WX * (0.5 + Math.random() * 0.4) + (Math.random() - 0.5) * 0.3, vy: WY * (0.5 + Math.random() * 0.4) + (Math.random() - 0.5) * 0.3, r: 6, life: 0, max: 160 + Math.random() * 120 });
        if (embers.length < 160) for (let e = 0; e < 2; e++) embers.push({ x, y, vx: WX * (1.4 + Math.random() * 1.6) + (Math.random() - 0.5), vy: WY * (1.4 + Math.random() * 1.6) + (Math.random() - 0.5), life: 0, max: 30 + Math.random() * 50 }); }
    }
    for (let k = smoke.length - 1; k >= 0; k--) { const s = smoke[k]; s.life++; s.x += s.vx; s.y += s.vy; s.r += 0.28; if (s.life > s.max) { smoke.splice(k, 1); continue; }
      const q = s.life / s.max; ctx.globalAlpha = Math.sin(q * Math.PI) * 0.4; ctx.drawImage(puff, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
    for (let k = embers.length - 1; k >= 0; k--) { const e = embers[k]; e.life++; e.x += e.vx; e.y += e.vy; e.vx += (Math.random() - 0.5) * 0.25; e.vy += (Math.random() - 0.5) * 0.25; if (e.life > e.max) { embers.splice(k, 1); continue; }
      const q = 1 - e.life / e.max; ctx.fillStyle = `rgba(255,${150 + 80 * q | 0},70,${q})`; ctx.beginPath(); ctx.arc(e.x, e.y, 0.6 + q * 0.9, 0, 6.29); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
  }

  let visible = false, raf = 0;
  const loop = () => { draw(); raf = visible && !reduce ? requestAnimationFrame(loop) : 0; };
  let tick = false;
  window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(() => { frame(); tick = false; }); } }, { passive: true });
  window.addEventListener('resize', () => { layout(); frame(); draw(); });
  layout(); frame(); draw();
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !raf && !reduce) raf = requestAnimationFrame(loop); }, { rootMargin: '100px' }).observe(map);

  // incident counters run in step with the timeline marker (2.6s after the panel reveals)
  const ledger = document.querySelector('.origin-ledger');
  const dds = ledger ? Array.from(ledger.querySelectorAll('[data-fire-to]')) : [];
  if (!ledger || !dds.length) return;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const run = () => {
    if (reduce) { ledger.classList.add('fire-go'); dds.forEach((d) => { d.textContent = fmt(+d.dataset.fireTo); }); return; }
    ledger.classList.add('fire-go');
    const t0 = performance.now() + 400, D = 2600;
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const step = (now) => {
      const x = clamp((now - t0) / D, 0, 1);
      dds.forEach((d) => { d.textContent = fmt(+d.dataset.fireTo * ease(x)); });
      if (x < 1) requestAnimationFrame(step);
    };
    dds.forEach((d) => { d.textContent = '0'; });
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && !reduce) {
    dds.forEach((d) => { d.textContent = '0'; });
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); ledger.classList.add('is-in'); run(); } }, { threshold: 0.35 });
    io.observe(ledger);
  } else run();
})();

/* ---------- 8. Holiday: snowfall + advent doors ---------- */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-snow]').forEach((cv) => {
    const ctx = cv.getContext('2d'); let W = 0, H = 0, dpr = 1, flakes = [], on = true, raf = 0;
    const make = (top) => ({ x: Math.random() * W, y: top ? -10 : Math.random() * H, r: 0.8 + Math.random() * 2.6, s: 0.3 + Math.random() * 0.9, w: Math.random() * 6.28, ws: 0.005 + Math.random() * 0.015 });
    const size = () => { const r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(160, W * H / 9000)); flakes = Array.from({ length: n }, () => make(false)); };
    const draw = () => { ctx.clearRect(0, 0, W, H);
      for (const f of flakes) { if (!reduce) { f.w += f.ws; f.y += f.s * (0.6 + f.r * 0.3); f.x += Math.sin(f.w) * 0.5; if (f.y > H + 6) Object.assign(f, make(true)); }
        ctx.globalAlpha = 0.35 + f.r * 0.22; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.29); ctx.fill(); }
      ctx.globalAlpha = 1; raf = on && !reduce ? requestAnimationFrame(draw) : 0; };
    size(); draw();
    window.addEventListener('resize', size);
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { on = es[0].isIntersecting; if (on && !raf && !reduce) raf = requestAnimationFrame(draw); }).observe(cv);
  });
  document.querySelectorAll('[data-advent]').forEach((el) => {
    if (reduce || !('IntersectionObserver' in window)) { el.classList.add('is-open'); return; }
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); setTimeout(() => el.classList.add('is-open'), 350); } }, { threshold: 0.45 });
    io.observe(el);
  });
})();

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
    '.recog-photo>img', '.chapter-card>img', '.ts-photo>img', '.cm-media:not(.cm-logo)>img', '.photo-card>img'
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

  /* ---------- 4. benzo[a]pyrene molecule, drawn from hexagon geometry ---------- */
  document.querySelectorAll('[data-molecule]').forEach((svg) => {
    const R = 22, W = Math.sqrt(3) * R;
    const rings = [[0.5, 0], [0, 1], [1, 1], [0.5, 2], [-0.5, 2]]; // pyrene + benzo ring
    const pts = new Map(), edges = new Map();
    const key = (x, y) => `${Math.round(x * 10)},${Math.round(y * 10)}`;
    rings.forEach(([cx, row]) => {
      const X = 70 + cx * W, Y = 34 + row * 1.5 * R;
      const v = [];
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 180 * (60 * k - 90);
        const x = X + R * Math.cos(a), y = Y + R * Math.sin(a);
        pts.set(key(x, y), [x, y]); v.push([x, y]);
      }
      for (let k = 0; k < 6; k++) {
        const a = v[k], b = v[(k + 1) % 6];
        const id = [key(...a), key(...b)].sort().join('|');
        if (!edges.has(id)) edges.set(id, [a, b, edges.size]);
      }
    });
    let html = '';
    edges.forEach(([a, b, i]) => {
      html += `<line class="bond" style="--i:${i}" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"/>`;
    });
    let j = 0;
    pts.forEach(([x, y]) => { html += `<circle class="atom" style="--i:${j++}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2"/>`; });
    svg.querySelector('.mol').innerHTML = html;
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
      count.textContent = raw ? `${hits.length} chapter${hits.length === 1 ? '' : 's'} match “${raw}”` : `${rows.length} chapters on the map`;
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

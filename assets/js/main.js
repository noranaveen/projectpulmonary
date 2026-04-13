const toggle = document.querySelector('[data-menu-toggle]');
const shell = document.querySelector('[data-nav-shell]');
if (toggle && shell) {
  toggle.addEventListener('click', () => {
    shell.classList.toggle('open');
    toggle.setAttribute('aria-expanded', shell.classList.contains('open') ? 'true' : 'false');
  });
}

const form = document.querySelector('[data-contact-form]');
if (form) {
  form.addEventListener('submit', function () {
    if (form.getAttribute('action') === 'mailto:projectpulmonary@gmail.com') {
      const data = new FormData(form);
      const subject = encodeURIComponent(data.get('subject') || 'Project Pulmonary inquiry');
      const body = encodeURIComponent(
        `Name: ${data.get('name') || ''}
Email: ${data.get('email') || ''}

Message:
${data.get('message') || ''}`
      );
      form.action = `mailto:projectpulmonary@gmail.com?subject=${subject}&body=${body}`;
    }
  });
}

const revealTargets = document.querySelectorAll('.section-heading, .copy-card, .feature-panel, .program-card, .image-card, .stat-card, .cta-panel, .contact-card, .form-wrap, .faq-item, .page-hero h1, .page-hero p, .page-lead-grid img, .page-lead-grid .tag-row, .hero-copy .eyebrow, .hero-copy h1, .hero-copy p, .hero-cta, .hero-card, .band .section-heading, .scroll-note, .collage-card');
revealTargets.forEach((el, index) => {
  if (!el.classList.contains('reveal-up') && !el.classList.contains('reveal-left') && !el.classList.contains('reveal-right') && !el.classList.contains('reveal-fade')) {
    if (el.matches('.hero-card, .page-lead-grid img')) el.classList.add('reveal-right');
    else if (el.matches('.hero-copy .eyebrow, .hero-copy h1, .hero-copy p, .hero-cta')) el.classList.add('reveal-left');
    else el.classList.add('reveal-up');
  }
  el.classList.add(`stagger-${(index % 4) + 1}`);
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

revealTargets.forEach((el) => revealObserver.observe(el));

document.querySelectorAll('[data-collage]').forEach((collage) => {
  const track = collage.querySelector('.collage-track');
  const prev = collage.querySelector('[data-collage-prev]');
  const next = collage.querySelector('[data-collage-next]');
  if (!track) return;

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  const step = () => Math.min(track.clientWidth * 0.84, 420);

  const startDrag = (clientX) => {
    isDown = true;
    startX = clientX;
    scrollLeft = track.scrollLeft;
    track.classList.add('dragging');
  };
  const moveDrag = (clientX) => {
    if (!isDown) return;
    const walk = (clientX - startX) * 1.4;
    track.scrollLeft = scrollLeft - walk;
  };
  const endDrag = () => {
    isDown = false;
    track.classList.remove('dragging');
  };

  track.addEventListener('mousedown', (e) => startDrag(e.pageX));
  track.addEventListener('mousemove', (e) => {
    e.preventDefault();
    moveDrag(e.pageX);
  });
  window.addEventListener('mouseup', endDrag);
  track.addEventListener('mouseleave', endDrag);

  track.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientX), { passive: true });
  track.addEventListener('touchmove', (e) => moveDrag(e.touches[0].clientX), { passive: true });
  track.addEventListener('touchend', endDrag);

  [prev, next].forEach((btn) => btn && btn.addEventListener('click', () => {
    const direction = btn.hasAttribute('data-collage-next') ? 1 : -1;
    track.scrollBy({ left: step() * direction, behavior: 'smooth' });
  }));
});


// motion polish additions
document.querySelectorAll('.hero-card, .page-lead-grid img, .image-card, .program-card, .collage-card').forEach((el) => {
  if (!el.hasAttribute('data-parallax')) el.setAttribute('data-parallax', '');
});

const parallaxTargets = document.querySelectorAll('[data-parallax]');
let parallaxTick = false;
const runParallax = () => {
  parallaxTargets.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const windowMid = window.innerHeight / 2;
    const elementMid = rect.top + rect.height / 2;
    const delta = (elementMid - windowMid) / window.innerHeight;
    const shift = Math.max(-14, Math.min(14, delta * -16));
    const media = el.tagName === 'IMG' ? el : el.querySelector('img');
    if (media) media.style.transform = `translateY(${shift}px) scale(1.02)`;
  });
  parallaxTick = false;
};
const requestParallax = () => {
  if (!parallaxTick) {
    window.requestAnimationFrame(runParallax);
    parallaxTick = true;
  }
};
window.addEventListener('scroll', requestParallax, { passive: true });
window.addEventListener('resize', requestParallax);
requestParallax();

document.querySelectorAll('[data-testimonials]').forEach((deck) => {
  const slides = Array.from(deck.querySelectorAll('[data-testimonial-slide]'));
  const prev = deck.querySelector('[data-testimonial-prev]');
  const next = deck.querySelector('[data-testimonial-next]');
  const dotsWrap = deck.querySelector('.testimonial-dots');
  if (!slides.length || !dotsWrap) return;

  let index = 0;
  let timer;
  const dots = slides.map((_, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'testimonial-dot' + (i === 0 ? ' active' : '');
    btn.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
    btn.addEventListener('click', () => { show(i); reset(); });
    dotsWrap.appendChild(btn);
    return btn;
  });

  const show = (nextIndex) => {
    slides[index].classList.remove('active');
    dots[index].classList.remove('active');
    index = (nextIndex + slides.length) % slides.length;
    slides[index].classList.add('active');
    dots[index].classList.add('active');
  };

  const advance = (dir = 1) => show(index + dir);
  const start = () => { timer = window.setInterval(() => advance(1), 6500); };
  const reset = () => { window.clearInterval(timer); start(); };

  prev && prev.addEventListener('click', () => { advance(-1); reset(); });
  next && next.addEventListener('click', () => { advance(1); reset(); });
  deck.addEventListener('mouseenter', () => window.clearInterval(timer));
  deck.addEventListener('mouseleave', start);
  start();
});

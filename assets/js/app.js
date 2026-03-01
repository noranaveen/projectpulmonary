(function(){
  // Mobile menu toggle
  const menuBtn = document.querySelector('[data-menu-btn]');
  const mobilePanel = document.querySelector('[data-mobile-panel]');
  if(menuBtn && mobilePanel){
    const setOpen = (open) => {
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      mobilePanel.hidden = !open;
    };
    setOpen(false);
    menuBtn.addEventListener('click', () => {
      const open = menuBtn.getAttribute('aria-expanded') !== 'true';
      setOpen(open);
    });
    mobilePanel.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if(a) setOpen(false);
    });
  }

  // Gallery filtering (if present)
  const filterButtons = document.querySelectorAll('.filter[data-filter]');
  const galleryItems = document.querySelectorAll('.gitem[data-cat]');
  if(filterButtons.length && galleryItems.length){
    function setPressed(activeBtn){
      filterButtons.forEach(b => b.setAttribute('aria-pressed', b === activeBtn ? 'true' : 'false'));
    }
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.filter;
        setPressed(btn);
        galleryItems.forEach(it => {
          const cat = it.dataset.cat;
          it.style.display = (f === 'all' || f === cat) ? '' : 'none';
        });
      });
    });
  }

  // Utilities
  function qs(sel, root=document){ return root.querySelector(sel); }
  function makeNotice(container, kind, msg){
    if(!container) return;
    container.innerHTML = '';
    const div = document.createElement('div');
    div.className = `notice ${kind || ''}`.trim();
    div.role = 'status';
    div.textContent = msg;
    container.appendChild(div);
  }
  function serializeForm(form){
    const data = {};
    new FormData(form).forEach((v,k)=>{ data[k]=String(v); });
    return data;
  }
  function basicValidate(form){
    const required = form.querySelectorAll('[required]');
    for(const el of required){
      if(!el.value || !String(el.value).trim()){
        el.focus();
        return {ok:false, msg:`Please fill out "${el.name || el.id || 'a required field'}".`};
      }
    }
    const email = form.querySelector('input[type="email"]');
    if(email && email.value){
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      if(!ok){
        email.focus();
        return {ok:false, msg:'Please enter a valid email address.'};
      }
    }
    return {ok:true};
  }
  async function submitToEndpoint(endpoint, payload){
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    if(!res.ok){
      const txt = await res.text().catch(()=> '');
      throw new Error(txt || `Request failed (${res.status})`);
    }
    return true;
  }

  // Forms
  const forms = document.querySelectorAll('form[data-form]');
  forms.forEach(form => {
    const type = form.getAttribute('data-form');
    const notice = qs('[data-notice]', form);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const v = basicValidate(form);
      if(!v.ok){
        makeNotice(notice, 'bad', v.msg);
        return;
      }

      const payload = serializeForm(form);
      payload._formType = type;
      payload._timestamp = new Date().toISOString();

      // Save locally for safety during early-stage use
      try{
        const key = `pp_submissions_${type}`;
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        arr.push(payload);
        localStorage.setItem(key, JSON.stringify(arr));
      }catch(_){}

      const endpoint = form.getAttribute('data-endpoint') || '';
      if(endpoint){
        try{
          makeNotice(notice, '', 'Submitting…');
          await submitToEndpoint(endpoint, payload);
          makeNotice(notice, 'good', 'Submitted! Thank you — we’ll follow up soon.');
          form.reset();
          return;
        }catch(_){
          makeNotice(notice, 'bad', 'Saved locally, but online submission failed. Please email us to confirm.');
          return;
        }
      }

      // No endpoint configured
      if(type === 'chapter'){
        makeNotice(notice, 'good', 'Application saved. Add a form endpoint when you’re ready to receive submissions.');
      }else if(type === 'donate'){
        makeNotice(notice, 'good', 'Thank you! Connect Stripe/Donorbox/PayPal to accept donations.');
      }else{
        makeNotice(notice, 'good', 'Saved. Connect a form endpoint (Formspree/Netlify) to receive messages.');
      }

      form.reset();
    });
  });

  // Footer year
  const y = document.getElementById('y');
  if(y) y.textContent = new Date().getFullYear();
})();

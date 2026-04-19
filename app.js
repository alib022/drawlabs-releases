// Scroll reveals + Tweaks.
(function(){
  // Reveal on scroll
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  // ===== Tweaks =====
  const PANEL = document.getElementById('tweaks');
  const state = Object.assign({ hero:'drawn', accent:'violet', density:'comfy', bg:'paper' }, (window.TWEAK_DEFAULTS||{}));
  try {
    const saved = JSON.parse(JSON.stringify(window.TWEAK_DEFAULTS||{}));
    Object.assign(state, saved);
  } catch(e){}

  const HERO_COPY = {
    drawn:    { h:'Compliant AI pipelines,', h2:'drawn in minutes.' },
    moat:     { h:'The runtime', h2:'is the moat.' },
    boundary: { h:'Your data', h2:'never leaves the boundary.' }
  };

  const ACCENTS = {
    violet: { a:'oklch(0.52 0.22 290)', b:'oklch(0.55 0.18 220)', c:'oklch(0.55 0.18 150)' },
    cyan:   { a:'oklch(0.55 0.15 220)', b:'oklch(0.50 0.20 260)', c:'oklch(0.58 0.14 180)' },
    lime:   { a:'oklch(0.58 0.17 145)', b:'oklch(0.55 0.15 195)', c:'oklch(0.62 0.16 100)' },
    amber:  { a:'oklch(0.62 0.17 60)',  b:'oklch(0.55 0.18 30)',  c:'oklch(0.62 0.14 110)' },
    rose:   { a:'oklch(0.55 0.22 15)',  b:'oklch(0.55 0.20 330)', c:'oklch(0.62 0.16 45)'  }
  };

  const BGS = {
    ink:      { bg:'oklch(0.16 0.015 265)', bg2:'oklch(0.19 0.02 265)', bg3:'oklch(0.22 0.025 265)',
                ink:'oklch(0.98 0.005 265)', ink2:'oklch(0.82 0.01 265)', ink3:'oklch(0.62 0.015 265)', line:'oklch(0.30 0.02 265)', line2:'oklch(0.26 0.02 265)',
                accent:'oklch(0.72 0.20 290)', accent2:'oklch(0.82 0.15 220)', accent3:'oklch(0.78 0.18 150)' },
    midnight: { bg:'oklch(0.12 0.03 280)', bg2:'oklch(0.16 0.035 280)', bg3:'oklch(0.20 0.04 280)',
                ink:'oklch(0.98 0.005 265)', ink2:'oklch(0.80 0.02 280)', ink3:'oklch(0.60 0.03 280)', line:'oklch(0.28 0.04 280)', line2:'oklch(0.22 0.035 280)',
                accent:'oklch(0.72 0.20 290)', accent2:'oklch(0.82 0.15 220)', accent3:'oklch(0.78 0.18 150)' },
    paper:    { bg:'oklch(0.97 0.005 80)',  bg2:'oklch(0.94 0.008 80)',  bg3:'oklch(0.91 0.01 80)',
                ink:'oklch(0.18 0.02 265)',  ink2:'oklch(0.34 0.02 265)', ink3:'oklch(0.52 0.015 265)', line:'oklch(0.82 0.01 80)',  line2:'oklch(0.88 0.008 80)',
                accent:'oklch(0.52 0.22 290)', accent2:'oklch(0.55 0.18 220)', accent3:'oklch(0.55 0.18 150)' }
  };

  function renderHero(key, animate){
    const H = HERO_COPY[key] || HERO_COPY.drawn;
    const h1 = document.querySelector('.hero h1');
    if(!h1) return;
    if(!animate){
      h1.innerHTML = `<span class="line"><span class="swap">${H.h}</span></span><span class="line"><span class="swap grad">${H.h2}</span></span>`;
      return;
    }
    // animate out old, then in new
    const oldSpans = h1.querySelectorAll('.swap');
    oldSpans.forEach(s => s.classList.add('out'));
    setTimeout(()=>{
      h1.innerHTML = `<span class="line"><span class="swap">${H.h}</span></span><span class="line"><span class="swap grad">${H.h2}</span></span>`;
    }, 450);
  }

  let _heroTimer = null;
  function startHeroRotation(){
    if(_heroTimer) clearInterval(_heroTimer);
    const keys = Object.keys(HERO_COPY);
    _heroTimer = setInterval(()=>{
      // honor a manual pick: only rotate if user hasn't chosen via tweaks
      if(state._heroOverride) return;
      const cur = state.hero;
      const idx = keys.indexOf(cur);
      const next = keys[(idx+1) % keys.length];
      state.hero = next;
      renderHero(next, true);
    }, 4500);
  }

  function apply(){
    // hero copy — render without animation on first paint / tweak change
    renderHero(state.hero, false);

    // accent
    const acc = ACCENTS[state.accent] || ACCENTS.violet;
    document.documentElement.style.setProperty('--accent', acc.a);
    document.documentElement.style.setProperty('--accent-2', acc.b);
    document.documentElement.style.setProperty('--accent-3', acc.c);

    // bg (also drives accent so dark/light stay readable)
    const bg = BGS[state.bg] || BGS.paper;
    const r = document.documentElement.style;
    r.setProperty('--bg', bg.bg);
    r.setProperty('--bg-2', bg.bg2);
    r.setProperty('--bg-3', bg.bg3);
    r.setProperty('--ink', bg.ink);
    r.setProperty('--ink-2', bg.ink2);
    r.setProperty('--ink-3', bg.ink3);
    r.setProperty('--line', bg.line);
    r.setProperty('--line-2', bg.line2);
    // if user hasn't chosen an accent override, use bg's accent
    if(!state._accentOverride){
      r.setProperty('--accent', bg.accent);
      r.setProperty('--accent-2', bg.accent2);
      r.setProperty('--accent-3', bg.accent3);
    }
    document.body.setAttribute('data-bg', state.bg);

    // density
    document.body.setAttribute('data-density', state.density);

    // update selected UI
    document.querySelectorAll('#tweaks .opts').forEach(grp=>{
      const g = grp.dataset.group;
      grp.querySelectorAll('button').forEach(b=>{
        b.classList.toggle('sel', b.dataset.val === state[g]);
      });
    });
    document.querySelectorAll('#tweaks .swatches').forEach(grp=>{
      const g = grp.dataset.group;
      grp.querySelectorAll('.swatch').forEach(s=>{
        s.classList.toggle('sel', s.dataset.val === state[g]);
      });
    });
  }

  function persist(){
    try {
      window.parent.postMessage({type:'__edit_mode_set_keys', edits: state}, '*');
    } catch(e){}
  }

  // (edit-mode protocol stripped for production — dev tooling only)

  // wire up buttons
  document.querySelectorAll('#tweaks .opts').forEach(grp=>{
    const g = grp.dataset.group;
    grp.querySelectorAll('button').forEach(b=>{
      b.addEventListener('click', ()=>{
        state[g] = b.dataset.val;
        if(g === 'hero') state._heroOverride = true;
        apply(); persist();
      });
    });
  });
  document.querySelectorAll('#tweaks .swatches').forEach(grp=>{
    const g = grp.dataset.group;
    grp.querySelectorAll('.swatch').forEach(s=>{
      s.addEventListener('click', ()=>{
        state[g] = s.dataset.val;
        if(g === 'accent') state._accentOverride = true;
        apply(); persist();
      });
    });
  });

  apply();
  startHeroRotation();

  // ===== Download counter =====
  (async function(){
    const REPO = 'alib022/drawlabs-releases';
    const RELEASES_URL = `https://github.com/${REPO}/releases`;
    const btn = document.getElementById('dl-btn');
    const ver = document.getElementById('dl-version');
    const counter = document.getElementById('dl-counter');
    const bar = document.getElementById('dl-bar-fill');
    if(!btn || !counter) return;
    btn.href = RELEASES_URL;

    let total = 85; // fallback baseline
    let version = '';
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`);
      if(res.ok){
        const releases = await res.json();
        if(Array.isArray(releases) && releases.length){
          const latest = releases[0];
          const dmg = latest.assets?.find(a => a.name.endsWith('.dmg'));
          if(dmg){
            btn.href = dmg.browser_download_url;
            version = `v${(latest.tag_name||'').replace(/^v/,'')}`;
          }
          let fetched = 0;
          releases.forEach(r => (r.assets||[]).forEach(a => fetched += (a.download_count||0)));
          if(fetched > 0) total = 85 + fetched;
        }
      }
    } catch(e){ /* keep fallback */ }

    if(version) ver.textContent = version;

    // Kick off animation immediately (don't wait for viewport; the card is
    // below the fold so IO was firing late or never in some contexts).
    const animate = () => {
      const dur = 1800, start = performance.now();
      const tick = now => {
        const p = Math.min(1, (now-start)/dur);
        const eased = 1 - Math.pow(1-p, 3);
        counter.textContent = Math.round(eased * total).toLocaleString();
        if(p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      const pct = Math.max(8, Math.min(100, (total / 1000) * 100));
      requestAnimationFrame(()=>{ if(bar) bar.style.width = pct + '%'; });
    };

    // Use IntersectionObserver if available, else fire right away.
    let fired = false;
    const run = () => { if(!fired){ fired = true; animate(); } };
    if('IntersectionObserver' in window){
      const io = new IntersectionObserver(entries => {
        if(entries.some(e=>e.isIntersecting)) run();
      }, {threshold:.2});
      io.observe(counter);
      // Safety: if it never intersects (e.g. tall viewport, sandbox), fire after 500ms
      setTimeout(run, 600);
    } else {
      run();
    }

    // ===== Alpha disclaimer modal =====
    const modal = document.getElementById('alpha-modal');
    const confirmBtn = document.getElementById('alpha-modal-confirm');
    if(modal && confirmBtn){
      const openModal = () => {
        confirmBtn.href = btn.href;
        modal.classList.add('on');
        modal.setAttribute('aria-hidden','false');
        document.body.style.overflow = 'hidden';
      };
      const closeModal = () => {
        modal.classList.remove('on');
        modal.setAttribute('aria-hidden','true');
        document.body.style.overflow = '';
      };
      btn.addEventListener('click', e => {
        e.preventDefault();
        openModal();
      });
      modal.querySelectorAll('[data-alpha-close]').forEach(el => {
        el.addEventListener('click', closeModal);
      });
      confirmBtn.addEventListener('click', () => {
        // let the browser navigate to the DMG, then close the modal
        setTimeout(closeModal, 200);
      });
      document.addEventListener('keydown', e => {
        if(e.key === 'Escape' && modal.classList.contains('on')) closeModal();
      });
    }

    // ===== Scroll-driven background Aperture =====
    // Write a 0→1 scroll-progress ratio to --scroll-progress on :root so
    // the Aperture makes exactly ONE revolution across the full page
    // height. CSS does the °-math (see .scroll-aperture rules). RAF
    // debounces the scroll event so we never do more than one style
    // write per frame.
    const root = document.documentElement;
    let progressPending = false;
    function applyProgress(){
      progressPending = false;
      const max = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const y = window.scrollY || window.pageYOffset || 0;
      const progress = Math.min(1, Math.max(0, y / max));
      root.style.setProperty('--scroll-progress', String(progress));
    }
    function queueProgress(){
      if(!progressPending){
        progressPending = true;
        requestAnimationFrame(applyProgress);
      }
    }
    window.addEventListener('scroll', queueProgress, { passive: true });
    // Recompute on resize — viewport height and document height both affect
    // the progress denominator.
    window.addEventListener('resize', queueProgress);
    // Initial value (page may load mid-scroll after anchor jumps).
    applyProgress();
  })();
})();

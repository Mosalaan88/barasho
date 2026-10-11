// Qaybaha wadajirka ah: header, footer, auth, api, toast
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function api(path, opts = {}) {
    const r = await fetch('/api' + path, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin'
    });
    let d = {}; try { d = await r.json(); } catch { /* */ }
    if (!r.ok) { const e = new Error(d.error || 'Cilad ayaa dhacday. Fadlan isku day mar kale.'); e.status = r.status; throw e; }
    return d;
  }

  let toastTimer;
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 4200);
  }

  const B = window.Barasho = { $, esc, api, toast, user: null };

  // ---- muuqaalka (madow / iftiin)
  const root = document.documentElement;
  try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch { /* */ }

  // ---- header + footer
  function header() {
    const el = $('#hdr'); if (!el) return;
    const path = location.pathname;
    el.innerHTML = `
    <header class="top"><div class="wrap">
      <a class="brand" href="/" aria-label="Barasho — bogga hore"><i>B</i>Barasho</a>
      <nav id="nav" aria-label="Menu-ga weyn">
        <a href="/#koorsooyin">Koorsooyin</a>
        <a href="/#jidka">Jidka barashada</a>
        <a href="/#bixinta">Sida loo bilaabo</a>
        <a href="/#su-aalo">Su'aalo</a>
      </nav>
      <button class="icon-btn" id="theme" type="button" aria-label="Beddel muuqaalka (madow / iftiin)">◐</button>
      <div class="auth-slot" id="authSlot"></div>
      <button class="icon-btn menu-btn" id="menu" type="button" aria-label="Fur menu-ga" aria-expanded="false">☰</button>
    </div></header>`;
    $('#theme').addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next; try { localStorage.setItem('theme', next); } catch { /* */ }
    });
    $('#menu').addEventListener('click', () => {
      const open = $('#nav').classList.toggle('open'); $('#menu').setAttribute('aria-expanded', open);
    });
    $('#nav').addEventListener('click', e => { if (e.target.tagName === 'A') $('#nav').classList.remove('open'); });
    if (path.startsWith('/learn') || path.startsWith('/admin')) $('#nav').querySelectorAll('a').forEach(a => a.removeAttribute('aria-current'));
  }
  function footer() {
    const el = $('#ftr'); if (!el) return;
    el.innerHTML = `<footer><div class="wrap"><span>© ${new Date().getFullYear()} Barasho. Xuquuqda oo dhan way dhowran tahay.</span><a id="ftWa" href="#" target="_blank" rel="noopener">Nala soo xiriir</a></div></footer>
    <a class="float-wa" id="flWa" href="#" target="_blank" rel="noopener" aria-label="WhatsApp nagala soo xiriir"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.300-.7-2.800-1.100-4.600-4-4.700-4.200-.1-.2-1.100-1.500-1.100-2.800 0-1.300.7-1.900.9-2.200.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.500l.8 2c.1.200.1.400 0 .5l-.4.600c-.1.200-.3.300-.1.600.2.300.8 1.300 1.700 2.100 1.200 1 2.100 1.300 2.400 1.500.3.100.5.100.6-.1l.9-1.100c.2-.3.400-.2.600-.1l1.900.9c.3.100.4.200.5.300.1.200.1.800-.1 1.300z"/></svg></a>`;
  }
  function authSlot() {
    const s = $('#authSlot'); if (!s) return;
    if (!B.user) { s.innerHTML = '<button class="btn sm" id="loginBtn" type="button">Gal</button>'; $('#loginBtn').addEventListener('click', () => B.openAuth('login').then(u => u && location.reload())); return; }
    s.innerHTML = `${B.user.role === 'admin' ? '<a class="btn ghost sm" href="/admin">Admin</a>' : ''}
      <a class="btn sm" href="/learn">Barashadayda</a>
      <button class="btn ghost sm hide-m" id="logoutBtn" type="button">Ka bax</button>`;
    $('#logoutBtn').addEventListener('click', async () => { await api('/logout', { method: 'POST', body: {} }); location.href = '/'; });
  }

  // ---- Gal / Is-diiwaangeli
  B.openAuth = function (mode = 'login') {
    return new Promise(resolve => {
      let dlg = $('#authDlg'); if (dlg) dlg.remove();
      dlg = document.createElement('dialog'); dlg.id = 'authDlg';
      dlg.innerHTML = `<div class="dlg">
        <button class="icon-btn x" type="button" aria-label="Xidh" data-close>✕</button>
        <h2 id="aTitle"></h2><p class="sub" id="aSub"></p>
        <div class="dlg-tabs" role="tablist">
          <button type="button" role="tab" data-m="login">Gal</button>
          <button type="button" role="tab" data-m="register">Samee akoon</button>
        </div>
        <form id="aForm" novalidate>
          <div class="f hide" id="nameF"><label for="aName">Magacaaga</label><input id="aName" type="text" autocomplete="name"></div>
          <div class="f"><label for="aEmail">Email</label><input id="aEmail" type="email" autocomplete="email" required></div>
          <div class="f"><label for="aPass">Password</label><input id="aPass" type="password" autocomplete="current-password" minlength="8" required></div>
          <p class="err" id="aErr" role="alert"></p>
          <button class="btn" style="width:100%" id="aGo" type="submit"></button>
        </form></div>`;
      document.body.appendChild(dlg);
      let m = mode, done = false;
      const set = x => {
        m = x;
        $('#aTitle', dlg).textContent = m === 'login' ? 'Soo dhawaaw' : 'Samee akoonkaaga';
        $('#aSub', dlg).textContent = m === 'login' ? 'Gal si aad u aragto koorsooyinkaaga.' : 'Waxay qaadataa hal daqiiqo.';
        $('#aGo', dlg).textContent = m === 'login' ? 'Gal' : 'Samee akoon';
        $('#nameF', dlg).classList.toggle('hide', m === 'login');
        $('#aPass', dlg).autocomplete = m === 'login' ? 'current-password' : 'new-password';
        dlg.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-selected', b.dataset.m === m));
        $('#aErr', dlg).textContent = '';
      };
      dlg.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => set(b.dataset.m)));
      dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
      dlg.addEventListener('close', () => { if (!done) resolve(null); dlg.remove(); });
      $('#aForm', dlg).addEventListener('submit', async e => {
        e.preventDefault();
        const btn = $('#aGo', dlg); btn.disabled = true; $('#aErr', dlg).textContent = '';
        try {
          const body = { email: $('#aEmail', dlg).value, password: $('#aPass', dlg).value };
          if (m === 'register') body.name = $('#aName', dlg).value;
          const r = await api(m === 'login' ? '/login' : '/register', { method: 'POST', body });
          B.user = r.user; done = true; dlg.close(); authSlot(); resolve(r.user);
        } catch (err) { $('#aErr', dlg).textContent = err.message; }
        btn.disabled = false;
      });
      set(mode); dlg.showModal(); $('#aEmail', dlg).focus();
    });
  };

  // ---- Muuqaal: YouTube / Vimeo -> embed
  B.embed = function (url) {
    try {
      const u = new URL(url); const h = u.hostname.replace(/^www\./, '');
      let id;
      if (h === 'youtu.be') id = u.pathname.slice(1);
      else if (h === 'youtube.com' || h === 'm.youtube.com') id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/) || [])[1];
      if (id && /^[\w-]{6,20}$/.test(id)) return 'https://www.youtube-nocookie.com/embed/' + id;
      if (h === 'vimeo.com' || h === 'player.vimeo.com') { const m = u.pathname.match(/(\d{5,})/); if (m) return 'https://player.vimeo.com/video/' + m[1]; }
    } catch { /* */ }
    return null;
  };

  header(); footer();
  B.ready = api('/me').then(r => { B.user = r.user; }).catch(() => { }).then(async () => {
    authSlot();
    try { const c = await api('/config'); ['#ftWa', '#flWa'].forEach(id => { const f = $(id); if (f) f.href = 'https://wa.me/' + c.whatsapp + '?text=' + encodeURIComponent('Salaan, su\'aal baan qabaa.'); }); B.config = c; } catch { /* */ }
  });
})();

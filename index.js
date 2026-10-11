(function () {
  const B = window.Barasho, { $, esc, api, toast } = B;
  const CATS = [{ k: 'all', l: 'Dhammaan' }, { k: 'ai', l: 'AI' }, { k: 'eng', l: 'Injineernimo' }, { k: 'prod', l: 'Wax-soo-saarid' }];
  let courses = [], cat = 'all';

  const money = n => '$' + (Number.isInteger(+n) ? +n : (+n).toFixed(2));
  const code = s => esc(s).replace(/(&quot;.*?&quot;)/g, '<em>$1</em>');
  const wa = msg => 'https://wa.me/' + (B.config?.whatsapp || '') + '?text=' + encodeURIComponent(msg);

  function facts() {
    const lessons = courses.reduce((n, c) => n + c.lessons_total, 0);
    const cats = new Set(courses.map(c => c.category)).size;
    $('#facts').innerHTML = `<div><b>${courses.length}</b>koorsooyin</div><div><b>${lessons}</b>cashar</div><div><b>${cats}</b>qaybood</div>`;
  }

  function action(c) {
    if (c.my_status === 'approved') return `<a class="btn sm" href="/learn?c=${c.id}">Fur koorsada</a>`;
    if (c.my_status === 'pending') return `<button class="btn ghost sm" disabled>Waa la eegayaa</button>`;
    return `<button class="btn sm" data-buy="${c.id}" type="button">Iska diiwaangeli</button>`;
  }

  function render() {
    const list = cat === 'all' ? courses : courses.filter(c => c.category === cat);
    $('#grid').innerHTML = list.length ? list.map(c => `
      <article class="card">
        <div class="shot"><pre aria-hidden="true">${code(c.code)}</pre>
          <div class="price">${money(c.price)}${c.old_price ? `<s>${money(c.old_price)}</s>` : ''}</div></div>
        <div class="body">
          <h3>${esc(c.title)}</h3><p>${esc(c.blurb)}</p>
          <div class="meta"><span>${c.modules} qaybood · ${c.lessons_total} cashar</span>${action(c)}</div>
        </div>
      </article>`).join('') : '<div class="empty">Koorsooyin cusub ayaa dhawaan imanaya.</div>';
  }

  $('#tabs').innerHTML = CATS.map((c, i) => `<button role="tab" type="button" data-k="${c.k}" aria-selected="${i === 0}">${c.l}</button>`).join('');
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    cat = b.dataset.k;
    document.querySelectorAll('#tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    render();
  });

  // ---- Foomka codsiga
  function orderDialog(c) {
    const pays = B.config.payments;
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `<div class="dlg">
      <button class="icon-btn x" type="button" aria-label="Xidh" data-close>✕</button>
      <h2>${esc(c.title)}</h2>
      <p class="sub">Qiimaha: <b>${money(c.price)}</b></p>
      <div class="note"><b>1.</b> U dir <b>${money(c.price)}</b> mid ka mid ah lambarrada hoose.<br><b>2.</b> Halkan ku geli faahfaahinta lacag-bixinta.<br><b>3.</b> Marka la xaqiijiyo, koorsada way furmaysaa.</div>
      <form id="oForm" novalidate>
        <div class="f"><span class="lbl">Habka lacag-bixinta</span>
          ${pays.map((p, i) => `<label class="pay-opt"><input type="radio" name="method" value="${esc(p.name)}" ${i === 0 ? 'checked' : ''}><b>${esc(p.name)}</b><code>${esc(p.number)}</code></label>`).join('')}
        </div>
        <div class="f"><label for="oPhone">Lambarka aad lacagta ka dirtay</label><input id="oPhone" type="tel" inputmode="tel" placeholder="61 234 5678" required></div>
        <div class="f"><label for="oRef">Lambarka muujinta (transaction ID)</label><input id="oRef" type="text" placeholder="Tusaale: MP240101.1234" required></div>
        <p class="err" id="oErr" role="alert"></p>
        <button class="btn" style="width:100%" type="submit">U dir codsiga</button>
      </form></div>`;
    document.body.appendChild(dlg);
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => dlg.remove());
    $('#oForm', dlg).addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; $('#oErr', dlg).textContent = '';
      try {
        await api('/orders', { method: 'POST', body: {
          course_id: c.id, method: dlg.querySelector('input[name=method]:checked').value,
          phone: $('#oPhone', dlg).value, reference: $('#oRef', dlg).value } });
        dlg.close(); toast('Codsigaaga waa la helay. Marka la xaqiijiyo, koorsada way furmaysaa.');
        await load();
      } catch (err) { $('#oErr', dlg).textContent = err.message; btn.disabled = false; }
    });
    dlg.showModal();
  }

  $('#grid').addEventListener('click', async e => {
    const b = e.target.closest('[data-buy]'); if (!b) return;
    const id = +b.dataset.buy;
    if (!B.user) {
      const u = await B.openAuth('register'); if (!u) return;
      await load();
    }
    const c = courses.find(x => x.id === id);
    if (!c) return;
    if (c.my_status === 'approved') return location.href = '/learn?c=' + id;
    if (c.my_status === 'pending') return toast('Codsigaaga hore wali waa la eegayaa.');
    orderDialog(c);
  });

  async function load() {
    const r = await api('/courses'); courses = r.courses; facts(); render();
  }

  // ---- habka lacag-bixinta (qaybta hoose)
  function methods() {
    $('#methods').innerHTML = B.config.payments.map(p => `<div class="method"><b>${esc(p.name)}</b><code>${esc(p.number)}</code></div>`).join('') +
      `<a class="btn ghost" style="margin-top:6px" target="_blank" rel="noopener" href="${wa('Salaan, su\'aal baan ka qabaa lacag-bixinta.')}">Su'aal ka weydii WhatsApp</a>`;
  }

  // ---- hero: koodh la qorayo
  function typing() {
    const SRC = '<h1>Salaan, adduunyo!</h1>\n<p>Waxaan baranayaa koodh.</p>\n<button>Bilow</button>';
    const pre = $('#code'), out = $('#out');
    const tint = s => esc(s).replace(/(&lt;\/?[a-z0-9]+&gt;)/g, '<span class="t">$1</span>');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { pre.innerHTML = tint(SRC); out.classList.add('on'); return; }
    let i = 0;
    (function tick() {
      pre.innerHTML = tint(SRC.slice(0, i)) + '<span class="caret"></span>';
      if (i++ < SRC.length) setTimeout(tick, 42); else out.classList.add('on');
    })();
  }

  typing();
  B.ready.then(async () => {
    try { methods(); await load(); }
    catch { $('#grid').innerHTML = '<div class="empty">Koorsooyinka lama soo gelin karo. Fadlan dib u cusboonaysii bogga.</div>'; }
  });
})();

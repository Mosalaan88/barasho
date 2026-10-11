(function () {
  const B = window.Barasho, { $, esc, api, toast } = B;
  const stLabel = { pending: 'Sugaya', approved: 'La ogolaaday', rejected: 'La diiday' };
  const catLabel = { ai: 'AI', eng: 'Injineernimo', prod: 'Wax-soo-saarid' };
  let filter = '', courses = [];
  const date = s => esc((s || '').slice(0, 16));
  const money = n => '$' + (Math.round(n * 100) / 100);

  async function stats() {
    const s = await api('/admin/stats');
    $('#stats').innerHTML = `<div class="stat"><b>${s.pending}</b><span>Codsiyo sugaya</span></div>
      <div class="stat"><b>${s.approved}</b><span>Iibab la ogolaaday</span></div>
      <div class="stat"><b>${money(s.revenue)}</b><span>Dakhli la ogolaaday</span></div>
      <div class="stat"><b>${s.students}</b><span>Arday</span></div>`;
  }

  async function orders() {
    const { orders: rows } = await api('/admin/orders' + (filter ? '?status=' + filter : ''));
    $('#panel').innerHTML = `<div class="toolbar"><div class="tabs" style="margin:0;border:0" id="flt">
      ${[['', 'Dhammaan'], ['pending', 'Sugaya'], ['approved', 'La ogolaaday'], ['rejected', 'La diiday']].map(([k, l]) =>
        `<button type="button" data-f="${k}" aria-selected="${filter === k}">${l}</button>`).join('')}</div></div>
      <div class="tablewrap"><table><thead><tr><th>Arday</th><th>Koorsada</th><th>Lacag-bixin</th><th>Taariikh</th><th>Xaalad</th><th></th></tr></thead><tbody>
      ${rows.length ? rows.map(o => `<tr>
        <td><b>${esc(o.user_name)}</b><br><small>${esc(o.user_email)}</small></td>
        <td>${esc(o.course_title)}<br><small>${money(o.amount)}</small></td>
        <td>${esc(o.method)}<br><small>${esc(o.phone)}</small><br><small>ID: ${esc(o.reference)}</small></td>
        <td>${date(o.created_at)}</td>
        <td><span class="badge ${o.status}">${stLabel[o.status]}</span></td>
        <td><div class="acts">
          ${o.status !== 'approved' ? `<button class="btn ok sm" data-o="${o.id}" data-s="approved" type="button">Ogolow</button>` : ''}
          ${o.status === 'pending' ? `<button class="btn danger sm" data-o="${o.id}" data-s="rejected" type="button">Diid</button>` : ''}
          ${o.status === 'approved' ? `<button class="btn danger sm" data-o="${o.id}" data-s="rejected" type="button">Jooji</button>` : ''}
        </div></td></tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted)">Codsi ma jiro.</td></tr>'}
      </tbody></table></div>`;
    $('#flt').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; orders(); } });
    $('#panel').querySelectorAll('[data-o]').forEach(b => b.addEventListener('click', async () => {
      b.disabled = true;
      try { await api('/admin/orders/' + b.dataset.o, { method: 'POST', body: { status: b.dataset.s } }); toast('La kaydiyay.'); await Promise.all([orders(), stats()]); }
      catch (e) { toast(e.message); b.disabled = false; }
    }));
  }

  async function users() {
    const { users: rows } = await api('/admin/users');
    $('#panel').innerHTML = `<div class="tablewrap"><table><thead><tr><th>Magac</th><th>Email</th><th>Koorsooyin</th><th>Taariikh</th></tr></thead><tbody>
      ${rows.map(u => `<tr><td>${esc(u.name)} ${u.role === 'admin' ? '<span class="badge">admin</span>' : ''}</td><td>${esc(u.email)}</td><td>${u.courses}</td><td>${date(u.created_at)}</td></tr>`).join('')}
      </tbody></table></div>`;
  }

  async function coursesTab() {
    courses = (await api('/admin/courses')).courses;
    $('#panel').innerHTML = `<div class="toolbar"><span></span><button class="btn sm" id="newC" type="button">+ Koorsi cusub</button></div>
      <div class="tablewrap"><table><thead><tr><th>Koorsada</th><th>Qiimaha</th><th>Casharro</th><th>Xaalad</th><th></th></tr></thead><tbody>
      ${courses.map(c => `<tr><td><b>${esc(c.title)}</b><br><small>${catLabel[c.category] || ''}</small></td>
        <td>${money(c.price)}${c.old_price ? ` <small><s>${money(c.old_price)}</s></small>` : ''}</td>
        <td>${c.lessons.length}</td><td>${c.published ? '<span class="badge approved">Muuqda</span>' : '<span class="badge">Qarsoon</span>'}</td>
        <td><div class="acts"><button class="btn ghost sm" data-ed="${c.id}" type="button">Wax ka beddel</button>
        <button class="btn ghost sm" data-ls="${c.id}" type="button">Casharro</button></div></td></tr>`).join('')}
      </tbody></table></div>`;
    $('#newC').addEventListener('click', () => courseForm());
    $('#panel').querySelectorAll('[data-ed]').forEach(b => b.addEventListener('click', () => courseForm(courses.find(c => c.id === +b.dataset.ed))));
    $('#panel').querySelectorAll('[data-ls]').forEach(b => b.addEventListener('click', () => lessonsDlg(+b.dataset.ls)));
  }

  function dlg(html, wide) {
    const d = document.createElement('dialog'); if (wide) d.className = 'wide';
    d.innerHTML = `<div class="dlg"><button class="icon-btn x" type="button" aria-label="Xidh" data-close>✕</button>${html}</div>`;
    document.body.appendChild(d);
    d.querySelector('[data-close]').addEventListener('click', () => d.close());
    d.addEventListener('close', () => d.remove());
    d.showModal(); return d;
  }

  function courseForm(c) {
    const e = !!c; c = c || { title: '', blurb: '', category: 'eng', price: 10, old_price: '', modules: 0, lessons_total: 0, code: '', published: 1 };
    const d = dlg(`<h2>${e ? 'Wax ka beddel koorsada' : 'Koorsi cusub'}</h2><p class="sub">&nbsp;</p>
      <form id="cf" novalidate>
        <div class="f"><label for="cT">Cinwaan</label><input id="cT" type="text" value="${esc(c.title)}" required></div>
        <div class="f"><label for="cB">Sharaxaad gaaban</label><input id="cB" type="text" value="${esc(c.blurb)}"></div>
        <div class="row2">
          <div class="f"><label for="cC">Qaybta</label><select id="cC">${Object.entries(catLabel).map(([k, v]) => `<option value="${k}" ${c.category === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="f"><label for="cS">Muuqaal</label><select id="cS"><option value="1" ${c.published ? 'selected' : ''}>Muuqda</option><option value="0" ${c.published ? '' : 'selected'}>Qarsoon</option></select></div>
          <div class="f"><label for="cP">Qiimaha ($)</label><input id="cP" type="number" min="0" step="0.5" value="${c.price}"></div>
          <div class="f"><label for="cO">Qiimaha hore ($, ikhtiyaari)</label><input id="cO" type="number" min="0" step="0.5" value="${c.old_price ?? ''}"></div>
          <div class="f"><label for="cM">Tirada qaybaha</label><input id="cM" type="number" min="0" value="${c.modules}"></div>
          <div class="f"><label for="cL">Tirada casharrada (muuqaal)</label><input id="cL" type="number" min="0" value="${c.lessons_total}"></div>
        </div>
        <div class="f"><label for="cK">Koodh gaaban oo kaarka ku muuqda</label><textarea id="cK">${esc(c.code)}</textarea></div>
        <p class="err" id="cE" role="alert"></p>
        <div style="display:flex;gap:8px;justify-content:space-between">
          <button class="btn" type="submit">Kaydi</button>
          ${e ? '<button class="btn danger" id="cDel" type="button">Tirtir</button>' : ''}
        </div>
      </form>`, true);
    $('#cf', d).addEventListener('submit', async ev => {
      ev.preventDefault();
      const body = { title: $('#cT', d).value, blurb: $('#cB', d).value, category: $('#cC', d).value, published: $('#cS', d).value === '1',
        price: $('#cP', d).value, old_price: $('#cO', d).value, modules: $('#cM', d).value, lessons_total: $('#cL', d).value, code: $('#cK', d).value };
      try { await api('/admin/courses' + (e ? '/' + c.id : ''), { method: e ? 'PUT' : 'POST', body }); d.close(); toast('La kaydiyay.'); coursesTab(); }
      catch (err) { $('#cE', d).textContent = err.message; }
    });
    const del = $('#cDel', d); if (del) del.addEventListener('click', async () => {
      if (!confirm('Ma hubtaa inaad tirtirto koorsadan iyo casharradeeda oo dhan?')) return;
      try { await api('/admin/courses/' + c.id, { method: 'DELETE' }); d.close(); coursesTab(); } catch (err) { $('#cE', d).textContent = err.message; }
    });
  }

  async function lessonsDlg(id) {
    const c = (await api('/admin/courses')).courses.find(x => x.id === id);
    const d = dlg(`<h2>${esc(c.title)}: casharrada</h2><p class="sub">Ku dar linkiga YouTube (Unlisted) ama Vimeo. Kaliya ardayda bixisay ayaa arkaysa.</p>
      <div id="ll">${c.lessons.map(l => `<div class="lesson-row"><div><b>${esc(l.title)}</b><small>${esc(l.module)} · ${l.video_url ? esc(l.video_url) : 'muuqaal ma jiro'}</small></div>
        <div class="acts"><button class="btn ghost sm" data-e="${l.id}" type="button">Wax ka beddel</button><button class="btn danger sm" data-d="${l.id}" type="button">Tirtir</button></div></div>`).join('') || '<p class="sub">Cashar ma jiro.</p>'}</div>
      <h3 style="font-family:var(--display);margin:22px 0 10px" id="lfTitle">Cashar cusub</h3>
      <form id="lf" novalidate>
        <div class="row2"><div class="f"><label for="lM">Qayb (module)</label><input id="lM" type="text" value="${esc(c.lessons.at(-1)?.module || 'Qaybta 1')}"></div>
        <div class="f"><label for="lT">Cinwaanka casharka</label><input id="lT" type="text" required></div></div>
        <div class="f"><label for="lU">Link-ga muuqaalka (https://…)</label><input id="lU" type="url" placeholder="https://youtu.be/..."></div>
        <p class="err" id="lE" role="alert"></p>
        <div style="display:flex;gap:8px"><button class="btn" type="submit" id="lGo">Ku dar</button><button class="btn ghost hide" type="button" id="lCancel">Jooji wax-beddelka</button></div>
      </form>`, true);
    let editing = null;
    const reset = () => { editing = null; $('#lT', d).value = ''; $('#lU', d).value = ''; $('#lGo', d).textContent = 'Ku dar'; $('#lfTitle', d).textContent = 'Cashar cusub'; $('#lCancel', d).classList.add('hide'); };
    $('#lCancel', d).addEventListener('click', reset);
    d.querySelectorAll('[data-e]').forEach(b => b.addEventListener('click', () => {
      const l = c.lessons.find(x => x.id === +b.dataset.e); editing = l.id;
      $('#lM', d).value = l.module; $('#lT', d).value = l.title; $('#lU', d).value = l.video_url;
      $('#lGo', d).textContent = 'Kaydi'; $('#lfTitle', d).textContent = 'Wax ka beddel casharka'; $('#lCancel', d).classList.remove('hide'); $('#lT', d).focus();
    }));
    d.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Tirtir casharkan?')) return;
      try { await api('/admin/lessons/' + b.dataset.d, { method: 'DELETE' }); d.close(); lessonsDlg(id); coursesTab(); } catch (e) { $('#lE', d).textContent = e.message; }
    }));
    $('#lf', d).addEventListener('submit', async ev => {
      ev.preventDefault();
      const prev = editing && c.lessons.find(x => x.id === editing);
      const body = { module: $('#lM', d).value, title: $('#lT', d).value, video_url: $('#lU', d).value, position: prev ? prev.position : 0 };
      try {
        await api(editing ? '/admin/lessons/' + editing : '/admin/courses/' + id + '/lessons', { method: editing ? 'PUT' : 'POST', body });
        d.close(); lessonsDlg(id); coursesTab();
      } catch (e) { $('#lE', d).textContent = e.message; }
    });
  }

  const views = { orders, courses: coursesTab, users };
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    document.querySelectorAll('#tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    views[b.dataset.t]().catch(err => toast(err.message));
  });

  (async function () {
    await B.ready;
    if (!B.user) { const u = await B.openAuth('login'); if (!u) { location.href = '/'; return; } }
    if (B.user.role !== 'admin') { $('#panel').innerHTML = '<div class="empty">Boggan waa u gaar admin-ka.</div>'; return; }
    await Promise.all([stats(), orders()]);
  })().catch(e => toast(e.message));
})();

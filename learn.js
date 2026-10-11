(function () {
  const B = window.Barasho, { $, esc, api, toast } = B;
  const stLabel = { pending: 'Waa la eegayaa', approved: 'La ogolaaday', rejected: 'La diiday' };
  let courses = [], current = null, data = null;

  async function start() {
    await B.ready;
    if (!B.user) { const u = await B.openAuth('login'); if (!u) { location.href = '/'; return; } }
    const [c, o] = await Promise.all([api('/learn/courses'), api('/my/orders')]);
    courses = c.courses;
    $('#myOrders').innerHTML = o.orders.length ? o.orders.map(x =>
      `<li><small><b>${esc(x.title)}</b><br><span class="badge ${x.status}">${stLabel[x.status]}</span></small></li>`).join('')
      : '<li><small>Wali codsi ma jiro.</small></li>';
    if (!courses.length) {
      $('#learn').classList.add('hide'); const e = $('#empty'); e.classList.remove('hide');
      e.innerHTML = 'Wali koorsooyin ma lihid. <a href="/#koorsooyin" style="color:var(--accent)">Eeg koorsooyinka</a>. Haddii aad hore u bixisay, sug in la xaqiijiyo lacagtaada.';
      return;
    }
    const want = +new URLSearchParams(location.search).get('c');
    await open((courses.find(x => x.id === want) || courses[0]).id);
  }

  function renderList() {
    $('#myCourses').innerHTML = courses.map(c => {
      const pct = c.total ? Math.round(c.done / c.total * 100) : 0;
      return `<li><button type="button" data-c="${c.id}" aria-current="${c.id === current}">${esc(c.title)}
        <small>${c.done}/${c.total} cashar</small><div class="bar"><i style="width:${pct}%"></i></div></button></li>`;
    }).join('');
  }
  $('#myCourses').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) open(+b.dataset.c); });

  async function open(id) {
    current = id;
    try { data = await api('/learn/' + id); } catch (e) { return toast(e.message); }
    renderList();
    const first = data.lessons.find(l => !l.done) || data.lessons[0];
    draw(first ? first.id : null);
  }

  function draw(id) {
    const L = data.lessons, cur = L.find(l => l.id === id);
    let player = '<div class="player">Casharro wali lama soo gelin koorsadan.</div>', now = '';
    if (cur) {
      const emb = cur.video_url && B.embed(cur.video_url);
      player = emb
        ? `<div class="player"><iframe src="${esc(emb)}" title="${esc(cur.title)}" allow="fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
        : cur.video_url
          ? `<div class="player"><div><p>Muuqaalkan waa link dibadda ah.</p><p style="margin-top:12px"><a class="btn" href="${esc(cur.video_url)}" target="_blank" rel="noopener">Fur muuqaalka</a></p></div></div>`
          : '<div class="player">Muuqaalkan wali lama soo gelin.</div>';
      const next = L[L.indexOf(cur) + 1];
      now = `<div class="now"><h2>${esc(cur.title)}</h2><div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ${cur.done ? 'ghost' : 'ok'} sm" id="doneBtn" type="button">${cur.done ? 'Ka saar dhammaystirka' : 'Calaamadee dhammaaday'}</button>
        ${next ? '<button class="btn sm" id="nextBtn" type="button">Casharka xiga</button>' : ''}</div></div>`;
    }
    const mods = [...new Set(L.map(l => l.module))];
    const list = mods.map(m => `<div class="mod"><h3>${esc(m)}</h3>${L.filter(l => l.module === m).map(l =>
      `<button type="button" class="les ${l.done ? 'done' : ''}" data-l="${l.id}" aria-current="${l.id === id}"><span class="tick">${l.done ? '✓' : ''}</span>${esc(l.title)}</button>`).join('')}</div>`).join('');
    $('#stage').innerHTML = `<h2 style="font-family:var(--display);font-size:20px;color:var(--muted);margin-bottom:12px">${esc(data.course.title)}</h2>${player}${now}${list}`;
    $('#stage').querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => draw(+b.dataset.l)));
    const d = $('#doneBtn'); if (d) d.addEventListener('click', async () => {
      d.disabled = true;
      try {
        await api('/lessons/' + cur.id + '/done', { method: 'POST', body: { done: !cur.done } });
        cur.done = !cur.done;
        courses.find(x => x.id === current).done = data.lessons.filter(l => l.done).length;
        renderList(); draw(id);
      } catch (e) { toast(e.message); d.disabled = false; }
    });
    const n = $('#nextBtn'); if (n) n.addEventListener('click', () => draw(L[L.indexOf(cur) + 1].id));
  }

  start().catch(e => toast(e.message));
})();

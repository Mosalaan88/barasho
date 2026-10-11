// Imtixaan toos ah: node test.js  (wuxuu isticmaalaa database ku-meel-gaar ah)
process.env.DATA_DIR = require('fs').mkdtempSync(require('os').tmpdir() + '/barasho-');
process.env.ADMIN_EMAIL = 'boss@test.so';
process.env.ADMIN_PASSWORD = 'AdminPass123';
const assert = require('assert');
const app = require('./server');

(async () => {
  const srv = app.listen(0); const base = 'http://127.0.0.1:' + srv.address().port;
  const mk = () => { let cookie = ''; return async (p, method = 'GET', body, headers = {}) => {
    const r = await fetch(base + p, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    let j = null; try { j = await r.json(); } catch {} return { s: r.status, j };
  }; };
  const t = (n, ok) => console.log((ok ? 'PASS' : 'FAIL') + '  ' + n) || assert(ok, n);

  const anon = mk(), stu = mk(), adm = mk(), stu2 = mk();
  let r = await anon('/api/courses'); t('koorsooyinka dadweynaha (5)', r.s === 200 && r.j.courses.length === 5);
  t('anon ma arko video-yo', !JSON.stringify(r.j).includes('video_url'));
  r = await anon('/api/learn/1'); t('anon -> 401 learn', r.s === 401);
  r = await anon('/api/admin/orders'); t('anon -> 401 admin', r.s === 401);

  r = await stu('/api/register', 'POST', { name: 'Faadumo', email: 'F@Test.so', password: 'short' }); t('password gaaban la dididay', r.s === 400);
  r = await stu('/api/register', 'POST', { name: 'Faadumo', email: 'f@test.so', password: 'password123' }); t('register ok', r.s === 200 && r.j.user.role === 'student');
  r = await stu2('/api/register', 'POST', { name: 'Cali', email: 'f@test.so', password: 'password123' }); t('email isku mid la diiday', r.s === 400);
  r = await stu('/api/me'); t('/me wuxuu soo celiyay user', r.j.user?.email === 'f@test.so');

  r = await stu('/api/learn/1'); t('arday aan bixin -> 403', r.s === 403);
  r = await stu('/api/orders', 'POST', { course_id: 1, method: 'Bitcoin', phone: '612345678', reference: 'ABC123' }); t('habka lacag-bixinta khalad', r.s === 400);
  r = await stu('/api/orders', 'POST', { course_id: 1, method: 'Zaad', phone: 'abc', reference: 'ABC123' }); t('lambar telefoon khalad', r.s === 400);
  r = await stu('/api/orders', 'POST', { course_id: 1, method: 'Zaad', phone: '63 123 4567', reference: 'TX-998' }); t('codsi la sameeyay', r.s === 200 && r.j.order.status === 'pending');
  r = await stu('/api/orders', 'POST', { course_id: 1, method: 'Zaad', phone: '63 123 4567', reference: 'TX-998' }); t('codsi labaad la diiday', r.s === 400);
  r = await stu('/api/learn/1'); t('weli pending -> 403', r.s === 403);
  r = await stu('/api/admin/orders'); t('arday -> admin 403', r.s === 403);
  r = await stu('/api/courses'); t('my_status=pending', r.j.courses[0].my_status === 'pending');

  r = await adm('/api/login', 'POST', { email: 'boss@test.so', password: 'wrong' }); t('admin password khalad 401', r.s === 401);
  r = await adm('/api/login', 'POST', { email: 'boss@test.so', password: 'AdminPass123' }); t('admin login', r.s === 200 && r.j.user.role === 'admin');
  r = await adm('/api/admin/orders'); const oid = r.j.orders[0].id; t('admin wuxuu arkaa codsiga', r.j.orders.length === 1 && r.j.orders[0].user_email === 'f@test.so');
  r = await adm('/api/admin/stats'); t('stats pending=1', r.j.pending === 1 && r.j.revenue === 0);
  r = await adm('/api/admin/orders/' + oid, 'POST', { status: 'approved' }); t('admin wuu ogolaaday', r.s === 200);
  r = await adm('/api/admin/stats'); t('dakhli = 10', r.j.revenue === 10);

  r = await stu('/api/learn/1'); t('hadda gelitaan wuu leeyahay', r.s === 200 && r.j.lessons.length === 3);
  r = await stu('/api/learn/2'); t('koorsada kale weli 403', r.s === 403);
  const lid = (await stu('/api/learn/1')).j.lessons[0].id;
  r = await stu('/api/lessons/' + lid + '/done', 'POST', { done: true }); t('cashar dhammaaday', r.s === 200);
  r = await stu('/api/learn/courses'); t('horumar 1/3', r.j.courses.length === 1 && r.j.courses[0].done === 1 && r.j.courses[0].total === 3);
  r = await stu('/api/lessons/' + (lid + 20) + '/done', 'POST', { done: true }); t('cashar aan gaarin 403', r.s === 403);

  // admin koorsooyin / casharro
  r = await adm('/api/admin/courses', 'POST', { title: 'Koorso Test', price: 5, category: 'ai', published: true }); const cid = r.j.id; t('koorsi cusub', r.s === 200);
  r = await adm('/api/admin/courses/' + cid + '/lessons', 'POST', { title: 'C1', video_url: 'javascript:alert(1)' }); t('video_url ma ahaan karo javascript:', r.s === 400);
  r = await adm('/api/admin/courses/' + cid + '/lessons', 'POST', { title: 'C1', video_url: 'https://youtu.be/dQw4w9WgXcQ' }); t('cashar cusub', r.s === 200);
  r = await anon('/api/courses'); t('koorsada cusub waa muuqataa', r.j.courses.length === 6);
  r = await adm('/api/admin/courses/' + cid, 'PUT', { title: 'Koorso Test', price: 5, category: 'ai', published: false }); r = await anon('/api/courses'); t('koorsada qarsoon lama arko', r.j.courses.length === 5);
  r = await adm('/api/admin/courses/' + cid, 'DELETE'); t('koorsi la tirtiray', r.s === 200);

  // amni
  r = await stu('/api/orders', 'POST', { course_id: 2, method: 'Zaad', phone: '63 123 4567', reference: 'XYZ' }, { Origin: 'https://evil.example' }); t('CSRF: origin kale la diiday', r.s === 403);
  const h = await fetch(base + '/'); t('CSP header jiraa', !!h.headers.get('content-security-policy'));
  t('static pages: /learn /admin', (await fetch(base + '/learn')).status === 200 && (await fetch(base + '/admin')).status === 200);
  r = await stu('/api/logout', 'POST', {}); r = await stu('/api/me'); t('logout -> user null', r.j.user === null);

  for (let i = 0; i < 12; i++) r = await anon('/api/login', 'POST', { email: 'x@y.so', password: 'zzzzzzzzzz' });
  t('rate limit 429', r.s === 429);

  console.log('\nWAX WALBA WAA SHAQEEYAAN'); srv.close(); process.exit(0);
})().catch(e => { console.error('\nFAIL:', e.message); process.exit(1); });

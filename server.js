// Barasho — backend (Node.js + Express + SQLite)
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

try { process.loadEnvFile(path.join(__dirname, '.env')); } catch { /* .env ma jiro — waa caadi */ }

const db = require('./db');
const PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const WHATSAPP = (process.env.WHATSAPP || '252000000000').replace(/\D/g, '');
const PAYMENTS = (process.env.PAYMENTS || 'EVC Plus:61 000 0000,Zaad:63 000 0000,eDahab:65 000 0000')
  .split(',').map(s => s.trim()).filter(Boolean)
  .map(s => { const i = s.indexOf(':'); return { name: s.slice(0, i).trim(), number: s.slice(i + 1).trim() }; });

// ---- Sirta JWT: waa la keydiyaa si dadku u ahaadaan gudaha marka server-ku dib u bilowdo
let SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  const f = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), '.secret');
  try { SECRET = fs.readFileSync(f, 'utf8').trim(); }
  catch { SECRET = crypto.randomBytes(48).toString('hex'); fs.writeFileSync(f, SECRET, { mode: 0o600 }); }
}

// ---- Admin-ka ugu horreeya
(function seedAdmin() {
  if (db.prepare("SELECT 1 FROM users WHERE role='admin'").get()) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  let pass = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!pass) { pass = crypto.randomBytes(9).toString('base64url'); generated = true; }
  db.prepare("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'admin')")
    .run('Admin', email, bcrypt.hashSync(pass, 12));
  console.log('\n=== ADMIN LA SAMEEYAY ===\n  Email   : ' + email +
    (generated ? '\n  Password: ' + pass + '\n  (Kaydso — mar dambe lama muujin doono)' : '\n  Password: (kan aad ku qortay .env)') + '\n');
})();

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      frameSrc: ['https://www.youtube-nocookie.com', 'https://player.vimeo.com'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: PROD ? [] : null
    }
  }
}));
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

// ---- Ilaalinta CSRF: codsiyada beddelaya waa inay ka yimaadaan isla website-ka
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin) {
    try { if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Codsigan lama ogola.' }); }
    catch { return res.status(403).json({ error: 'Codsigan lama ogola.' }); }
  }
  next();
});

// ---- Xaddidaadda isku-dayga (login / register)
const hits = new Map();
function limiter(max, windowMs) {
  return (req, res, next) => {
    const key = req.ip + req.path, now = Date.now();
    const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: 'Isku-day badan. Fadlan sug dhowr daqiiqo.' });
    arr.push(now); hits.set(key, arr); next();
  };
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some(t => now - t < 900000)) hits.delete(k); }, 600000).unref();

// ---- Auth
function setSession(res, user) {
  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '30d' });
  res.cookie('sid', token, { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 30 * 864e5, path: '/' });
}
function attachUser(req, _res, next) {
  const t = req.cookies.sid;
  if (t) {
    try {
      const { id } = jwt.verify(t, SECRET);
      req.user = db.prepare('SELECT id,name,email,role FROM users WHERE id=?').get(id) || null;
    } catch { req.user = null; }
  }
  next();
}
const needUser = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'Fadlan marka hore gal.' });
const needAdmin = (req, res, next) => req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Admin keliya.' });
app.use(attachUser);

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const int = (v, d = 0) => Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : d;
const bad = (res, msg) => res.status(400).json({ error: msg });

app.post('/api/register', limiter(10, 900000), (req, res) => {
  const name = str(req.body.name, 80), email = str(req.body.email, 120).toLowerCase(), pw = req.body.password;
  if (name.length < 2) return bad(res, 'Geli magacaaga.');
  if (!emailRe.test(email)) return bad(res, 'Email-ku sax maaha.');
  if (typeof pw !== 'string' || pw.length < 8) return bad(res, 'Password-ku waa inuu ugu yaraan 8 xaraf ahaadaa.');
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) return bad(res, 'Email-kan hore ayaa loo diiwaangeliyay.');
  const id = db.prepare("INSERT INTO users (name,email,password_hash) VALUES (?,?,?)").run(name, email, bcrypt.hashSync(pw, 12)).lastInsertRowid;
  setSession(res, { id });
  res.json({ user: { id, name, email, role: 'student' } });
});

app.post('/api/login', limiter(10, 900000), (req, res) => {
  const email = str(req.body.email, 120).toLowerCase(), pw = req.body.password;
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  // bcrypt had iyo jeer waa la hubiyaa si aan loo ogaan inuu email-ku jiro
  const ok = bcrypt.compareSync(typeof pw === 'string' ? pw : '', u ? u.password_hash : '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
  if (!u || !ok) return res.status(401).json({ error: 'Email ama password waa khalad.' });
  setSession(res, u);
  res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

app.post('/api/logout', (_req, res) => { res.clearCookie('sid', { path: '/' }); res.json({ ok: true }); });
app.get('/api/me', (req, res) => res.json({ user: req.user || null }));
app.get('/api/config', (_req, res) => res.json({ whatsapp: WHATSAPP, payments: PAYMENTS }));

// ---- Koorsooyin (dadweyne)
const courseCols = 'id,title,blurb,category,price,old_price,modules,lessons_total,code';
app.get('/api/courses', (req, res) => {
  const rows = db.prepare(`SELECT ${courseCols} FROM courses WHERE published=1 ORDER BY sort,id`).all();
  if (req.user) {
    const st = db.prepare(`SELECT course_id, MAX(CASE status WHEN 'approved' THEN 3 WHEN 'pending' THEN 2 ELSE 1 END) s
                           FROM orders WHERE user_id=? GROUP BY course_id`).all(req.user.id);
    const map = Object.fromEntries(st.map(r => [r.course_id, ['', 'rejected', 'pending', 'approved'][r.s]]));
    rows.forEach(r => { r.my_status = req.user.role === 'admin' ? 'approved' : (map[r.id] || null); });
  }
  res.json({ courses: rows });
});

// ---- Codsiyada (ardayga)
app.post('/api/orders', needUser, (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id=? AND published=1').get(int(req.body.course_id));
  if (!course) return bad(res, 'Koorsadan lama helin.');
  const method = str(req.body.method, 30), phone = str(req.body.phone, 20), reference = str(req.body.reference, 60);
  if (!PAYMENTS.some(p => p.name === method)) return bad(res, 'Dooro habka lacag-bixinta.');
  if (!/^[0-9+ ]{6,20}$/.test(phone)) return bad(res, 'Geli lambarka aad lacagta ka dirtay.');
  if (reference.length < 3) return bad(res, 'Geli lambarka muujinta (transaction ID) ama magaca dirayaasha.');
  const dup = db.prepare("SELECT status FROM orders WHERE user_id=? AND course_id=? AND status IN ('pending','approved')").get(req.user.id, course.id);
  if (dup) return bad(res, dup.status === 'approved' ? 'Koorsadan hore ayaad u heshay.' : 'Codsigaaga hore wali waa la eegayaa.');
  const id = db.prepare('INSERT INTO orders (user_id,course_id,method,phone,reference,amount) VALUES (?,?,?,?,?,?)')
    .run(req.user.id, course.id, method, phone, reference, course.price).lastInsertRowid;
  res.json({ order: { id, status: 'pending' } });
});

app.get('/api/my/orders', needUser, (req, res) => {
  res.json({ orders: db.prepare(`SELECT o.id,o.status,o.created_at,o.method,o.amount,c.id course_id,c.title
    FROM orders o JOIN courses c ON c.id=o.course_id WHERE o.user_id=? ORDER BY o.id DESC`).all(req.user.id) });
});

// ---- Barashada (kaliya ardayda bixiyay)
function hasAccess(user, courseId) {
  if (user.role === 'admin') return true;
  return !!db.prepare("SELECT 1 FROM orders WHERE user_id=? AND course_id=? AND status='approved'").get(user.id, courseId);
}
app.get('/api/learn/courses', needUser, (req, res) => {
  const admin = req.user.role === 'admin';
  const rows = db.prepare(`SELECT c.id,c.title,c.blurb,
      (SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) total,
      (SELECT COUNT(*) FROM progress p JOIN lessons l ON l.id=p.lesson_id WHERE p.user_id=? AND l.course_id=c.id) done
    FROM courses c WHERE ${admin ? '1=1' : "c.id IN (SELECT course_id FROM orders WHERE user_id=? AND status='approved')"} ORDER BY c.sort,c.id`)
    .all(...(admin ? [req.user.id] : [req.user.id, req.user.id]));
  res.json({ courses: rows });
});
app.get('/api/learn/:id', needUser, (req, res) => {
  const id = int(req.params.id);
  const course = db.prepare('SELECT id,title,blurb FROM courses WHERE id=?').get(id);
  if (!course) return res.status(404).json({ error: 'Koorsadan lama helin.' });
  if (!hasAccess(req.user, id)) return res.status(403).json({ error: 'Koorsadan wali ma helin.' });
  const lessons = db.prepare(`SELECT l.id,l.module,l.title,l.video_url,
      EXISTS(SELECT 1 FROM progress p WHERE p.lesson_id=l.id AND p.user_id=?) done
    FROM lessons l WHERE l.course_id=? ORDER BY l.position,l.id`).all(req.user.id, id);
  res.json({ course, lessons: lessons.map(l => ({ ...l, done: !!l.done })) });
});
app.post('/api/lessons/:id/done', needUser, (req, res) => {
  const l = db.prepare('SELECT id,course_id FROM lessons WHERE id=?').get(int(req.params.id));
  if (!l || !hasAccess(req.user, l.course_id)) return res.status(403).json({ error: 'Lama oggola.' });
  if (req.body.done) db.prepare('INSERT OR IGNORE INTO progress (user_id,lesson_id) VALUES (?,?)').run(req.user.id, l.id);
  else db.prepare('DELETE FROM progress WHERE user_id=? AND lesson_id=?').run(req.user.id, l.id);
  res.json({ ok: true });
});

// ---- Admin
const admin = express.Router();
admin.use(needUser, needAdmin);

admin.get('/stats', (_req, res) => {
  res.json({
    students: db.prepare("SELECT COUNT(*) n FROM users WHERE role='student'").get().n,
    pending: db.prepare("SELECT COUNT(*) n FROM orders WHERE status='pending'").get().n,
    approved: db.prepare("SELECT COUNT(*) n FROM orders WHERE status='approved'").get().n,
    revenue: db.prepare("SELECT COALESCE(SUM(amount),0) n FROM orders WHERE status='approved'").get().n
  });
});
admin.get('/orders', (req, res) => {
  const st = str(req.query.status, 10);
  const rows = db.prepare(`SELECT o.id,o.status,o.method,o.phone,o.reference,o.amount,o.created_at,
      u.name user_name,u.email user_email,c.title course_title
    FROM orders o JOIN users u ON u.id=o.user_id JOIN courses c ON c.id=o.course_id
    ${st ? 'WHERE o.status=?' : ''} ORDER BY (o.status='pending') DESC, o.id DESC LIMIT 500`).all(...(st ? [st] : []));
  res.json({ orders: rows });
});
admin.post('/orders/:id', (req, res) => {
  const status = req.body.status;
  if (!['approved', 'rejected', 'pending'].includes(status)) return bad(res, 'Xaalad khalad ah.');
  const r = db.prepare("UPDATE orders SET status=?, decided_at=datetime('now') WHERE id=?").run(status, int(req.params.id));
  r.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Lama helin.' });
});
admin.get('/users', (_req, res) => {
  res.json({ users: db.prepare(`SELECT u.id,u.name,u.email,u.role,u.created_at,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id AND o.status='approved') courses
    FROM users u ORDER BY u.id DESC LIMIT 1000`).all() });
});

function courseInput(b) {
  const title = str(b.title, 120);
  if (!title) return { error: 'Geli cinwaanka koorsada.' };
  const category = ['ai', 'eng', 'prod'].includes(b.category) ? b.category : 'eng';
  const price = Number(b.price);
  if (!Number.isFinite(price) || price < 0 || price > 10000) return { error: 'Qiimuhu waa khalad.' };
  const old = b.old_price === '' || b.old_price == null ? null : Number(b.old_price);
  if (old !== null && (!Number.isFinite(old) || old < 0)) return { error: 'Qiimaha hore waa khalad.' };
  return { v: [title, str(b.blurb, 200), category, price, old, int(b.modules), int(b.lessons_total), str(b.code, 400), b.published === false || b.published === 0 ? 0 : 1] };
}
admin.get('/courses', (_req, res) => {
  const cs = db.prepare('SELECT * FROM courses ORDER BY sort,id').all();
  const ls = db.prepare('SELECT * FROM lessons ORDER BY position,id').all();
  cs.forEach(c => { c.lessons = ls.filter(l => l.course_id === c.id); });
  res.json({ courses: cs });
});
admin.post('/courses', (req, res) => {
  const { v, error } = courseInput(req.body); if (error) return bad(res, error);
  const sort = db.prepare('SELECT COALESCE(MAX(sort),0)+1 n FROM courses').get().n;
  const id = db.prepare('INSERT INTO courses (title,blurb,category,price,old_price,modules,lessons_total,code,published,sort) VALUES (?,?,?,?,?,?,?,?,?,?)').run(...v, sort).lastInsertRowid;
  res.json({ id });
});
admin.put('/courses/:id', (req, res) => {
  const { v, error } = courseInput(req.body); if (error) return bad(res, error);
  const r = db.prepare('UPDATE courses SET title=?,blurb=?,category=?,price=?,old_price=?,modules=?,lessons_total=?,code=?,published=? WHERE id=?').run(...v, int(req.params.id));
  r.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Lama helin.' });
});
admin.delete('/courses/:id', (req, res) => {
  const r = db.prepare('DELETE FROM courses WHERE id=?').run(int(req.params.id));
  r.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Lama helin.' });
});

function lessonInput(b) {
  const title = str(b.title, 140);
  if (!title) return { error: 'Geli cinwaanka casharka.' };
  const url = str(b.video_url, 300);
  if (url && !/^https:\/\//i.test(url)) return { error: 'Linkiga muuqaalka waa inuu ku bilaabmaa https://' };
  return { v: [str(b.module, 100) || 'Qaybta 1', title, url, int(b.position)] };
}
admin.post('/courses/:id/lessons', (req, res) => {
  const cid = int(req.params.id);
  if (!db.prepare('SELECT 1 FROM courses WHERE id=?').get(cid)) return res.status(404).json({ error: 'Koorsada lama helin.' });
  const { v, error } = lessonInput(req.body); if (error) return bad(res, error);
  if (!v[3]) v[3] = db.prepare('SELECT COALESCE(MAX(position),0)+1 n FROM lessons WHERE course_id=?').get(cid).n;
  const id = db.prepare('INSERT INTO lessons (course_id,module,title,video_url,position) VALUES (?,?,?,?,?)').run(cid, ...v).lastInsertRowid;
  res.json({ id });
});
admin.put('/lessons/:id', (req, res) => {
  const { v, error } = lessonInput(req.body); if (error) return bad(res, error);
  const r = db.prepare('UPDATE lessons SET module=?,title=?,video_url=?,position=? WHERE id=?').run(...v, int(req.params.id));
  r.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Lama helin.' });
});
admin.delete('/lessons/:id', (req, res) => {
  const r = db.prepare('DELETE FROM lessons WHERE id=?').run(int(req.params.id));
  r.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Lama helin.' });
});
app.use('/api/admin', admin);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Lama helin.' }));

// ---- Faylasha hore (frontend)
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: PROD ? '1h' : 0 }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status === 400 ? 'Xog khalad ah.' : 'Cilad server ayaa dhacday.' });
});

if (require.main === module) app.listen(PORT, () => console.log(`Barasho waa socotaa: http://localhost:${PORT}`));
module.exports = app;

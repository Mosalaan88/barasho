// Database (SQLite) — faylka waxaa lagu keydiyaa data/barasho.db
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dir, { recursive: true });
const db = new Database(path.join(dir, 'barasho.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  blurb TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'eng',
  price REAL NOT NULL DEFAULT 10,
  old_price REAL,
  modules INTEGER NOT NULL DEFAULT 0,
  lessons_total INTEGER NOT NULL DEFAULT 0,
  code TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module TEXT NOT NULL DEFAULT 'Qaybta 1',
  title TEXT NOT NULL,
  video_url TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  phone TEXT NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',      -- pending | approved | rejected
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT
);
CREATE TABLE IF NOT EXISTS progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id, position);
`);

// Koorsooyinka bilowga ah (marka database-ku madhan yahay oo keliya)
if (db.prepare('SELECT COUNT(*) n FROM courses').get().n === 0) {
  const seed = [
    ['HTML & CSS', 'Dhis boggaaga ugu horreeya maanta.', 'eng', 10, null, 6, 35,
     '<h1>Salaan</h1>\nh1 { color: gold; }\n<p>Bogga koowaad</p>'],
    ['JavaScript', 'Ha xifdin. Bilow inaad fekerto.', 'eng', 10, null, 5, 30,
     'const magac = "Maxamed";\nfunction salaan() {\n  alert("Salaan " + magac);\n}'],
    ['React', 'Qaabka ay ku dhisan yihiin codsiyada casriga ah.', 'eng', 10, 15, 6, 48,
     'function Kaar() {\n  return <h2>Koorsada</h2>;\n}'],
    ['Python I: Aasaaska', 'Luuqadda ay moodellada AI ku hadlaan.', 'ai', 10, null, 7, 40,
     'magac = "Faadumo"\nfor i in range(3):\n    print("Salaan", magac)'],
    ['Python II: API', 'Laga bilaabo qoraallo ilaa nidaamyo dhamaystiran.', 'ai', 10, 15, 5, 45,
     'r = requests.get(url)\ndata = r.json()\nprint(data["natiijo"])']
  ];
  const ic = db.prepare('INSERT INTO courses (title,blurb,category,price,old_price,modules,lessons_total,code,sort) VALUES (?,?,?,?,?,?,?,?,?)');
  const il = db.prepare('INSERT INTO lessons (course_id,module,title,video_url,position) VALUES (?,?,?,?,?)');
  db.transaction(() => {
    seed.forEach((c, i) => {
      const id = ic.run(...c, i).lastInsertRowid;
      il.run(id, 'Qaybta 1: Bilow', 'Soo-dhawayn iyo hordhac', '', 1);
      il.run(id, 'Qaybta 1: Bilow', 'Qalabka aan u baahanahay', '', 2);
      il.run(id, 'Qaybta 1: Bilow', 'Casharkaaga koowaad', '', 3);
    });
  })();
}

module.exports = db;

# Barasho — frontend + backend

Goob lagu barto AI iyo koodh Af-Soomaali. Nidaam dhamaystiran:

| Qaybta | Waxa ay qabato |
|---|---|
| **Frontend** (`public/`) | Bogga hore, koorsooyin, login/diiwaangelin, foomka lacag-bixinta, bogga barashada (`/learn`), maamulka (`/admin`) |
| **Backend** (`server.js`, `db.js`) | Akoonno, koorsooyin, codsiyo, ogolaansho, gelitaanka casharrada, horumarka ardayga |
| **Database** | SQLite (`data/barasho.db`) — ma u baahnid server database gooni ah |

## Sida ay u shaqeyso
1. Ardaygu wuxuu sameeyaa akoon oo doortaa koorsada.
2. Wuxuu lacagta ku dirayaa EVC Plus / Zaad / eDahab, kadibna wuxuu geliyaa lambarka muujinta (transaction ID).
3. **Adigu** (admin) waxaad ka aragtaa `/admin` → Codsiyada, waad hubisaa lacagta telefoonkaaga, oo riixdaa **Ogolow**.
4. Koorsada ardayga ayaa ka furmaysa `/learn`. Muuqaallada kaliya ardayda bixisay ayaa arkaya.

## Orod gudaha kombuyuutarkaaga
```bash
npm install
cp .env.example .env     # (Windows: copy .env.example .env) kadibna wax ka beddel
npm start                # http://localhost:3000
npm test                 # 38 imtixaan oo toos ah
```
Marka ugu horreysa, admin-ka waxaa lagu sameeyaa `ADMIN_EMAIL` / `ADMIN_PASSWORD` ee `.env`.
Haddii aadan password dhigin, waxaa la abuuraa mid random ah oo terminal-ka lagu muujiyo hal mar.

## Casharrada (muuqaallada)
`/admin` → Koorsooyin → **Casharro** → ku dar cinwaan iyo link.
Kuwa ugu fudud: **YouTube (Unlisted)** ama **Vimeo**. Linkiga kaliya ardayda ayaa ka arkaya boggaaga, laakiin
"Unlisted" macnaheedu waa qofkii linkiga helo wuu daawan karaa. Haddii aad rabto ilaalin xooggan, isticmaal Vimeo
oo "domain-level privacy" ku xidh domain-kaaga.

## Hosting — MUHIIM
Backend-ku waa **Node.js**, sidaas darteed **ma shaqeeyo hosting "shared / cPanel" caadi ah** (kan PHP-ga ee jaban).
Dooro mid kuwan:

**A) VPS (Hetzner, DigitalOcean, Contabo ~ $5/bishii) — ugu fiicnaanta**
```bash
# Ubuntu 24.04, adigoo ku jira server-ka
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs nginx certbot python3-certbot-nginx
# soo rar faylasha (git ama scp) galka /opt/barasho
cd /opt/barasho && npm ci --omit=dev && cp .env.example .env && nano .env
sudo npm i -g pm2 && pm2 start server.js --name barasho && pm2 save && pm2 startup
```
Nginx: `proxy_pass http://127.0.0.1:3000;` (server_name = domain-kaaga), kadibna `sudo certbot --nginx -d domain-kaaga.com` si aad HTTPS u hesho.

**B) Railway / Render / Fly.io (Docker)** — isticmaal `Dockerfile`. Waa **qasab** inaad ku xidho *disk joogto ah (volume)* `/data`,
haddii kale database-ku wuu tirmayaa mar kasta oo la cusboonaysiiyo.

**Domain:** iibso domain (Namecheap, Porkbun…), kadibna DNS ku dhig `A record` oo tilmaamaya IP-ga server-kaaga.

## Kaydka (backup)
Hal fayl ayaa dhan: `data/barasho.db`. Koobiyee maalin kasta (`cp data/barasho.db backup-$(date +%F).db`).

## Amniga — waxa hore loo sameeyay
Password-ka waa la hash-gareeyaa (bcrypt) · session cookie `httpOnly` · ilaalin CSRF (hubinta Origin) · xaddid isku-dayga login ·
CSP headers (helmet) · SQL oo dhan prepared statements · gelitaanka muuqaallada server-ka ayaa hubiya ·
xogta isticmaalaha waa la-escape-gareeyaa (XSS) · linkiyada muuqaalka waa inay `https://` ahaadaan.

## Waxa aan weli ku jirin (ikhtiyaari, mustaqbalka)
- Lacag-bixin toos ah (API-ga EVC/Zaad/Stripe) — hadda gacanta ayaa loo hubiyaa.
- Dib-u-dejinta password-ka iyo xaqiijinta email-ka (waxay u baahan yihiin adeeg email).
- Shahaadooyin (certificates) iyo faylal la soo dejiyo.

## Isbeddelka magaca
Raadi "Barasho" faylasha `public/*.html`, `public/common.js`, `public/style.css`, `package.json` oo magacaaga ku beddel.

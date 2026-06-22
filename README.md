# Monitoring Alarm IoT

Aplikasi web monitoring sensor IoT (Beam, PIR, Ultrasonik, DHT11) dan buzzer secara realtime,
dengan autentikasi JWT, role-based access, MQTT broker, PostgreSQL, dan export laporan.

## Tech Stack

- **Frontend**: HTML5, Bootstrap 4, Vanilla JS, Chart.js, Socket.IO client
- **Backend**: Node.js, Express.js
- **Realtime**: MQTT.js (subscriber) + Socket.IO (broadcast ke browser)
- **Broker**: EMQX (via Docker) — bisa diganti Mosquitto
- **Database**: PostgreSQL
- **Auth**: JWT + bcrypt, role: admin / operator / viewer
- **Deployment**: Docker + docker-compose

## Struktur Project

```
project/
├── backend/            # Express API + MQTT subscriber + Socket.IO
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── mqtt/
│   ├── config/
│   ├── server.js
│   ├── Dockerfile
│   └── package.json
├── frontend/            # Dashboard, login, settings, reports
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── index.html
├── database/
│   ├── schema.sql
│   └── seed.sql
├── docker-compose.yml
├── .env.example
└── README.md
```

## Menjalankan dengan Docker (Direkomendasikan)

1. Salin file environment:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env`, minimal ubah `JWT_SECRET` dan `DB_PASSWORD`.
3. Jalankan:
   ```bash
   docker compose up -d --build
   ```
4. Akses:
   - Dashboard: http://localhost:3000
   - EMQX Dashboard (monitor broker): http://localhost:18083 (login: `admin` / `public`)
5. Login dengan akun default (lihat bagian **Akun Default** di bawah).

Database akan otomatis di-migrate (schema + seed) saat backend pertama kali start.

## Menjalankan secara Lokal (tanpa Docker)

Prasyarat: Node.js 18+, PostgreSQL terinstall lokal, MQTT broker (Mosquitto/EMQX) terinstall lokal.

```bash
# 1. Install dependency backend
cd backend
npm install

# 2. Siapkan .env
cp .env.example ../.env   # lalu edit DB_HOST=localhost, MQTT_HOST=localhost, dst.

# 3. Buat database PostgreSQL
createdb iot_monitoring

# 4. Jalankan server (otomatis migrate schema + seed saat start)
npm start
# atau mode dev dengan auto-reload:
npm run dev
```

Frontend otomatis di-serve oleh backend Express dari folder `frontend/` (tidak perlu server terpisah).

## Akun Default (dari seed.sql)

| Username | Password    | Role     |
|----------|-------------|----------|
| admin    | Admin123!   | admin    |
| operator | Admin123!   | operator |
| viewer   | Admin123!   | viewer   |

**Penting**: ganti password default ini setelah deployment via halaman Settings atau endpoint API.

## Hak Akses per Role

| Fitur                          | Admin | Operator | Viewer |
|---------------------------------|:-----:|:--------:|:------:|
| Lihat dashboard & history        | ✅    | ✅       | ✅     |
| Export reports                   | ✅    | ✅       | ✅     |
| Kontrol buzzer manual             | ✅    | ✅       | ❌     |
| Buat alert manual                 | ✅    | ✅       | ❌     |
| Ubah settings (MQTT, threshold)   | ✅    | ❌       | ❌     |
| Kelola user                       | ✅    | ❌       | ❌     |

## MQTT Topics & Payload

ESP32 (atau simulator) publish ke topic berikut (host & port broker dikonfigurasi di `.env` / Settings page):

| Topic              | Payload Contoh                                                                 |
|---------------------|---------------------------------------------------------------------------------|
| `iot/beam`          | `{"device_id":"esp32_01","value":1,"timestamp":"2026-06-21T10:00:00Z"}`        |
| `iot/pir`           | `{"device_id":"esp32_01","value":0,"timestamp":"2026-06-21T10:00:00Z"}`        |
| `iot/ultrasonic`    | `{"device_id":"esp32_01","value":35,"timestamp":"2026-06-21T10:00:00Z"}`       |
| `iot/dht11`         | `{"device_id":"esp32_01","temperature":29.5,"humidity":70}`                    |
| `iot/buzzer`        | `{"status":"ON","sensor_trigger":"beam","device_id":"esp32_01","duration_ms":4200}` |
| `iot/status/<id>`   | `online` atau `offline` (retained, gunakan Last Will pada ESP32)               |

Backend subscribe ke semua topic ini, menyimpan data ke PostgreSQL, mengevaluasi alert
(suhu > threshold, jarak < threshold, beam terputus, gerakan PIR), lalu broadcast ke
dashboard secara realtime via Socket.IO.

Backend juga mem-publish command buzzer manual ke topic `iot/buzzer/cmd` saat operator/admin
menekan tombol Aktifkan/Matikan di dashboard — ESP32 perlu subscribe ke topic ini untuk
menerima perintah tersebut.

## REST API Singkat

```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/register        (admin only)
GET    /api/auth/profile

GET    /api/sensors/latest
GET    /api/sensors/history?type=dht11&range=24h&limit=100
GET    /api/sensors/statistics

GET    /api/alerts
POST   /api/alerts               (admin/operator)
PUT    /api/alerts/:id/read

GET    /api/buzzer/logs
POST   /api/buzzer/control       (admin/operator)

GET    /api/users                (admin only)
POST   /api/users                (admin only)
PUT    /api/users/:id            (admin only)
DELETE /api/users/:id            (admin only)

GET    /api/settings
PUT    /api/settings             (admin only)

GET    /api/reports/export?type=dht11&range=7d&format=csv|excel|pdf
```

Semua endpoint (kecuali `/api/auth/login`) memerlukan header `Authorization: Bearer <token>`.

## Keamanan yang Diterapkan

- JWT authentication dengan middleware verifikasi token di setiap request terproteksi
- Password di-hash dengan bcrypt (10 rounds)
- Helmet untuk HTTP security headers
- CORS dikonfigurasi
- Rate limiting (umum: 100 req/15menit, login: 10 req/15menit untuk mencegah brute-force)
- Input validation dengan express-validator di semua endpoint yang menerima body
- Role-based access control (admin/operator/viewer) di level route

## Catatan Simulasi / Testing Tanpa Hardware ESP32

Jika belum punya perangkat ESP32 fisik, gunakan MQTT client (mis. `mosquitto_pub`, MQTT Explorer,
atau script Node.js sederhana) untuk publish payload dummy ke topic di atas — dashboard akan
langsung menampilkan data tersebut secara realtime begitu diterima broker.

Contoh dengan `mosquitto_pub`:
```bash
mosquitto_pub -h localhost -t iot/dht11 -m '{"device_id":"esp32_01","temperature":31.5,"humidity":75}'
mosquitto_pub -h localhost -t iot/beam  -m '{"device_id":"esp32_01","value":1}'
```

# IoT Simulator

Script Node.js sederhana untuk mensimulasikan ESP32 yang mengirim data sensor
ke MQTT broker, supaya dashboard bisa diuji secara realtime tanpa hardware fisik.

## Cara pakai

```bash
cd simulator
npm install
MQTT_HOST=localhost MQTT_PORT=1883 npm start
```

Jika menjalankan stack via `docker compose up`, broker EMQX sudah expose port 1883
ke host, jadi cukup jalankan `npm start` tanpa env var tambahan (default localhost:1883).

Script ini akan:
- Publish status `online` (retained) ke `iot/status/esp32_01`
- Publish data Beam, PIR, Ultrasonik tiap 6-8 detik
- Publish data DHT11 tiap 5 detik
- Otomatis trigger buzzer log saat beam terputus, PIR aktif, atau jarak ultrasonik < 20cm
- Subscribe ke `iot/buzzer/cmd` untuk menerima perintah manual dari dashboard (Aktifkan/Matikan)
- Publish status `offline` saat dihentikan (Ctrl+C)

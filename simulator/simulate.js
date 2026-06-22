/**
 * simulate.js — Dummy ESP32 publisher.
 * Mensimulasikan data sensor Beam, PIR, Ultrasonik, DHT11, dan Buzzer
 * dipublish ke MQTT broker, supaya dashboard bisa diuji tanpa hardware fisik.
 *
 * Jalankan: node simulate.js
 * (pastikan broker MQTT sudah jalan, sesuaikan MQTT_HOST/PORT jika perlu)
 */
const mqtt = require('mqtt');

const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = process.env.MQTT_PORT || '1883';
const DEVICE_ID = process.env.DEVICE_ID || 'esp32_01';

const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  clientId: `simulator_${DEVICE_ID}`,
  will: { topic: `iot/status/${DEVICE_ID}`, payload: 'offline', qos: 1, retain: true },
});

function randomBetween(min, max) {
  return +(Math.random() * (max - min) + min).toFixed(1);
}

let beamState = 0;
let pirState = 0;

client.on('connect', () => {
  console.log(`[Simulator] Connected to mqtt://${MQTT_HOST}:${MQTT_PORT} as ${DEVICE_ID}`);
  client.publish(`iot/status/${DEVICE_ID}`, 'online', { qos: 1, retain: true });

  // Beam sensor: random terputus tiap beberapa interval
  setInterval(() => {
    beamState = Math.random() < 0.15 ? 1 : 0;
    client.publish('iot/beam', JSON.stringify({ device_id: DEVICE_ID, value: beamState, timestamp: new Date().toISOString() }));
    if (beamState === 1) publishBuzzer('beam', 'Beam terputus - intrusi terdeteksi', randomBetween(1500, 5000));
  }, 8000);

  // PIR sensor
  setInterval(() => {
    pirState = Math.random() < 0.25 ? 1 : 0;
    client.publish('iot/pir', JSON.stringify({ device_id: DEVICE_ID, value: pirState, timestamp: new Date().toISOString() }));
    if (pirState === 1) publishBuzzer('pir', 'Gerakan terdeteksi PIR', randomBetween(1000, 3000));
  }, 6000);

  // Ultrasonik
  setInterval(() => {
    const dist = randomBetween(10, 150);
    client.publish('iot/ultrasonic', JSON.stringify({ device_id: DEVICE_ID, value: dist, timestamp: new Date().toISOString() }));
    if (dist < 20) publishBuzzer('ultrasonic', `Objek sangat dekat: ${dist}cm`, randomBetween(1000, 2500));
  }, 7000);

  // DHT11
  setInterval(() => {
    const temp = randomBetween(26, 42);
    const hum = randomBetween(55, 90);
    client.publish('iot/dht11', JSON.stringify({ device_id: DEVICE_ID, temperature: temp, humidity: hum, timestamp: new Date().toISOString() }));
  }, 5000);

  console.log('[Simulator] Publishing dummy sensor data every 5-8 seconds. Press Ctrl+C to stop.');
});

function publishBuzzer(trigger, message, durationMs) {
  client.publish('iot/buzzer', JSON.stringify({
    status: 'ON', sensor_trigger: trigger, message, device_id: DEVICE_ID,
    duration_ms: Math.round(durationMs), timestamp: new Date().toISOString(),
  }));
}

// Listen for manual buzzer commands sent from the dashboard
client.on('connect', () => {
  client.subscribe('iot/buzzer/cmd', (err) => {
    if (!err) console.log('[Simulator] Subscribed to iot/buzzer/cmd (manual control)');
  });
});

client.on('message', (topic, payload) => {
  if (topic === 'iot/buzzer/cmd') {
    console.log('[Simulator] Received manual buzzer command:', payload.toString());
  }
});

client.on('error', (err) => console.error('[Simulator] MQTT error:', err.message));

process.on('SIGINT', () => {
  console.log('\n[Simulator] Shutting down, publishing offline status...');
  client.publish(`iot/status/${DEVICE_ID}`, 'offline', { qos: 1, retain: true }, () => {
    client.end();
    process.exit(0);
  });
});

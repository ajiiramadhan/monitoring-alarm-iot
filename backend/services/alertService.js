const { query } = require('../config/database');
const config    = require('../config');

async function evaluateAndAlert(io, sensorType, payload) {
  let message = null; let severity = 'warning';
  if (sensorType === 'dht11') {
    const temp = parseFloat(payload.temperature);
    if (!isNaN(temp) && temp > config.alert.tempMax) { message = `Suhu ${temp}°C melebihi batas ${config.alert.tempMax}°C!`; severity = 'critical'; }
  } else if (sensorType === 'ultrasonic') {
    const dist = parseFloat(payload.value);
    if (!isNaN(dist) && dist < config.alert.distMin) { message = `Objek terdeteksi pada jarak ${dist}cm (batas ${config.alert.distMin}cm)`; severity = 'high'; }
  } else if (sensorType === 'beam' && Number(payload.value) === 1) {
    message = 'Beam Sensor terputus - intrusi terdeteksi!'; severity = 'critical';
  } else if (sensorType === 'pir' && Number(payload.value) === 1) {
    message = 'Gerakan terdeteksi oleh PIR Sensor'; severity = 'warning';
  }
  if (!message) return null;
  const r = await query(`INSERT INTO alerts (sensor_type,message,severity) VALUES($1,$2,$3) RETURNING *`, [sensorType, message, severity]);
  if (io) io.emit('alert:new', r.rows[0]);
  return r.rows[0];
}

module.exports = { evaluateAndAlert };

const mqtt   = require('mqtt');
const config = require('../config');
const { query } = require('../config/database');
const { evaluateAndAlert } = require('../services/alertService');

let client = null;

function initMqtt(io) {
  const url = `mqtts://${config.mqtt.host}:${config.mqtt.port}`;
  client = mqtt.connect(url, {
    clientId: config.mqtt.clientId,
    username: config.mqtt.username,
    password: config.mqtt.password,
    reconnectPeriod: 5000,
    will: { topic: 'iot/status/backend', payload: 'offline', qos: 1, retain: true },
  });

  client.on('connect', () => {
    console.log(`[MQTT] Connected to ${url}`);
    Object.values(config.mqtt.topics).forEach(t => {
      client.subscribe(t, { qos: 1 }, (err) => {
        if (!err) console.log(`[MQTT] Subscribed: ${t}`);
        else console.error(`[MQTT] Subscribe error ${t}:`, err.message);
      });
    });
    client.publish('iot/status/backend', 'online', { qos: 1, retain: true });
  });

  client.on('reconnect', () => console.log('[MQTT] Reconnecting...'));
  client.on('error',     (err) => console.error('[MQTT] Error:', err.message));

  client.on('message', async (topic, buf) => {
    let payload;
    try { payload = JSON.parse(buf.toString()); } catch { return; }
    try {
      if      (topic === config.mqtt.topics.beam)       await handleSimple(io, 'beam',       payload, 'state');
      else if (topic === config.mqtt.topics.pir)        await handleSimple(io, 'pir',        payload, 'motion');
      else if (topic === config.mqtt.topics.ultrasonic) await handleSimple(io, 'ultrasonic', payload, 'cm');
      else if (topic === config.mqtt.topics.dht11)      await handleDht11(io, payload);
      else if (topic === config.mqtt.topics.buzzer)     await handleBuzzer(io, payload);
      else if (topic.startsWith('iot/status/'))         await handleDeviceStatus(io, topic, buf);
    } catch (err) { console.error(`[MQTT] Handler error ${topic}:`, err.message); }
  });

  return client;
}

async function touchDevice(deviceId) {
  if (!deviceId || deviceId === 'unknown') return;
  await query(`INSERT INTO devices (device_id,name,status,last_seen) VALUES($1,$1,'online',NOW()) ON CONFLICT (device_id) DO UPDATE SET status='online',last_seen=NOW()`, [deviceId]);
}

async function handleSimple(io, sensorType, payload, unit) {
  const device_id = payload.device_id || 'unknown';
  const r = await query(`INSERT INTO sensor_readings (sensor_type,value,unit,device_id,created_at) VALUES($1,$2,$3,$4,COALESCE($5::timestamptz,NOW())) RETURNING *`, [sensorType, payload.value, unit, device_id, payload.timestamp||null]);
  await touchDevice(device_id);
  io.emit('sensor:update', { type: sensorType, data: r.rows[0] });
  await evaluateAndAlert(io, sensorType, payload);
}

async function handleDht11(io, payload) {
  const { temperature, humidity, device_id='unknown', timestamp } = payload;
  const t = parseFloat(temperature); const h = parseFloat(humidity);
  const hi = +(t + 0.33*(h/100)*6.105*Math.exp((17.27*t)/(t+237.7)) - 0.7).toFixed(1);
  const r = await query(`INSERT INTO dht11_readings (temperature,humidity,heat_index,device_id,created_at) VALUES($1,$2,$3,$4,COALESCE($5::timestamptz,NOW())) RETURNING *`, [t, h, hi, device_id, timestamp||null]);
  await touchDevice(device_id);
  io.emit('dht11:update', r.rows[0]);
  await evaluateAndAlert(io, 'dht11', payload);
}

async function handleBuzzer(io, payload) {
  const { status, sensor_trigger, message, device_id, duration_ms, timestamp } = payload;
  const r = await query(`INSERT INTO buzzer_logs (status,sensor_trigger,message,device_id,duration_ms,created_at) VALUES($1,$2,$3,$4,$5,COALESCE($6::timestamptz,NOW())) RETURNING *`, [status, sensor_trigger||null, message||null, device_id||null, duration_ms||null, timestamp||null]);
  await touchDevice(device_id);
  io.emit('buzzer:update', r.rows[0]);
}

async function handleDeviceStatus(io, topic, buf) {
  const deviceId = topic.split('/').pop();
  const status = buf.toString() === 'online' ? 'online' : 'offline';
   console.log(`[Device] ${deviceId} → ${status}`); //
  await query(`INSERT INTO devices (device_id,name,status,last_seen) VALUES($1,$1,$2,NOW()) ON CONFLICT (device_id) DO UPDATE SET status=$2,last_seen=NOW()`, [deviceId, status]);
  io.emit('device:status', { device_id: deviceId, status, last_seen: new Date().toISOString() });
}

function publish(topic, payload) {
  if (!client || !client.connected) return false;
  client.publish(topic, JSON.stringify(payload), { qos: 1 });
  return true;
}

function getClient() { return client; }

module.exports = { initMqtt, publish, getClient };
// Cek setiap 1 menit, device offline kalau last_seen > 2 menit
setInterval(async () => {
  await query(`
    UPDATE devices 
    SET status = 'offline' 
    WHERE status = 'online' 
    AND last_seen < NOW() - INTERVAL '2 minutes'
  `);
  console.log('[Device] Auto-offline check ran');
}, 60000); // setiap 60 detik

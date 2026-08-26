INSERT INTO users (username, email, password_hash, role) VALUES
  ('admin',    'admin@iot.local',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
  ('operator', 'operator@iot.local', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'operator'),
  ('viewer',   'viewer@iot.local',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'viewer')
ON CONFLICT (username) DO NOTHING;

INSERT INTO devices (device_id, name, status) VALUES ('esp32_01', 'ESP32 Main Unit', 'offline')
ON CONFLICT (device_id) DO NOTHING;

INSERT INTO settings (key, value, description) VALUES
  ('mqtt_host',        'localhost',      'MQTT Broker host'),
  ('mqtt_port',        '1883',           'MQTT Broker port'),
  ('mqtt_ws_port',     '8083',           'MQTT WebSocket port'),
  ('alert_temp_max',   '40',             'Max temperature (C)'),
  ('alert_dist_min',   '20',             'Min ultrasonic distance (cm)'),
  ('refresh_rate',     '5000',           'Dashboard refresh ms'),
  ('topic_beam',       'iot/beam',       'Topic beam sensor'),
  ('topic_pir',        'iot/pir',        'Topic PIR sensor'),
  ('topic_ultrasonic', 'iot/ultrasonic', 'Topic ultrasonik'),
  ('topic_dht11',      'iot/dht11',      'Topic DHT11'),
  ('topic_buzzer',     'iot/buzzer',     'Topic buzzer')
ON CONFLICT (key) DO NOTHING;

INSERT INTO dht11_readings (temperature, humidity, heat_index, device_id, created_at) VALUES
  (29.5, 72, 30.1, 'esp32_01', NOW() - INTERVAL '30 minutes'),
  (30.2, 74, 31.0, 'esp32_01', NOW() - INTERVAL '20 minutes'),
  (31.0, 76, 32.3, 'esp32_01', NOW() - INTERVAL '10 minutes'),
  (32.0, 78, 33.4, 'esp32_01', NOW());

INSERT INTO sensor_readings (sensor_type, value, unit, device_id, created_at) VALUES
  ('beam',       1,   'state',  'esp32_01', NOW() - INTERVAL '1 hour'),
  ('pir',        0,   'motion', 'esp32_01', NOW() - INTERVAL '30 minutes'),
  ('ultrasonic', 115, 'cm',     'esp32_01', NOW() - INTERVAL '5 minutes');

INSERT INTO alerts (sensor_type, message, severity, created_at) VALUES
  ('beam',  'Beam Sensor terputus - intrusi terdeteksi!', 'critical', NOW() - INTERVAL '1 hour'),
  ('dht11', 'Suhu mencapai 41C - melebihi batas!',        'critical', NOW() - INTERVAL '10 minutes');

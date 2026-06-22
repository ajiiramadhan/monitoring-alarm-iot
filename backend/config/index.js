require('dotenv').config();
module.exports = {
  env:  process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  frontendUrl: process.env.FRONTEND_URL || '*',
  jwt: {
    secret:    process.env.JWT_SECRET || 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  mqtt: {
    host:     process.env.MQTT_HOST || 'localhost',
    port:     parseInt(process.env.MQTT_PORT    || '1883'),
    wsPort:   parseInt(process.env.MQTT_WS_PORT || '8083'),
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    clientId: process.env.MQTT_CLIENT_ID || 'iot_backend',
    topics: {
      beam:       process.env.MQTT_TOPIC_BEAM       || 'iot/beam',
      pir:        process.env.MQTT_TOPIC_PIR        || 'iot/pir',
      ultrasonic: process.env.MQTT_TOPIC_ULTRASONIC || 'iot/ultrasonic',
      dht11:      process.env.MQTT_TOPIC_DHT11      || 'iot/dht11',
      buzzer:     process.env.MQTT_TOPIC_BUZZER     || 'iot/buzzer',
      status:     process.env.MQTT_TOPIC_STATUS     || 'iot/status/+',
    },
  },
  alert: {
    tempMax: parseFloat(process.env.ALERT_TEMP_MAX || '40'),
    distMin: parseFloat(process.env.ALERT_DIST_MIN || '20'),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max:      parseInt(process.env.RATE_LIMIT_MAX       || '100'),
  },
};

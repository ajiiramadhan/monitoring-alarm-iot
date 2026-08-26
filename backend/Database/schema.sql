CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','operator','viewer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    status VARCHAR(10) NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline')),
    last_seen TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS sensor_readings (
    id SERIAL PRIMARY KEY,
    sensor_type VARCHAR(30) NOT NULL,
    value NUMERIC NOT NULL,
    unit VARCHAR(10),
    device_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS dht11_readings (
    id SERIAL PRIMARY KEY,
    temperature NUMERIC NOT NULL,
    humidity NUMERIC NOT NULL,
    heat_index NUMERIC,
    device_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS buzzer_logs (
    id SERIAL PRIMARY KEY,
    status VARCHAR(10) NOT NULL,
    sensor_trigger VARCHAR(30),
    message TEXT,
    device_id VARCHAR(50),
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    sensor_type VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','high','critical')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sr_type_time ON sensor_readings (sensor_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dht_time    ON dht11_readings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bz_time     ON buzzer_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_al_time     ON alerts (created_at DESC);

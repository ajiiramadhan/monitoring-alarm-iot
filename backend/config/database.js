const { Pool } = require('pg');
const fs   = require('fs');
const path = require('path');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME     || 'iot_monitoring',
      user:     process.env.DB_USER     || 'iot_user',
      password: process.env.DB_PASSWORD || 'iot_secret_password',
      max: 10,
      idleTimeoutMillis:      30000,
      connectionTimeoutMillis: 2000,
    });

pool.on('error', (err) => console.error('[DB] Pool error:', err));

async function query(text, params) {
  return pool.query(text, params);
}

async function migrate() {
  const base = path.join(__dirname, '../../database');
  const schema = path.join(base, 'schema.sql');
  const seed   = path.join(base, 'seed.sql');
  if (fs.existsSync(schema)) { await pool.query(fs.readFileSync(schema, 'utf8')); console.log('[DB] Schema OK'); }
  if (fs.existsSync(seed))   { await pool.query(fs.readFileSync(seed,   'utf8')); console.log('[DB] Seed OK');   }
}

module.exports = { pool, query, migrate };
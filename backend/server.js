require('dotenv').config();
const path        = require('path');
const express     = require('express');
const http        = require('http');
const helmet      = require('helmet');
const cors        = require('cors');
const compression = require('compression');
const { Server }  = require('socket.io');

const config    = require('./config');
const { migrate } = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { initMqtt } = require('./mqtt/mqttClient');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[Socket.IO] Disconnected: ${socket.id}`));
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

app.use('/api/auth',     require('./routes/auth.routes'));
app.use('/api/sensors',  require('./routes/sensors.routes'));
app.use('/api/alerts',   require('./routes/alerts.routes'));
app.use('/api/users',    require('./routes/users.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/reports',  require('./routes/reports.routes'));
app.use('/api/buzzer',   require('./routes/buzzer.routes'));
app.get('/api/health',   (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));
app.get('/login',    (req, res) => res.sendFile(path.join(frontendDir, 'pages/login.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(frontendDir, 'pages/settings.html')));
app.get('/reports',  (req, res) => res.sendFile(path.join(frontendDir, 'pages/reports.html')));
app.get('/',         (req, res) => res.sendFile(path.join(frontendDir, 'index.html')));

app.use(notFound);
app.use(errorHandler);

async function start() {
  try { await migrate(); } catch (err) { console.warn('[Startup] Migration skipped:', err.message); }
  initMqtt(io);
  server.listen(config.port, () => {
    console.log(`[Server] Running on port ${config.port} (${config.env})`);
  });
}
start();

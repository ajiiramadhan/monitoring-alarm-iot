function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} tidak ditemukan` });
}
function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
}
module.exports = { notFound, errorHandler };

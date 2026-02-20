require('dotenv').config({ override: true });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const eventRoutes = require('./routes/event.routes');
const hallRoutes = require('./routes/hall.routes');
const conflictRoutes = require('./routes/conflict.routes');
const rsvpRoutes = require('./routes/rsvp.routes');
const inviteRoutes = require('./routes/invite.routes');
const adminRoutes = require('./routes/admin.routes');
const auditRoutes = require('./routes/audit.routes');



const app = express();

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting on auth routes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests. Please try again later.' },
});

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api/rsvp', rsvpRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/audit', auditRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 CampusFlow Server running on http://localhost:${PORT}`);
});

module.exports = app;
